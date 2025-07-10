from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import requests
import time
import os
import zipfile
import csv
import io
import xml.etree.ElementTree as ET
import xmltodict
from datetime import datetime, timezone
from functools import wraps
from google.transit import gtfs_realtime_pb2

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Environment variables
SNCF_API_KEY = os.getenv('SNCF_API_KEY', '')
DB_API_KEY = os.getenv('DB_API_KEY', '')
CACHE_TTL = int(os.getenv('CACHE_TTL', '25'))

# Global cache
cache = {}

# GTFS Static data for Canada
gtfs_stops = {}
gtfs_routes = {}
gtfs_last_update = 0

def safe_cache(ttl=25):
    """Cache decorator that never raises 500 errors"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}_{hash(str(args) + str(kwargs))}"
            current_time = time.time()
            
            # Check cache
            if cache_key in cache:
                cached_time, cached_result = cache[cache_key]
                if current_time - cached_time < ttl:
                    return cached_result
            
            try:
                result = func(*args, **kwargs)
                cache[cache_key] = (current_time, result)
                return result
            except Exception as e:
                print(f"ERROR {func.__name__}: {e}")
                return []
        return wrapper
    return decorator

# ============ SWITZERLAND (CH) ============
@safe_cache(ttl=CACHE_TTL)
def fetch_locations_ch(query):
    """Fetch stations from Swiss transport API"""
    print(f"[LOC] ch '{query}' -> ", end="")
    response = requests.get(
        'http://transport.opendata.ch/v1/locations',
        params={'query': query, 'type': 'station'},
        timeout=10
    )
    response.raise_for_status()
    data = response.json()
    
    stations = []
    for loc in data.get('stations', [])[:10]:
        coord = loc.get('coordinate', {})
        stations.append({
            'id': loc.get('id', ''),
            'name': loc.get('name', ''),
            'lat': coord.get('x', 0.0) if coord else 0.0,
            'lon': coord.get('y', 0.0) if coord else 0.0
        })
    
    print(f"{len(stations)}")
    return stations

@safe_cache(ttl=CACHE_TTL)
def fetch_board_ch(stop_id):
    """Fetch departures from Swiss transport API"""
    print(f"[BOARD] ch '{stop_id}' -> ", end="")
    response = requests.get(
        'http://transport.opendata.ch/v1/stationboard',
        params={'station': stop_id, 'limit': 12, 'transportations': 'all'},
        timeout=10
    )
    response.raise_for_status()
    data = response.json()
    
    departures = []
    for conn in data.get('stationboard', []):
        stop = conn.get('stop', {})
        departure_time = stop.get('departure')
        prognosis = stop.get('prognosis', {})
        prognosis_time = prognosis.get('departure') if prognosis else None
        
        # Calculate delay
        delay = 0
        if prognosis_time and departure_time:
            try:
                scheduled = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
                actual = datetime.fromisoformat(prognosis_time.replace('Z', '+00:00'))
                delay = int((actual - scheduled).total_seconds() / 60)
            except:
                delay = 0
        
        departures.append({
            'line': conn.get('number', ''),
            'dest': conn.get('to', ''),
            'time': departure_time or '',
            'delay': max(0, delay),
            'wheel': False  # Not provided by Swiss API
        })
    
    print(f"{len(departures)}")
    return departures

# ============ GERMANY (DE) ============
@safe_cache(ttl=CACHE_TTL)
def fetch_locations_de(query):
    """Fetch stations from transport.rest API"""
    print(f"[LOC] de '{query}' -> ", end="")
    response = requests.get(
        f'https://v5.transport.rest/locations',
        params={'query': query, 'results': 10},
        timeout=10
    )
    response.raise_for_status()
    data = response.json()
    
    stations = []
    for loc in data[:10]:
        if loc.get('type') == 'stop':
            location = loc.get('location', {})
            stations.append({
                'id': loc.get('id', ''),
                'name': loc.get('name', ''),
                'lat': location.get('latitude', 0.0),
                'lon': location.get('longitude', 0.0)
            })
    
    print(f"{len(stations)}")
    return stations

@safe_cache(ttl=CACHE_TTL)
def fetch_board_de(stop_id):
    """Fetch departures from transport.rest API"""
    print(f"[BOARD] de '{stop_id}' -> ", end="")
    response = requests.get(
        f'https://v5.transport.rest/stops/{stop_id}/departures',
        params={'duration': 30, 'results': 12},
        timeout=10
    )
    response.raise_for_status()
    data = response.json()
    
    departures = []
    for dep in data.get('departures', []):
        when = dep.get('when')
        delay = dep.get('delay', 0) or 0  # delay in seconds
        delay_minutes = delay // 60 if delay else 0
        accessibility = dep.get('line', {}).get('accessibility', {})
        
        departures.append({
            'line': dep.get('line', {}).get('name', ''),
            'dest': dep.get('direction', ''),
            'time': when or '',
            'delay': max(0, delay_minutes),
            'wheel': accessibility.get('wheelchairAccessible', False) if accessibility else False
        })
    
    print(f"{len(departures)}")
    return departures

# ============ AUSTRIA (AT) ============
@safe_cache(ttl=CACHE_TTL)
def fetch_locations_at(query):
    """Fetch stations from AnachB API"""
    print(f"[LOC] at '{query}' -> ", end="")
    response = requests.get(
        'https://anachb.vor.at/AnachB30/XML_STOPFINDER_REQUEST',
        params={'type_sf': 'stop', 'name_sf': query},
        timeout=10
    )
    response.raise_for_status()
    
    # Parse XML
    root = ET.fromstring(response.content)
    stations = []
    
    for point in root.findall('.//Point'):
        ref = point.get('stateless')
        name = point.get('name')
        x = point.get('x')
        y = point.get('y')
        
        if ref and name:
            # Convert coordinates (assuming Austrian Grid to WGS84 approximation)
            lat = float(y) / 100000 if y else 0.0
            lon = float(x) / 100000 if x else 0.0
            
            stations.append({
                'id': ref,
                'name': name,
                'lat': lat,
                'lon': lon
            })
            
            if len(stations) >= 10:
                break
    
    print(f"{len(stations)}")
    return stations

@safe_cache(ttl=CACHE_TTL)  
def fetch_board_at(stop_id):
    """Fetch departures from AnachB API"""
    print(f"[BOARD] at '{stop_id}' -> ", end="")
    response = requests.get(
        'https://anachb.vor.at/AnachB30/XML_DM_REQUEST',
        params={
            'locationServerActive': '1',
            'id': stop_id,
            'itdDateTimeDepArr': 'dep'
        },
        timeout=10
    )
    response.raise_for_status()
    
    # Parse XML
    root = ET.fromstring(response.content)
    departures = []
    
    for dep in root.findall('.//Departure'):
        line = dep.get('name', '')
        direction = dep.get('direction', '')
        
        # Get scheduled time
        time_elem = dep.find('DateTime')
        if time_elem is not None:
            date = time_elem.get('date', '')
            planned_time = time_elem.get('time', '')
            realtime = time_elem.get('rtTime', planned_time)
            
            # Convert to ISO format
            if date and planned_time:
                try:
                    dt_str = f"{date} {planned_time}"
                    dt = datetime.strptime(dt_str, '%Y%m%d %H%M')
                    iso_time = dt.replace(tzinfo=timezone.utc).isoformat()
                    
                    # Calculate delay
                    delay = 0
                    if realtime and realtime != planned_time:
                        rt_dt = datetime.strptime(f"{date} {realtime}", '%Y%m%d %H%M')
                        delay = int((rt_dt - dt).total_seconds() / 60)
                    
                    departures.append({
                        'line': line,
                        'dest': direction,
                        'time': iso_time,
                        'delay': max(0, delay),
                        'wheel': False  # Not provided
                    })
                except:
                    pass
                    
        if len(departures) >= 12:
            break
    
    print(f"{len(departures)}")
    return departures

# ============ FRANCE (FR) ============
@safe_cache(ttl=CACHE_TTL)
def fetch_locations_fr(query):
    """Fetch stations from SNCF API"""
    if not SNCF_API_KEY:
        print(f"[LOC] fr '{query}' -> API key missing")
        return []
        
    print(f"[LOC] fr '{query}' -> ", end="")
    response = requests.get(
        'https://api.sncf.com/v1/coverage/sncf/places',
        params={'q': query},
        headers={'Authorization': f'apikey {SNCF_API_KEY}'},
        timeout=10
    )
    response.raise_for_status()
    data = response.json()
    
    stations = []
    for place in data.get('places', [])[:10]:
        if place.get('embedded_type') == 'stop_area':
            stop_area = place.get('stop_area', {})
            coord = stop_area.get('coord', {})
            
            stations.append({
                'id': stop_area.get('id', ''),
                'name': stop_area.get('name', ''),
                'lat': float(coord.get('lat', 0)) if coord.get('lat') else 0.0,
                'lon': float(coord.get('lon', 0)) if coord.get('lon') else 0.0
            })
    
    print(f"{len(stations)}")
    return stations

@safe_cache(ttl=CACHE_TTL)
def fetch_board_fr(stop_id):
    """Fetch departures from SNCF API"""
    if not SNCF_API_KEY:
        print(f"[BOARD] fr '{stop_id}' -> API key missing")
        return []
        
    print(f"[BOARD] fr '{stop_id}' -> ", end="")
    response = requests.get(
        f'https://api.sncf.com/v1/coverage/sncf/stop_areas/{stop_id}/departures',
        params={'data_freshness': 'realtime', 'count': 12},
        headers={'Authorization': f'apikey {SNCF_API_KEY}'},
        timeout=10
    )
    response.raise_for_status()
    data = response.json()
    
    departures = []
    for dep in data.get('departures', []):
        route = dep.get('route', {})
        stop_datetime = dep.get('stop_date_time', {})
        
        scheduled = stop_datetime.get('base_departure_date_time', '')
        realtime = stop_datetime.get('departure_date_time', scheduled)
        
        # Calculate delay
        delay = 0
        if scheduled and realtime and scheduled != realtime:
            try:
                sched_dt = datetime.strptime(scheduled, '%Y%m%dT%H%M%S')
                real_dt = datetime.strptime(realtime, '%Y%m%dT%H%M%S')
                delay = int((real_dt - sched_dt).total_seconds() / 60)
            except:
                delay = 0
        
        # Convert to ISO format
        iso_time = ''
        if realtime:
            try:
                dt = datetime.strptime(realtime, '%Y%m%dT%H%M%S')
                iso_time = dt.replace(tzinfo=timezone.utc).isoformat()
            except:
                iso_time = realtime
        
        departures.append({
            'line': route.get('name', ''),
            'dest': dep.get('display_informations', {}).get('direction', ''),
            'time': iso_time,
            'delay': max(0, delay),
            'wheel': False  # Not easily available
        })
    
    print(f"{len(departures)}")
    return departures

# ============ ITALY (IT) ============
@safe_cache(ttl=CACHE_TTL)
def fetch_locations_it(query):
    """Fetch stations from ViaggiaTreno API"""
    print(f"[LOC] it '{query}' -> ", end="")
    response = requests.get(
        f'http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/autocompletaStazione/{query}',
        timeout=10
    )
    response.raise_for_status()
    
    stations = []
    lines = response.text.strip().split('\n')
    
    for line in lines[:10]:
        if '|' in line:
            parts = line.split('|')
            if len(parts) >= 2:
                name = parts[0].strip()
                station_id = parts[1].strip()
                
                stations.append({
                    'id': station_id,
                    'name': name,
                    'lat': 0.0,  # Not provided
                    'lon': 0.0   # Not provided
                })
    
    print(f"{len(stations)}")
    return stations

@safe_cache(ttl=CACHE_TTL)
def fetch_board_it(stop_id):
    """Fetch departures from ViaggiaTreno API"""
    print(f"[BOARD] it '{stop_id}' -> ", end="")
    response = requests.get(
        f'http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/partenze/{stop_id}',
        timeout=10
    )
    response.raise_for_status()
    data = response.json()
    
    departures = []
    for dep in data[:12]:
        # Parse departure time
        orario = dep.get('orarioPartenza')
        delay_min = dep.get('ritardo', 0) or 0
        
        iso_time = ''
        if orario:
            try:
                # Convert Unix timestamp to ISO
                dt = datetime.fromtimestamp(orario / 1000, tz=timezone.utc)
                iso_time = dt.isoformat()
            except:
                iso_time = str(orario)
        
        departures.append({
            'line': dep.get('numeroTreno', ''),
            'dest': dep.get('destinazione', ''),
            'time': iso_time,
            'delay': max(0, delay_min),
            'wheel': False  # Not provided
        })
    
    print(f"{len(departures)}")
    return departures

# ============ CANADA (CA) ============
def load_gtfs_static():
    """Load GTFS static data for Kelowna"""
    global gtfs_stops, gtfs_routes, gtfs_last_update
    
    current_time = time.time()
    # Reload once per day (86400 seconds)
    if current_time - gtfs_last_update < 86400:
        return
    
    print("[GTFS] Loading static data...")
    try:
        response = requests.get(
            'https://bct.tmix.se/Tmix.Cap.TdExport.WebApi/gtfs/?operatorIds=47',
            timeout=30
        )
        response.raise_for_status()
        
        # Extract ZIP and parse CSV files
        with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
            # Load stops.txt
            if 'stops.txt' in zip_file.namelist():
                with zip_file.open('stops.txt') as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, 'utf-8'))
                    gtfs_stops = {row['stop_id']: row for row in reader}
            
            # Load routes.txt
            if 'routes.txt' in zip_file.namelist():
                with zip_file.open('routes.txt') as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, 'utf-8'))
                    gtfs_routes = {row['route_id']: row for row in reader}
        
        gtfs_last_update = current_time
        print(f"[GTFS] Loaded {len(gtfs_stops)} stops, {len(gtfs_routes)} routes")
        
    except Exception as e:
        print(f"[GTFS] Error loading static data: {e}")

@safe_cache(ttl=CACHE_TTL)
def fetch_locations_ca(query):
    """Fetch stations from GTFS static data"""
    load_gtfs_static()  # Ensure data is loaded
    
    print(f"[LOC] ca '{query}' -> ", end="")
    
    query_lower = query.lower()
    matches = []
    
    for stop_id, stop in gtfs_stops.items():
        if query_lower in stop.get('stop_name', '').lower():
            matches.append({
                'id': stop_id,
                'name': stop.get('stop_name', ''),
                'lat': float(stop.get('stop_lat', 0)) if stop.get('stop_lat') else 0.0,
                'lon': float(stop.get('stop_lon', 0)) if stop.get('stop_lon') else 0.0
            })
            
            if len(matches) >= 10:
                break
    
    print(f"{len(matches)}")
    return matches

@safe_cache(ttl=CACHE_TTL)
def fetch_board_ca(stop_id):
    """Fetch departures for Kelowna (simplified - would need GTFS-RT integration)"""
    print(f"[BOARD] ca '{stop_id}' -> ", end="")
    
    # This is a simplified implementation
    # Full implementation would parse GTFS-RT TripUpdates and VehiclePositions
    departures = [
        {
            'line': 'Route 1',
            'dest': 'Downtown Transit Centre',
            'time': datetime.now(timezone.utc).isoformat(),
            'delay': 0,
            'wheel': True
        }
    ]
    
    print(f"{len(departures)}")
    return departures

# ============ API ROUTES ============
@app.route('/')
def index():
    return send_file('static/index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_file('static/index.html')

@app.route('/api/locations')
def locations():
    country = request.args.get('country', 'ch').lower()
    query = request.args.get('q', '').strip()
    
    if not query or len(query) < 2:
        return jsonify([])
    
    # Route to appropriate handler
    handlers = {
        'ch': fetch_locations_ch,
        'de': fetch_locations_de, 
        'at': fetch_locations_at,
        'fr': fetch_locations_fr,
        'it': fetch_locations_it,
        'ca': fetch_locations_ca
    }
    
    handler = handlers.get(country, fetch_locations_ch)
    stations = handler(query)
    
    return jsonify(stations)

@app.route('/api/board')
def board():
    country = request.args.get('country', 'ch').lower()
    stop_id = request.args.get('stop_id', '').strip()
    
    if not stop_id:
        return jsonify({'error': 'stop_id parameter required'}), 400
    
    # Route to appropriate handler
    handlers = {
        'ch': fetch_board_ch,
        'de': fetch_board_de,
        'at': fetch_board_at, 
        'fr': fetch_board_fr,
        'it': fetch_board_it,
        'ca': fetch_board_ca
    }
    
    handler = handlers.get(country, fetch_board_ch)
    departures = handler(stop_id)
    
    return jsonify({
        'station': stop_id,
        'departures': departures,
        'updated': datetime.now().isoformat()
    })

if __name__ == '__main__':
    # Load GTFS data on startup for Canada
    load_gtfs_static()
    app.run(host='0.0.0.0', port=6162, debug=False)