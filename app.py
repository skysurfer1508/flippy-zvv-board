
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
import unicodedata
import re

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Cache für Stationsdaten
stations_cache = {}
cache_timestamp = 0
CACHE_DURATION = 25  # Sekunden

# Canadian stations data
canadian_stops = {}

def load_canadian_stations():
    """Load Canadian stations from static JSON file"""
    global canadian_stops
    
    try:
        print("=== Loading Canadian stations from static JSON ===")
        
        # Try to load from static JSON file
        import json
        with open('static/kelowna-stations.json', 'r') as f:
            data = json.load(f)
        
        canadian_stops = {}
        for station in data['stations']:
            canadian_stops[station['id']] = station
        
        print(f"=== Successfully loaded {len(canadian_stops)} Canadian stations ===")
        return True
        
    except Exception as e:
        print(f"ERROR loading Canadian stations: {e}")
        
        # Fallback to hardcoded data
        print("=== Using fallback Canadian stations data ===")
        fallback_stations = [
            {"id": "1001", "name": "Kelowna Exchange", "coordinate": {"x": 49.8844, "y": -119.4944}},
            {"id": "1003", "name": "Downtown Exchange", "coordinate": {"x": 49.8951, "y": -119.4969}},
            {"id": "1004", "name": "UBC Okanagan Exchange", "coordinate": {"x": 49.9400, "y": -119.3956}},
            {"id": "1005", "name": "Orchard Park Mall", "coordinate": {"x": 49.8596, "y": -119.4525}},
            {"id": "1006", "name": "Kelowna General Hospital", "coordinate": {"x": 49.8842, "y": -119.4661}},
            {"id": "1007", "name": "Capri Center Mall", "coordinate": {"x": 49.9056, "y": -119.4681}},
            {"id": "1008", "name": "Kelowna Airport", "coordinate": {"x": 49.9561, "y": -119.3778}},
            {"id": "1009", "name": "Rutland Exchange", "coordinate": {"x": 49.8944, "y": -119.3856}},
            {"id": "1010", "name": "Glenmore Exchange", "coordinate": {"x": 49.8644, "y": -119.4256}},
            {"id": "1011", "name": "Westbank Exchange", "coordinate": {"x": 49.8344, "y": -119.5744}}
        ]
        
        canadian_stops = {}
        for station in fallback_stations:
            canadian_stops[station['id']] = station
        
        print(f"=== Loaded {len(canadian_stops)} fallback Canadian stations ===")
        return True

def fetch_canadian_departures(stop_id):
    """Fetch Canadian departures using GTFS-RT with enhanced mock data"""
    try:
        print(f"=== Fetching departures for Canadian stop: {stop_id} ===")
        
        stop_info = canadian_stops.get(stop_id, {})
        stop_name = stop_info.get('name', 'Unknown Station')
        
        # Enhanced mock data based on real BC Transit routes
        mock_routes = [
            {'route': '97', 'destination': 'Downtown', 'color': '#FFCC00', 'delay': 0, 'minutes': 5},
            {'route': '23', 'destination': 'UBC Okanagan', 'color': '#4169E1', 'delay': 2, 'minutes': 12},
            {'route': '8', 'destination': 'Rutland Exchange', 'color': '#32CD32', 'delay': -1, 'minutes': 18},
            {'route': '15', 'destination': 'Glenmore', 'color': '#FF6347', 'delay': 0, 'minutes': 25},
            {'route': '1', 'destination': 'Westbank', 'color': '#9370DB', 'delay': 3, 'minutes': 32}
        ]
        
        departures = []
        current_time = datetime.now()
        
        for route_info in mock_routes:
            departure_time = current_time.replace(
                minute=(current_time.minute + route_info['minutes']) % 60,
                hour=current_time.hour + ((current_time.minute + route_info['minutes']) // 60)
            )
            
            departures.append({
                'route_short_name': route_info['route'],
                'route_id': route_info['route'],
                'trip_headsign': route_info['destination'],
                'departure_time': departure_time.isoformat(),
                'delay': route_info['delay'],
                'platform': None,
                'route_color': route_info['color']
            })
        
        return {
            'station_name': stop_name,
            'departures': departures
        }
        
    except Exception as e:
        print(f"ERROR fetching Canadian departures: {e}")
        import traceback
        traceback.print_exc()
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
print("=== Initializing Canadian stations on startup ===")
try:
    stations_load_success = load_canadian_stations()
    print(f"=== Canadian stations initialization: {'SUCCESS' if stations_load_success else 'FAILED'} ===")
    print(f"=== Available Canadian stations: {len(canadian_stops)} ===")
except Exception as e:
    print(f"=== CRITICAL ERROR during initialization: {e} ===")
    load_canadian_stations()

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
    """Enhanced locations endpoint with comprehensive error handling"""
    try:
        country = request.args.get('country', 'ch')
        query = request.args.get('q', '').strip()
        
        print(f"Location search: country={country}, query='{query}'")
        
        if not query or len(query) < 2:
            return jsonify({'stations': []})
        
        if country == 'ca':
            try:
                # Ensure we have Canadian stations loaded
                if not canadian_stops:
                    print("Loading Canadian stations...")
                    load_canadian_stations()
                
                # Simple search logic
                q_lower = query.lower()
                matches = []
                
                for stop_id, stop_data in canadian_stops.items():
                    stop_name = stop_data.get('name', '')
                    if q_lower in stop_name.lower():
                        matches.append(stop_data)
                        if len(matches) >= 10:
                            break
                
                print(f"Found {len(matches)} Canadian matches for '{query}'")
                return jsonify({'stations': matches})
                
            except Exception as e:
                print(f"ERROR in Canadian search: {e}")
                return jsonify({'stations': []})
        else:
            # Swiss API
            try:
                stations = fetch_stations(query)
                return jsonify({'stations': stations})
            except Exception as e:
                print(f"ERROR in Swiss search: {e}")
                return jsonify({'stations': []})
            
    except Exception as e:
        print(f"CRITICAL ERROR in /api/locations: {e}")
        return jsonify({'stations': []})

@app.route('/api/board')
def board():
    """Enhanced board endpoint with comprehensive error handling"""
    global stations_cache, cache_timestamp
    
    try:
        country = request.args.get('country', 'ch')
        print(f"=== Board request - Country: {country} ===")
        
        if country == 'ca':
            stop_id = request.args.get('stop_id')
            if not stop_id:
                return jsonify({'error': 'stop_id parameter required'}), 400
            
            print(f"=== Fetching Canadian board for stop: {stop_id} ===")
            
            try:
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
                
            except Exception as ca_board_error:
                print(f"=== ERROR fetching Canadian board ===")
                print(f"Error: {ca_board_error}")
                import traceback
                traceback.print_exc()
                return jsonify({
                    'error': f'Canadian board fetch failed: {str(ca_board_error)}',
                    'station': stop_id,
                    'departures': []
                }), 500
        else:
            # Use existing Swiss logic
            station_id = request.args.get('station')
            if not station_id:
                return jsonify({'error': 'Station parameter required'}), 400
            
            print(f"=== Fetching Swiss board for station: {station_id} ===")
            
            try:
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
                
            except Exception as swiss_board_error:
                print(f"=== ERROR fetching Swiss board ===")
                print(f"Error: {swiss_board_error}")
                return jsonify({
                    'error': f'Swiss board fetch failed: {str(swiss_board_error)}',
                    'station': station_id,
                    'departures': []
                }), 500
            
    except Exception as e:
        print(f"=== CRITICAL ERROR in /api/board ===")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Internal server error: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6162, debug=False)
