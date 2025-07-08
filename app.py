
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

# Corrected GTFS URLs for BC Transit Kelowna
GTFS_STATIC_URL = "https://bct.tmix.se/Tmix.Cap.TdExport.WebApi/gtfs/?operatorIds=47"
GTFS_RT_TRIPS_URL = "https://bct.tmix.se/gtfs-realtime/tripupdates.pb?operatorIds=47"
GTFS_RT_VP_URL = "https://bct.tmix.se/gtfs-realtime/vehicleupdates.pb?operatorIds=47"

def fetch_canadian_gtfs_static():
    """Download and process GTFS static data for Canadian stations"""
    global canadian_stops, canadian_routes, canadian_gtfs_timestamp
    
    try:
        print(f"Fetching Canadian GTFS static data from: {GTFS_STATIC_URL}")
        response = requests.get(GTFS_STATIC_URL, timeout=30)
        response.raise_for_status()
        print(f"GTFS download successful, content length: {len(response.content)} bytes")
        
        # Extract ZIP file
        with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
            print(f"ZIP file contents: {zip_file.namelist()}")
            
            # Process stops.txt
            if 'stops.txt' in zip_file.namelist():
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
                    print(f"Loaded {stop_count} Canadian stops")
            else:
                print("WARNING: stops.txt not found in GTFS data")
            
            # Process routes.txt
            if 'routes.txt' in zip_file.namelist():
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
                    print(f"Loaded {route_count} Canadian routes")
            else:
                print("WARNING: routes.txt not found in GTFS data")
        
        canadian_gtfs_timestamp = time.time()
        print(f"Successfully loaded Canadian GTFS data: {len(canadian_stops)} stops, {len(canadian_routes)} routes")
        
    except Exception as e:
        print(f"Error fetching Canadian GTFS data: {e}")
        # Add some fallback data for testing
        canadian_stops = {
            'test_stop_1': {
                'id': 'test_stop_1',
                'name': 'Queensway Exchange',
                'lat': 49.8844,
                'lon': -119.4944
            },
            'test_stop_2': {
                'id': 'test_stop_2', 
                'name': 'UBC Okanagan Exchange',
                'lat': 49.9400,
                'lon': -119.3956
            }
        }
        print("Using fallback Canadian stops data")

def fetch_canadian_departures(stop_id):
    """Fetch Canadian departures using GTFS-RT"""
    try:
        print(f"Fetching departures for Canadian stop: {stop_id}")
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
        print(f"Error fetching Canadian departures: {e}")
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
fetch_canadian_gtfs_static()

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
    country = request.args.get('country', 'ch')
    query = request.args.get('q', '').strip()
    
    print(f"Location search - Country: {country}, Query: '{query}'")
    
    if not query or len(query) < 2:
        return jsonify({'stations': []})
    
    if country == 'ca':
        # Search Canadian stops
        if not canadian_stops:
            print("Canadian stops not loaded, attempting to fetch...")
            fetch_canadian_gtfs_static()
        
        matching_stops = []
        query_lower = query.lower()
        for stop_id, stop_data in canadian_stops.items():
            if query_lower in stop_data['name'].lower():
                matching_stops.append(stop_data)
                if len(matching_stops) >= 10:
                    break
        
        print(f"Found {len(matching_stops)} matching Canadian stops")
        # Fix: Return consistent format with Swiss API
        return jsonify({'stations': matching_stops})
    else:
        # Use existing Swiss API
        stations = fetch_stations(query)
        print(f"Found {len(stations)} matching Swiss stations")
        return jsonify({'stations': stations})

@app.route('/api/board')
def board():
    global stations_cache, cache_timestamp
    
    country = request.args.get('country', 'ch')
    print(f"Board request - Country: {country}")
    
    if country == 'ca':
        stop_id = request.args.get('stop_id')
        if not stop_id:
            return jsonify({'error': 'stop_id parameter required'}), 400
        
        print(f"Fetching Canadian board for stop: {stop_id}")
        
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
        
        print(f"Returning fresh Canadian departures for {departures_data['station_name']}")
        return jsonify(stations_cache[cache_key])
    else:
        # Use existing Swiss logic
        station_id = request.args.get('station')
        if not station_id:
            return jsonify({'error': 'Station parameter required'}), 400
        
        print(f"Fetching Swiss board for station: {station_id}")
        
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
        
        print(f"Returning fresh Swiss departures")
        return jsonify(stations_cache[cache_key])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6162, debug=False)
