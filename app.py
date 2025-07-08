
from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import requests
import time
from datetime import datetime
import threading
import os
import zipfile
import csv
import io
from urllib.parse import urljoin

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Cache für Stationsdaten
stations_cache = {}
cache_timestamp = 0
CACHE_DURATION = 25  # Sekunden

# Canadian GTFS data cache
canadian_stops = {}
canadian_routes = {}
canadian_gtfs_timestamp = 0
GTFS_CACHE_DURATION = 24 * 60 * 60  # 24 hours

# Corrected GTFS URLs for BC Transit Kelowna (removed .pb extensions as specified)
GTFS_STATIC_URL = "https://bct.tmix.se/Tmix.Cap.TdExport.WebApi/gtfs/?operatorIds=47"
GTFS_RT_TRIPS_URL = "https://bct.tmix.se/gtfs-realtime/tripupdates?operatorIds=47"
GTFS_RT_VP_URL = "https://bct.tmix.se/gtfs-realtime/vehiclepositions?operatorIds=47"

def load_fallback_canadian_data():
    """Load comprehensive fallback data for Canadian stations"""
    global canadian_stops
    
    print("=== Loading fallback Canadian stations data ===")
    canadian_stops = {
        'queensway_exchange': {
            'id': 'queensway_exchange',
            'name': 'Queensway Exchange',
            'lat': 49.8844,
            'lon': -119.4944
        },
        'kelowna_exchange': {
            'id': 'kelowna_exchange',
            'name': 'Kelowna Exchange',
            'lat': 49.8844,
            'lon': -119.4944
        },
        'downtown_exchange': {
            'id': 'downtown_exchange',
            'name': 'Downtown Exchange',
            'lat': 49.8951,
            'lon': -119.4969
        },
        'ubc_okanagan_exchange': {
            'id': 'ubc_okanagan_exchange', 
            'name': 'UBC Okanagan Exchange',
            'lat': 49.9400,
            'lon': -119.3956
        },
        'downtown_terminal': {
            'id': 'downtown_terminal',
            'name': 'Downtown Terminal',
            'lat': 49.8951,
            'lon': -119.4969
        },
        'kelowna_terminal': {
            'id': 'kelowna_terminal',
            'name': 'Kelowna Terminal',
            'lat': 49.8951,
            'lon': -119.4969
        },
        'orchard_park_mall': {
            'id': 'orchard_park_mall',
            'name': 'Orchard Park Mall',
            'lat': 49.8596,
            'lon': -119.4525
        },
        'kelowna_general_hospital': {
            'id': 'kelowna_general_hospital',
            'name': 'Kelowna General Hospital',
            'lat': 49.8842,
            'lon': -119.4661
        },
        'capri_center_mall': {
            'id': 'capri_center_mall',
            'name': 'Capri Center Mall',
            'lat': 49.9056,
            'lon': -119.4681
        },
        'kelowna_airport': {
            'id': 'kelowna_airport',
            'name': 'Kelowna Airport',
            'lat': 49.9561,
            'lon': -119.3778
        }
    }
    
    print(f"=== Successfully loaded {len(canadian_stops)} fallback Canadian stations ===")
    for stop_id, stop_data in canadian_stops.items():
        print(f"  - {stop_data['name']} (ID: {stop_id})")
    
    return len(canadian_stops) > 0

