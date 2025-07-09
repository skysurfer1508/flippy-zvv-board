from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import requests
import time
from datetime import datetime
import threading
import os
import csv
import zipfile
import io
from urllib.parse import unquote
import json
import schedule

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Cache für alle Länder
cache_data = {}
cache_timestamps = {}
CACHE_DURATION = 25  # Sekunden

# GTFS-Daten für Kanada (Kelowna)
canada_data = {
    'stops': {},
    'routes': {},
    'trips': {},
    'trip_updates': {},
    'last_gtfs_update': 0
}

# Lade optional SNCF API Key
SNCF_API_KEY = os.getenv('SNCF_API_KEY')

def log_debug(country, query, stops_count, matches_count):
    """Debug-Logging für alle Länder"""
    print(f"[{country.upper()}] q='{query}' stops={stops_count} matches={matches_count}")

def get_cache_key(country, endpoint, params):
    """Generiere Cache-Schlüssel für beliebige Endpunkte"""
    param_str = '_'.join([f"{k}={v}" for k, v in sorted(params.items())])
    return f"{country}_{endpoint}_{param_str}"

def is_cache_valid(cache_key):
    """Prüfe ob Cache noch gültig ist"""
    return (cache_key in cache_data and 
            cache_key in cache_timestamps and
            time.time() - cache_timestamps[cache_key] < CACHE_DURATION)

def update_cache(cache_key, data):
    """Cache aktualisieren"""
    cache_data[cache_key] = data
    cache_timestamps[cache_key] = time.time()

