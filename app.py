
from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import requests
import time
from datetime import datetime
import threading
import os

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Cache für Stationsdaten
stations_cache = {}
cache_timestamp = 0
CACHE_DURATION = 25  # Sekunden

def fetch_stations(query):
    """Hole Stationen von transport.opendata.ch"""
    try:
        response = requests.get(
            'http://transport.opendata.ch/v1/locations',
            params={'query': query, 'type': 'station'},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        return [{'id': loc['id'], 'name': loc['name']} for loc in data['stations'][:10]]
    except Exception as e:
        print(f"Error fetching stations: {e}")
        return []

def fetch_departures(station_id, limit=15):
    """Hole Abfahrten von transport.opendata.ch"""
    try:
        response = requests.get(
            'http://transport.opendata.ch/v1/stationboard',
            params={
                'station': station_id,
                'limit': limit,
                'transportations': 'all'
            },
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        departures = []
        for connection in data['stationboard']:
            departure_time = connection['stop']['departure']
            prognosis_time = connection['stop']['prognosis']['departure'] if connection['stop']['prognosis'] else None
            
            # Berechne Verspätung
            delay_minutes = 0
            if prognosis_time and departure_time:
                scheduled = datetime.fromisoformat(departure_time.replace('Z', '+00:00'))
                actual = datetime.fromisoformat(prognosis_time.replace('Z', '+00:00'))
                delay_minutes = int((actual - scheduled).total_seconds() / 60)
            
            departures.append({
                'line': connection['number'],
                'destination': connection['to'],
                'departure': departure_time,
                'platform': connection['stop']['platform'] or '',
                'delay': delay_minutes if delay_minutes > 0 else 0,
                'category': connection['category']
            })
        
        return departures
    except Exception as e:
        print(f"Error fetching departures: {e}")
        return []

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
    query = request.args.get('query', '').strip()
    if not query or len(query) < 2:
        return jsonify([])
    
    stations = fetch_stations(query)
    return jsonify(stations)

@app.route('/api/board')
def board():
    global stations_cache, cache_timestamp
    
    station_id = request.args.get('station')
    if not station_id:
        return jsonify({'error': 'Station parameter required'}), 400
    
    # Cache-Check
    current_time = time.time()
    cache_key = f"departures_{station_id}"
    
    if (cache_key in stations_cache and 
        current_time - cache_timestamp < CACHE_DURATION):
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
    
    return jsonify(stations_cache[cache_key])

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=6162, debug=False)
