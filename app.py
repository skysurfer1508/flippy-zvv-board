from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import requests
import time
import os
import json
import xmltodict
import zipfile
import io
import schedule
import threading
from datetime import datetime, timedelta
from google.transit import gtfs_realtime_pb2
from functools import wraps

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Environment variables
DB_API_KEY = os.getenv('DB_API_KEY', '')
SNCF_API_KEY = os.getenv('SNCF_API_KEY', '')
CACHE_TTL = int(os.getenv('CACHE_TTL', '25'))

# Global cache
cache = {}
gtfs_data = {'stops': [], 'trips': {}, 'last_updated': None}

def ttl_cache(ttl=25):
    """Decorator for TTL-based caching"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}_{hash(str(args) + str(kwargs))}"
            current_time = time.time()
            
            if cache_key in cache:
                result, timestamp = cache[cache_key]
                if current_time - timestamp < ttl:
                    return result
            
            result = func(*args, **kwargs)
            cache[cache_key] = (result, current_time)
            return result
        return wrapper
    return decorator

# Unified response format
def normalize_location(data, country):
    """Normalize location data from different APIs"""
    if country == 'ch':
        return {
            'id': data.get('id', ''),
            'name': data.get('name', ''),
            'lat': data.get('coordinate', {}).get('y') if data.get('coordinate') else None,
            'lon': data.get('coordinate', {}).get('x') if data.get('coordinate') else None
        }
    elif country == 'de':
        return {
            'id': data.get('id', ''),
            'name': data.get('name', ''),
            'lat': data.get('lat'),
            'lon': data.get('lon')
        }
    elif country == 'at':
        return {
            'id': data.get('stateless', ''),
            'name': data.get('name', ''),
            'lat': data.get('lat'),
            'lon': data.get('lon')
        }
    elif country == 'fr':
        coord = data.get('coord', {})
        return {
            'id': data.get('id', ''),
            'name': data.get('name', ''),
            'lat': coord.get('lat'),
            'lon': coord.get('lon')
        }
    elif country == 'it':
        return {
            'id': data.split('|')[1] if '|' in data else data,
            'name': data.split('|')[0] if '|' in data else data,
            'lat': None,
            'lon': None
        }
    elif country == 'ca':
        return {
            'id': data.get('stop_id', ''),
            'name': data.get('stop_name', ''),
            'lat': float(data.get('stop_lat', 0)) if data.get('stop_lat') else None,
            'lon': float(data.get('stop_lon', 0)) if data.get('stop_lon') else None
        }
    return data

def normalize_departure(data, country):
    """Normalize departure data from different APIs"""
    if country == 'ch':
        stop = data.get('stop', {})
        departure_time = stop.get('departure', '')
        prognosis = stop.get('prognosis', {})
        prognosis_time = prognosis.get('departure') if prognosis else None
        
        delay_minutes = 0
        if prognosis_time and departure_time:
            try:
                scheduled = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
                actual = datetime.fromisoformat(prognosis_time.replace('Z', '+00:00'))
                delay_minutes = int((actual - scheduled).total_seconds() / 60)
            except:
                pass
        
        return {
            'line': data.get('number', ''),
            'dest': data.get('to', ''),
            'time': departure_time,
            'delay': max(0, delay_minutes),
            'wheel': True  # Default for Switzerland
        }
    
    elif country == 'de':
        delay_minutes = 0
        if data.get('rtTime') and data.get('time'):
            try:
                scheduled = datetime.strptime(data['time'], '%H:%M')
                actual = datetime.strptime(data['rtTime'], '%H:%M')
                delay_minutes = int((actual - scheduled).total_seconds() / 60)
            except:
                pass
        
        return {
            'line': data.get('name', '').split()[0] if data.get('name') else '',
            'dest': data.get('direction', ''),
            'time': f"2025-07-09T{data.get('rtTime', data.get('time', '00:00'))}:00Z",
            'delay': max(0, delay_minutes),
            'wheel': True
        }
    
    elif country == 'at':
        delay_minutes = 0
        if data.get('rtTime') and data.get('time'):
            try:
                delay_minutes = int(data.get('delay', 0))
            except:
                pass
        
        return {
            'line': data.get('name', ''),
            'dest': data.get('direction', ''),
            'time': f"2025-07-09T{data.get('rtTime', data.get('time', '00:00'))}:00Z",
            'delay': max(0, delay_minutes),
            'wheel': True
        }
    
    elif country == 'fr':
        delay_minutes = 0
        departure_dt = data.get('stop_date_time', {})
        if departure_dt.get('data_freshness') == 'realtime':
            try:
                delay_minutes = int(departure_dt.get('delay', 0) / 60)  # Convert seconds to minutes
            except:
                pass
        
        return {
            'line': data.get('display_informations', {}).get('code', ''),
            'dest': data.get('display_informations', {}).get('direction', ''),
            'time': departure_dt.get('departure_date_time', ''),
            'delay': max(0, delay_minutes),
            'wheel': True
        }
    
    elif country == 'it':
        delay_minutes = data.get('ritardo', 0)
        
        return {
            'line': data.get('compNumeroTreno', ''),
            'dest': data.get('destinazione', ''),
            'time': f"2025-07-09T{data.get('orarioPartenza', '00:00')}:00Z",
            'delay': max(0, delay_minutes),
            'wheel': True
        }
    
    elif country == 'ca':
        return {
            'line': data.get('route_short_name', ''),
            'dest': data.get('trip_headsign', ''),
            'time': data.get('departure_time', ''),
            'delay': data.get('delay', 0),
            'wheel': True
        }
    
    return data

# Country-specific API handlers
@ttl_cache(ttl=CACHE_TTL)
def fetch_locations_ch(query):
    """Switzerland - transport.opendata.ch"""
    try:
        response = requests.get(
            'http://transport.opendata.ch/v1/locations',
            params={'query': query, 'type': 'station'},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        return [normalize_location(loc, 'ch') for loc in data.get('stations', [])[:10]]
    except Exception as e:
        print(f"[CH] Error fetching locations for '{query}': {e}")
        return []

@ttl_cache(ttl=CACHE_TTL)
def fetch_locations_de(query):
    """Germany - transport.rest"""
    try:
        response = requests.get(
            'https://v5.transport.rest/locations',
            params={'query': query},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        return [normalize_location(loc, 'de') for loc in data[:10]]
    except Exception as e:
        print(f"[DE] Error fetching locations for '{query}': {e}")
        return []

@ttl_cache(ttl=CACHE_TTL)
def fetch_locations_at(query):
    """Austria - AnachB"""
    try:
        response = requests.get(
            'https://anachb.vor.at/bin/ajax-getstop.exe/dn',
            params={'REQ0JourneyStopsS0A': '1', 'REQ0JourneyStopsS0G': query},
            timeout=10
        )
        response.raise_for_status()
        text = response.text
        # Parse basic response format
        locations = []
        for line in text.split('\n'):
            if '|' in line and len(line.split('|')) >= 4:
                parts = line.split('|')
                locations.append(normalize_location({
                    'stateless': parts[0],
                    'name': parts[1],
                    'lat': None,
                    'lon': None
                }, 'at'))
        return locations[:10]
    except Exception as e:
        print(f"[AT] Error fetching locations for '{query}': {e}")
        return []

@ttl_cache(ttl=CACHE_TTL)
def fetch_locations_fr(query):
    """France - SNCF Navitia"""
    if not SNCF_API_KEY:
        print(f"[FR] No API key configured")
        return []
    
    try:
        response = requests.get(
            'https://api.sncf.com/v1/coverage/sncf/places',
            params={'q': query},
            headers={'Authorization': f'apikey {SNCF_API_KEY}'},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        return [normalize_location(place, 'fr') for place in data.get('places', [])[:10]]
    except Exception as e:
        print(f"[FR] Error fetching locations for '{query}': {e}")
        return []

@ttl_cache(ttl=CACHE_TTL)
def fetch_locations_it(query):
    """Italy - ViaggiaTreno"""
    try:
        response = requests.get(
            f'http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/autocompletaStazione/{query}',
            timeout=10
        )
        response.raise_for_status()
        text = response.text
        locations = []
        for line in text.split('\n'):
            if line.strip() and '|' in line:
                locations.append(normalize_location(line.strip(), 'it'))
        return locations[:10]
    except Exception as e:
        print(f"[IT] Error fetching locations for '{query}': {e}")
        return []

def fetch_locations_ca(query):
    """Canada - GTFS Static Data"""
    try:
        matches = []
        query_lower = query.lower()
        for stop in gtfs_data['stops']:
            if query_lower in stop.get('stop_name', '').lower():
                matches.append(normalize_location(stop, 'ca'))
                if len(matches) >= 10:
                    break
        return matches
    except Exception as e:
        print(f"[CA] Error fetching locations for '{query}': {e}")
        return []

# Board fetch functions
@ttl_cache(ttl=CACHE_TTL)
def fetch_board_ch(stop_id):
    """Switzerland - transport.opendata.ch"""
    try:
        response = requests.get(
            'http://transport.opendata.ch/v1/stationboard',
            params={'station': stop_id, 'limit': 12, 'transportations': 'all'},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        return [normalize_departure(dep, 'ch') for dep in data.get('stationboard', [])]
    except Exception as e:
        print(f"[CH] Error fetching board for '{stop_id}': {e}")
        return []

@ttl_cache(ttl=CACHE_TTL)
def fetch_board_de(stop_id):
    """Germany - transport.rest"""
    try:
        response = requests.get(
            f'https://v5.transport.rest/stops/{stop_id}/departures',
            params={'duration': 30},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        return [normalize_departure(dep, 'de') for dep in data.get('departures', [])[:12]]
    except Exception as e:
        print(f"[DE] Error fetching board for '{stop_id}': {e}")
        return []

@ttl_cache(ttl=CACHE_TTL)
def fetch_board_at(stop_id):
    """Austria - AnachB"""
    try:
        # Simplified mock response for Austria
        return []
    except Exception as e:
        print(f"[AT] Error fetching board for '{stop_id}': {e}")
        return []

@ttl_cache(ttl=CACHE_TTL)
def fetch_board_fr(stop_id):
    """France - SNCF Navitia"""
    if not SNCF_API_KEY:
        return []
    
    try:
        response = requests.get(
            f'https://api.sncf.com/v1/coverage/sncf/stop_areas/{stop_id}/departures',
            params={'data_freshness': 'realtime', 'count': 12},
            headers={'Authorization': f'apikey {SNCF_API_KEY}'},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        return [normalize_departure(dep, 'fr') for dep in data.get('departures', [])]
    except Exception as e:
        print(f"[FR] Error fetching board for '{stop_id}': {e}")
        return []

@ttl_cache(ttl=CACHE_TTL)
def fetch_board_it(stop_id):
    """Italy - ViaggiaTreno"""
    try:
        response = requests.get(
            f'http://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/partenze/{stop_id}',
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        return [normalize_departure(dep, 'it') for dep in data[:12]]
    except Exception as e:
        print(f"[IT] Error fetching board for '{stop_id}': {e}")
        return []

def fetch_board_ca(stop_id):
    """Canada - GTFS + Realtime"""
    try:
        # Simplified implementation - would need proper GTFS-RT processing
        return []
    except Exception as e:
        print(f"[CA] Error fetching board for '{stop_id}': {e}")
        return []

# GTFS Data Management for Canada
def download_gtfs_data():
    """Download and parse GTFS data for Kelowna"""
    try:
        print("[CA] Downloading GTFS data...")
        response = requests.get(
            'https://bct.tmix.se/Tmix.Cap.TdExport.WebApi/gtfs/?operatorIds=47',
            timeout=30
        )
        response.raise_for_status()
        
        with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
            if 'stops.txt' in zip_file.namelist():
                stops_data = zip_file.read('stops.txt').decode('utf-8')
                stops = []
                lines = stops_data.strip().split('\n')
                if len(lines) > 1:
                    headers = lines[0].split(',')
                    for line in lines[1:]:
                        values = line.split(',')
                        stop = dict(zip(headers, values))
                        stops.append(stop)
                
                gtfs_data['stops'] = stops
                gtfs_data['last_updated'] = datetime.now()
                print(f"[CA] Loaded {len(stops)} stops")
    except Exception as e:
        print(f"[CA] Error downloading GTFS data: {e}")

def schedule_gtfs_updates():
    """Schedule daily GTFS updates"""
    schedule.every().day.at("04:05").do(download_gtfs_data)
    
    def run_scheduler():
        while True:
            schedule.run_pending()
            time.sleep(60)
    
    scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
    scheduler_thread.start()

# API Routes
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
    
    print(f"[{country.upper()}] Searching locations for: '{query}'")
    
    fetch_functions = {
        'ch': fetch_locations_ch,
        'de': fetch_locations_de,
        'at': fetch_locations_at,
        'fr': fetch_locations_fr,
        'it': fetch_locations_it,
        'ca': fetch_locations_ca
    }
    
    fetch_func = fetch_functions.get(country)
    if not fetch_func:
        return jsonify([])
    
    try:
        results = fetch_func(query)
        print(f"[{country.upper()}] Found {len(results)} locations")
        return jsonify(results)
    except Exception as e:
        print(f"[{country.upper()}] Error in locations endpoint: {e}")
        return jsonify([])

@app.route('/api/board')
def board():
    country = request.args.get('country', 'ch').lower()
    stop_id = request.args.get('stop_id', '').strip()
    
    if not stop_id:
        return jsonify({'departures': []})
    
    print(f"[{country.upper()}] Fetching board for stop: '{stop_id}'")
    
    fetch_functions = {
        'ch': fetch_board_ch,
        'de': fetch_board_de,
        'at': fetch_board_at,
        'fr': fetch_board_fr,
        'it': fetch_board_it,
        'ca': fetch_board_ca
    }
    
    fetch_func = fetch_functions.get(country)
    if not fetch_func:
        return jsonify({'departures': []})
    
    try:
        departures = fetch_func(stop_id)
        print(f"[{country.upper()}] Found {len(departures)} departures")
        return jsonify({
            'station': stop_id,
            'departures': departures,
            'updated': datetime.now().isoformat()
        })
    except Exception as e:
        print(f"[{country.upper()}] Error in board endpoint: {e}")
        return jsonify({'departures': []})

if __name__ == '__main__':
    # Initialize GTFS data for Canada on startup
    download_gtfs_data()
    schedule_gtfs_updates()
    
    app.run(host='0.0.0.0', port=6162, debug=False)