# ==== SCHWEIZ (bestehend) ====
def fetch_stations_ch(query):
    """Hole Stationen von transport.opendata.ch"""
    try:
        response = requests.get(
            'http://transport.opendata.ch/v1/locations',
            params={'query': query, 'type': 'station'},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        stations = [{'id': loc['id'], 'name': loc['name']} for loc in data['stations'][:10]]
        log_debug('ch', query, len(data.get('stations', [])), len(stations))
        return stations
    except Exception as e:
        print(f"Error fetching CH stations: {e}")
        return []

def fetch_departures_ch(station_id, limit=15):
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
        print(f"Error fetching CH departures: {e}")
        return []

# ==== DEUTSCHLAND ====
def fetch_stations_de(query):
    """Hole Stationen von transport.rest (Deutschland)"""
    try:
        response = requests.get(
            'https://v5.transport.rest/locations',
            params={'query': query, 'results': 10},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        stations = []
        for loc in data[:10]:
            if loc.get('type') == 'stop' or loc.get('type') == 'station':
                stations.append({
                    'id': loc['id'],
                    'name': loc['name']
                })
        log_debug('de', query, len(data), len(stations))
        return stations
    except Exception as e:
        print(f"Error fetching DE stations: {e}")
        return []

def fetch_departures_de(station_id, limit=15):
    """Hole Abfahrten von transport.rest (Deutschland)"""
    try:
        response = requests.get(
            f'https://v5.transport.rest/stops/{station_id}/departures',
            params={'duration': 30},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        departures = []
        for dep in data['departures'][:limit]:
            delay_minutes = 0
            if dep.get('delay'):
                delay_minutes = dep['delay'] // 60  # Sekunden zu Minuten
            
            departures.append({
                'line': dep.get('line', {}).get('name', ''),
                'destination': dep.get('direction', ''),
                'departure': dep.get('when', ''),
                'platform': dep.get('platform', ''),
                'delay': delay_minutes if delay_minutes > 0 else 0,
                'category': dep.get('line', {}).get('product', {}).get('name', '')
            })
        
        return departures
    except Exception as e:
        print(f"Error fetching DE departures: {e}")
        return []

# ==== ÖSTERREICH ====
def fetch_stations_at(query):
    """Hole Stationen von AnachB (Österreich)"""
    try:
        response = requests.get(
            'https://anachb.vor.at/bin/ajax-getstop.exe/dn',
            params={'getstop': 1, 'REQ0JourneyStopsS0A': 1, 'REQ0JourneyStopsB': 10, 'REQ0JourneyStopsS0G': query},
            timeout=10
        )
        response.raise_for_status()
        text = response.text
        
        stations = []
        lines = text.split('\n')
        for line in lines:
            if line.startswith('SLs.sls'):
                # Parse die JavaScript-ähnliche Antwort
                try:
                    parts = line.split('|')
                    if len(parts) >= 3:
                        station_id = parts[0].split('[')[1].strip('"')
                        station_name = parts[1].strip('"')
                        stations.append({
                            'id': station_id,
                            'name': station_name
                        })
                except:
                    continue
        
        log_debug('at', query, len(lines), len(stations))
        return stations[:10]
    except Exception as e:
        print(f"Error fetching AT stations: {e}")
        return []

def fetch_departures_at(station_id, limit=15):
    """Hole Abfahrten von AnachB (Österreich)"""
    try:
        response = requests.get(
            'https://anachb.vor.at/bin/stboard.exe/dn',
            params={
                'boardType': 'dep',
                'input': station_id,
                'maxJourneys': limit,
                'start': 'yes',
                'L': 'vs_liveticker'
            },
            timeout=10
        )
        response.raise_for_status()
        # Vereinfachte Parsing-Logik - in Realität würde man HTML parsen
        # Hier Fallback auf leere Liste
        return []
    except Exception as e:
        print(f"Error fetching AT departures: {e}")
        return []

# ==== FRANKREICH ====
def fetch_stations_fr(query):
    """Hole Stationen von SNCF API (Frankreich)"""
    if not SNCF_API_KEY:
        print("SNCF API Key nicht verfügbar")
        return []
    
    try:
        response = requests.get(
            'https://api.sncf-connect.com/v1/coverage/sncf/places',
            params={'q': query, 'count': 10},
            headers={'Authorization': f'apikey {SNCF_API_KEY}'},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        stations = []
        for place in data.get('places', []):
            if place.get('embedded_type') == 'stop_area':
                stations.append({
                    'id': place['id'],
                    'name': place['name']
                })
        
        log_debug('fr', query, len(data.get('places', [])), len(stations))
        return stations
    except Exception as e:
        print(f"Error fetching FR stations: {e}")
        return []

def fetch_departures_fr(station_id, limit=15):
    """Hole Abfahrten von SNCF API (Frankreich)"""
    if not SNCF_API_KEY:
        return []
    
    try:
        response = requests.get(
            f'https://api.sncf-connect.com/v1/coverage/sncf/stop_areas/{station_id}/departures',
            params={'count': limit, 'duration': 3600},
            headers={'Authorization': f'apikey {SNCF_API_KEY}'},
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        departures = []
        for dep in data.get('departures', []):
            departures.append({
                'line': dep.get('display_informations', {}).get('name', ''),
                'destination': dep.get('display_informations', {}).get('direction', ''),
                'departure': dep.get('stop_date_time', {}).get('departure_date_time', ''),
                'platform': '',
                'delay': 0,  # SNCF API hat andere Delay-Struktur
                'category': dep.get('display_informations', {}).get('commercial_mode', '')
            })
        
        return departures
    except Exception as e:
        print(f"Error fetching FR departures: {e}")
        return []

# ==== ITALIEN ====
def fetch_stations_it(query):
    """Hole Stationen von ViaggiaTreno (Italien)"""
    try:
        response = requests.get(
            f'https://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/autocompletaStazione/{query}',
            timeout=10
        )
        response.raise_for_status()
        text = response.text
        
        stations = []
        # ViaggiaTreno gibt einfachen Text zurück: "STATION_NAME|STATION_ID"
        lines = text.strip().split('\n')
        for line in lines[:10]:
            if '|' in line:
                parts = line.split('|')
                if len(parts) >= 2:
                    stations.append({
                        'id': parts[1],
                        'name': parts[0]
                    })
        
        log_debug('it', query, len(lines), len(stations))
        return stations
    except Exception as e:
        print(f"Error fetching IT stations: {e}")
        return []

def fetch_departures_it(station_id, limit=15):
    """Hole Abfahrten von ViaggiaTreno (Italien)"""
    try:
        response = requests.get(
            f'https://www.viaggiatreno.it/infomobilita/resteasy/viaggiatreno/partenze/{station_id}',
            timeout=10
        )
        response.raise_for_status()
        data = response.json()
        
        departures = []
        for dep in data[:limit]:
            delay_minutes = dep.get('ritardo', 0)
            departures.append({
                'line': dep.get('numeroTreno', ''),
                'destination': dep.get('destinazione', ''),
                'departure': dep.get('orarioPartenza', ''),
                'platform': dep.get('binarioProgrammatoPartenzaDescrizione', ''),
                'delay': delay_minutes if delay_minutes > 0 else 0,
                'category': dep.get('categoria', '')
            })
        
        return departures
    except Exception as e:
        print(f"Error fetching IT departures: {e}")
        return []

# ==== KANADA (Kelowna) ====
def fetch_gtfs_data():
    """Lade GTFS-Daten für Kelowna"""
    try:
        print("Downloading GTFS data for Kelowna...")
        response = requests.get(
            'https://bct.tmix.se/Tmix.Cap.TdExport.WebApi/gtfs/?operatorIds=47',
            timeout=30
        )
        response.raise_for_status()
        
        # Parse ZIP
        with zipfile.ZipFile(io.BytesIO(response.content)) as zip_file:
            # Stops laden
            if 'stops.txt' in zip_file.namelist():
                with zip_file.open('stops.txt') as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, 'utf-8'))
                    for row in reader:
                        canada_data['stops'][row['stop_id']] = {
                            'id': row['stop_id'],
                            'name': row['stop_name'],
                            'lat': float(row.get('stop_lat', 0)),
                            'lon': float(row.get('stop_lon', 0))
                        }
            
            # Routes laden  
            if 'routes.txt' in zip_file.namelist():
                with zip_file.open('routes.txt') as f:
                    reader = csv.DictReader(io.TextIOWrapper(f, 'utf-8'))
                    for row in reader:
                        canada_data['routes'][row['route_id']] = {
                            'id': row['route_id'],
                            'short_name': row.get('route_short_name', ''),
                            'long_name': row.get('route_long_name', ''),
                            'type': row.get('route_type', '')
                        }
        
        canada_data['last_gtfs_update'] = time.time()
        print(f"GTFS data loaded: {len(canada_data['stops'])} stops, {len(canada_data['routes'])} routes")
        
    except Exception as e:
        print(f"Error loading GTFS data: {e}")

def fetch_stations_ca(query):
    """Suche Stationen in Kelowna GTFS-Daten"""
    if not canada_data['stops']:
        return []
    
    query_lower = query.lower()
    matches = []
    
    for stop_id, stop in canada_data['stops'].items():
        if query_lower in stop['name'].lower():
            matches.append({
                'id': stop_id,
                'name': stop['name']
            })
            if len(matches) >= 10:
                break
    
    log_debug('ca', query, len(canada_data['stops']), len(matches))
    return matches

def fetch_departures_ca(station_id, limit=15):
    """Hole Abfahrten für Kelowna (vereinfacht)"""
    # In echter Implementierung würde man GTFS-Realtime verwenden
    # Hier Fallback auf statische Demo-Daten
    if station_id not in canada_data['stops']:
        return []
    
    # Demo-Abfahrten generieren
    departures = []
    for i in range(min(limit, 5)):
        departures.append({
            'line': f'Route {i+1}',
            'destination': 'Downtown',
            'departure': datetime.now().isoformat(),
            'platform': '',
            'delay': 0,
            'category': 'Bus'
        })
    
    return departures

# Startup: GTFS-Daten laden
def startup_task():
    """Lade GTFS-Daten beim Start"""
    fetch_gtfs_data()

# Schedule GTFS update
schedule.every().day.at("04:05").do(fetch_gtfs_data)

# ==== API ROUTES ====
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
        return send_file('static/index.html')

@app.route('/api/locations')
def locations():
    country = request.args.get('country', 'ch').lower()
    query = request.args.get('query', '').strip()
    
    if not query or len(query) < 2:
        return jsonify([])
    
    # Cache-Check
    cache_key = get_cache_key(country, 'locations', {'query': query})
    if is_cache_valid(cache_key):
        return jsonify(cache_data[cache_key])
    
    # Länder-spezifische Station-Suche
    try:
        if country == 'ch':
            stations = fetch_stations_ch(query)
        elif country == 'de':
            stations = fetch_stations_de(query)
        elif country == 'at':
            stations = fetch_stations_at(query)
        elif country == 'fr':
            stations = fetch_stations_fr(query)
        elif country == 'it':
            stations = fetch_stations_it(query)
        elif country == 'ca':
            stations = fetch_stations_ca(query)
        else:
            stations = []
        
        # Cache aktualisieren
        update_cache(cache_key, stations)
        return jsonify(stations)
        
    except Exception as e:
        print(f"Error in locations API for {country}: {e}")
        return jsonify([])

@app.route('/api/board')
def board():
    country = request.args.get('country', 'ch').lower()
    station_id = request.args.get('station')
    
    if not station_id:
        return jsonify({'error': 'Station parameter required'}), 400
    
    # Cache-Check
    cache_key = get_cache_key(country, 'board', {'station': station_id})
    if is_cache_valid(cache_key):
        return jsonify(cache_data[cache_key])
    
    # Länder-spezifische Abfahrten
    try:
        if country == 'ch':
            departures = fetch_departures_ch(station_id)
        elif country == 'de':
            departures = fetch_departures_de(station_id)
        elif country == 'at':
            departures = fetch_departures_at(station_id)
        elif country == 'fr':
            departures = fetch_departures_fr(station_id)
        elif country == 'it':
            departures = fetch_departures_it(station_id)
        elif country == 'ca':
            departures = fetch_departures_ca(station_id)
        else:
            departures = []
        
        result = {
            'station': station_id,
            'departures': departures,
            'updated': datetime.now().isoformat()
        }
        
        # Cache aktualisieren
        update_cache(cache_key, result)
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in board API for {country}: {e}")
        return jsonify({'station': station_id, 'departures': [], 'updated': datetime.now().isoformat()})

if __name__ == '__main__':
    # GTFS-Daten beim Start laden
    startup_task()
    app.run(host='0.0.0.0', port=6162, debug=False)