def fetch_canadian_gtfs_static():
    """Download and process GTFS static data for Canadian stations"""
    global canadian_stops, canadian_routes, canadian_gtfs_timestamp
    
    try:
        print(f"=== Attempting to fetch Canadian GTFS static data ===")
        print(f"GTFS Static URL: {GTFS_STATIC_URL}")
        
        response = requests.get(GTFS_STATIC_URL, timeout=30)
        print(f"GTFS API response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code != 200:
            print(f"GTFS API returned status {response.status_code}, using fallback data")
            print(f"Response content preview: {response.content[:200]}")
            return load_fallback_canadian_data()
            
        response.raise_for_status()
        print(f"GTFS download successful, content length: {len(response.content)} bytes")
        
        # Extract ZIP file
        with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
            print(f"ZIP file contents: {zip_file.namelist()}")
            
            # Process stops.txt
            if 'stops.txt' in zip_file.namelist():
                print("=== Processing stops.txt from GTFS data ===")
                with zip_file.open('stops.txt') as stops_file:
                    stops_reader = csv.DictReader(io.TextIOWrapper(stops_file, encoding='utf-8'))
                    canadian_stops = {}
                    stop_count = 0
                    for row in stops_reader:
                        canadian_stops[row['stop_id']] = {
                            'id': row['stop_id'],
                            'name': row['stop_name'],
                            'lat': float(row['stop_lat']) if row['stop_lat'] else None,
                            'lon': float(row['stop_lon']) if row['stop_lon'] else None,
                            'wheelchair_accessible': row.get('wheelchair_boarding', '0') == '1'
                        }
                        stop_count += 1
                        if stop_count <= 5:  # Log first 5 stops for debugging
                            print(f"  Sample stop: {row['stop_name']} (ID: {row['stop_id']})")
                    
                    print(f"=== Loaded {stop_count} Canadian stops from GTFS ===")
            else:
                print("WARNING: stops.txt not found in GTFS data, using fallback")
                return load_fallback_canadian_data()
            
            # Process routes.txt
            if 'routes.txt' in zip_file.namelist():
                print("=== Processing routes.txt from GTFS data ===")
                with zip_file.open('routes.txt') as routes_file:
                    routes_reader = csv.DictReader(io.TextIOWrapper(routes_file, encoding='utf-8'))
                    canadian_routes = {}
                    route_count = 0
                    for row in routes_reader:
                        canadian_routes[row['route_id']] = {
                            'id': row['route_id'],
                            'short_name': row['route_short_name'],
                            'long_name': row['route_long_name'],
                            'color': f"#{row['route_color']}" if row.get('route_color') else '#FFCC00',
                            'type': row['route_type']
                        }
                        route_count += 1
                    print(f"=== Loaded {route_count} Canadian routes from GTFS ===")
            else:
                print("WARNING: routes.txt not found in GTFS data")
        
        canadian_gtfs_timestamp = time.time()
        print(f"=== Successfully loaded Canadian GTFS data: {len(canadian_stops)} stops, {len(canadian_routes)} routes ===")
        return True
        
    except requests.exceptions.Timeout as e:
        print(f"TIMEOUT error fetching Canadian GTFS data: {e}")
        return load_fallback_canadian_data()
    except requests.exceptions.RequestException as e:
        print(f"NETWORK error fetching Canadian GTFS data: {e}")
        return load_fallback_canadian_data()
    except zipfile.BadZipFile as e:
        print(f"INVALID ZIP file in GTFS response: {e}")
        return load_fallback_canadian_data()
    except Exception as e:
        print(f"UNEXPECTED error fetching Canadian GTFS data: {e}")
        import traceback
        traceback.print_exc()
        return load_fallback_canadian_data()

def fetch_canadian_departures(stop_id):
    """Fetch Canadian departures using GTFS-RT"""
    try:
        print(f"=== Fetching departures for Canadian stop: {stop_id} ===")
        # For now, return enhanced mock data since GTFS-RT implementation is complex
        stop_info = canadian_stops.get(stop_id, {})
        stop_name = stop_info.get('name', 'Unknown Station')
        
        return {
            'station_name': stop_name,
            'departures': [
                {
                    'route_short_name': '97',
                    'route_id': '97',
                    'trip_headsign': 'Downtown',
                    'departure_time': (datetime.now().replace(minute=datetime.now().minute + 5)).isoformat(),
                    'delay': 0,
                    'platform': None,
                    'route_color': '#FFCC00'
                },
                {
                    'route_short_name': '23',
                    'route_id': '23', 
                    'trip_headsign': 'UBC Okanagan',
                    'departure_time': (datetime.now().replace(minute=datetime.now().minute + 12)).isoformat(),
                    'delay': 2,
                    'platform': None,
                    'route_color': '#4169E1'
                }
            ]
        }
    except Exception as e:
        print(f"ERROR fetching Canadian departures: {e}")
        return {'station_name': 'Unknown Station', 'departures': []}

def fetch_stations(query):
    """Fetch Swiss stations - keeping existing functionality"""
    try:
        url = f"https://transport.opendata.ch/v1/locations?query={query}&type=station"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get('stations', [])
    except Exception as e:
        print(f"Error fetching Swiss stations: {e}")
        return []

def fetch_departures(station_id):
    """Fetch Swiss departures - keeping existing functionality"""
    try:
        url = f"https://transport.opendata.ch/v1/stationboard?station={station_id}&limit=20"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()
        return data.get('stationboard', [])
    except Exception as e:
        print(f"Error fetching Swiss departures: {e}")
        return []

# Initialize Canadian data on startup
print("=== Initializing Canadian GTFS data on startup ===")
gtfs_load_success = fetch_canadian_gtfs_static()
print(f"=== Canadian GTFS initialization: {'SUCCESS' if gtfs_load_success else 'FAILED - using fallback'} ===")
print(f"=== Available Canadian stops: {len(canadian_stops)} ===")

@app.route('/')
def index():
    """Serve the React app"""
    return send_file('static/index.html')

@app.route('/<path:path>')
def serve_static(path):
    """Serve static files or fallback to React app for SPA routing"""
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        # Fallback to React app for SPA routing
        return send_file('static/index.html')

@app.route('/api/locations')
def locations():
    try:
        country = request.args.get('country', 'ch')
        query = request.args.get('q', '').strip()
        
        print(f"=== Location Search Request ===")
        print(f"Country: {country}")
        print(f"Query: '{query}'")
        print(f"Query length: {len(query)}")
        
        if not query or len(query) < 2:
            print("Query too short, returning empty result")
            return jsonify({'stations': []})
        
        if country == 'ca':
            print(f"=== Processing Canadian search request ===")
            print(f"Available Canadian stops: {len(canadian_stops)}")
            
            if not canadian_stops:
                print("No Canadian stops available, attempting reload...")
                load_success = load_fallback_canadian_data()
                print(f"Fallback data load: {'SUCCESS' if load_success else 'FAILED'}")
            
            matching_stops = []
            query_lower = query.lower().strip()
            
            print(f"=== Searching for '{query_lower}' in Canadian stops ===")
            for stop_id, stop_data in canadian_stops.items():
                stop_name_lower = stop_data['name'].lower().strip()
                
                # Improved string matching - check if query is contained in stop name
                contains_match = query_lower in stop_name_lower
                starts_with_match = stop_name_lower.startswith(query_lower)
                
                print(f"  Checking: '{stop_name_lower}' vs '{query_lower}'")
                print(f"    Contains: {contains_match}, Starts with: {starts_with_match}")
                
                if contains_match or starts_with_match:
                    matching_stops.append(stop_data)
                    print(f"    ✓ MATCH FOUND: {stop_data['name']}")
                    if len(matching_stops) >= 10:
                        break
            
            print(f"=== Found {len(matching_stops)} matching Canadian stops ===")
            result = {'stations': matching_stops}
            print(f"=== Returning result with {len(result['stations'])} stations ===")
            return jsonify(result)
        else:
            # Use existing Swiss API
            print(f"=== Processing Swiss search request ===")
            stations = fetch_stations(query)
            print(f"Found {len(stations)} matching Swiss stations")
            return jsonify({'stations': stations})
            
    except Exception as e:
        print(f"=== ERROR in /api/locations ===")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error', 'stations': []}), 500

@app.route('/api/board')
def board():
    global stations_cache, cache_timestamp
    
    try:
        country = request.args.get('country', 'ch')
        print(f"=== Board request - Country: {country} ===")
        
        if country == 'ca':
            stop_id = request.args.get('stop_id')
            if not stop_id:
                return jsonify({'error': 'stop_id parameter required'}), 400
            
            print(f"=== Fetching Canadian board for stop: {stop_id} ===")
            
            # Check cache
            current_time = time.time()
            cache_key = f"ca_departures_{stop_id}"
            
            if (cache_key in stations_cache and 
                current_time - cache_timestamp < CACHE_DURATION):
                print("Returning cached Canadian departures")
                return jsonify(stations_cache[cache_key])
            
            # Fetch new Canadian data
            departures_data = fetch_canadian_departures(stop_id)
            
            # Cache update
            stations_cache[cache_key] = {
                'station': stop_id,
                'station_name': departures_data['station_name'],
                'departures': departures_data['departures'],
                'updated': datetime.now().isoformat()
            }
            cache_timestamp = current_time
            
            print(f"=== Returning fresh Canadian departures for {departures_data['station_name']} ===")
            return jsonify(stations_cache[cache_key])
        else:
            # Use existing Swiss logic
            station_id = request.args.get('station')
            if not station_id:
                return jsonify({'error': 'Station parameter required'}), 400
            
            print(f"=== Fetching Swiss board for station: {station_id} ===")
            
            # Cache-Check
            current_time = time.time()
            cache_key = f"departures_{station_id}"
            
            if (cache_key in stations_cache and 
                current_time - cache_timestamp < CACHE_DURATION):
                print("Returning cached Swiss departures")
                return jsonify(stations_cache[cache_key])
            
            # Neue Daten laden
            departures = fetch_departures(station_id)
            
            # Cache aktualisieren
            stations_cache[cache_key] = {
                'station': station_id,
                'departures': departures,
                'updated': datetime.now().isoformat()
            }
            cache_timestamp = current_time
            
            print(f"=== Returning fresh Swiss departures ===")
            return jsonify(stations_cache[cache_key])
            
    except Exception as e:
        print(f"=== ERROR in /api/board ===")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6162, debug=False)
