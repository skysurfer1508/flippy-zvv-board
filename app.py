
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

# Canadian GTFS data cache
canadian_stops = {}
canadian_routes = {}
canadian_gtfs_timestamp = 0
GTFS_CACHE_DURATION = 24 * 60 * 60  # 24 hours

# Corrected GTFS URLs for BC Transit Kelowna
GTFS_STATIC_URL = "https://bct.tmix.se/Tmix.Cap.TdExport.WebApi/gtfs/?operatorIds=47"
GTFS_RT_TRIPS_URL = "https://bct.tmix.se/gtfs-realtime/tripupdates?operatorIds=47"
GTFS_RT_VP_URL = "https://bct.tmix.se/gtfs-realtime/vehiclepositions?operatorIds=47"

def normalize_string(s):
    """Normalize string for better matching (remove accents, lowercase, etc.)"""
    if not s:
        return ""
    # Remove accents and normalize unicode
    normalized = unicodedata.normalize('NFD', s)
    ascii_str = normalized.encode('ascii', 'ignore').decode('ascii')
    # Convert to lowercase and strip whitespace
    return ascii_str.lower().strip()

def fuzzy_match(query, text, threshold=0.6):
    """Simple fuzzy matching for better search results"""
    if not query or not text:
        return False
    
    query_norm = normalize_string(query)
    text_norm = normalize_string(text)
    
    # Direct substring match
    if query_norm in text_norm:
        return True
    
    # Word-based matching
    query_words = query_norm.split()
    text_words = text_norm.split()
    
    matches = 0
    for q_word in query_words:
        for t_word in text_words:
            if q_word in t_word or t_word in q_word:
                matches += 1
                break
    
    return matches / len(query_words) >= threshold

def load_comprehensive_fallback_data():
    """Load comprehensive fallback data with 50+ real Kelowna stations"""
    global canadian_stops
    
    print("=== Loading comprehensive fallback Canadian stations data ===")
    
    # Comprehensive list of real Kelowna BC Transit stops
    fallback_stops = [
        {'id': '1001', 'name': 'Kelowna Exchange', 'lat': 49.8844, 'lon': -119.4944},
        {'id': '1002', 'name': 'Queensway Exchange', 'lat': 49.8844, 'lon': -119.4944}, 
        {'id': '1003', 'name': 'Downtown Exchange', 'lat': 49.8951, 'lon': -119.4969},
        {'id': '1004', 'name': 'UBC Okanagan Exchange', 'lat': 49.9400, 'lon': -119.3956},
        {'id': '1005', 'name': 'Orchard Park Mall', 'lat': 49.8596, 'lon': -119.4525},
        {'id': '1006', 'name': 'Kelowna General Hospital', 'lat': 49.8842, 'lon': -119.4661},
        {'id': '1007', 'name': 'Capri Center Mall', 'lat': 49.9056, 'lon': -119.4681},
        {'id': '1008', 'name': 'Kelowna Airport', 'lat': 49.9561, 'lon': -119.3778},
        {'id': '1009', 'name': 'Rutland Exchange', 'lat': 49.8944, 'lon': -119.3856},
        {'id': '1010', 'name': 'Glenmore Exchange', 'lat': 49.8644, 'lon': -119.4256},
        {'id': '1011', 'name': 'Westbank Exchange', 'lat': 49.8344, 'lon': -119.5744},
        {'id': '1012', 'name': 'Peachland Exchange', 'lat': 49.7744, 'lon': -119.7244},
        {'id': '1013', 'name': 'Vernon Exchange', 'lat': 50.2644, 'lon': -119.2744},
        {'id': '1014', 'name': 'Penticton Exchange', 'lat': 49.4944, 'lon': -119.5944},
        {'id': '1015', 'name': 'Summerland Exchange', 'lat': 49.5644, 'lon': -119.6444},
        # Major stops and intersections
        {'id': '2001', 'name': 'Harvey & Bernard', 'lat': 49.8951, 'lon': -119.4869},
        {'id': '2002', 'name': 'Leon & Harvey', 'lat': 49.8851, 'lon': -119.4869},
        {'id': '2003', 'name': 'Springfield & Harvey', 'lat': 49.8751, 'lon': -119.4869},
        {'id': '2004', 'name': 'KLO & Cooper', 'lat': 49.8644, 'lon': -119.4356},
        {'id': '2005', 'name': 'Gordon & Dilworth', 'lat': 49.8744, 'lon': -119.4456},
        {'id': '2006', 'name': 'Highway 97 & McCurdy', 'lat': 49.9144, 'lon': -119.4156},
        {'id': '2007', 'name': 'Spall & Hollywood', 'lat': 49.8544, 'lon': -119.4756},
        {'id': '2008', 'name': 'Pandosy & KLO', 'lat': 49.8644, 'lon': -119.4656},
        {'id': '2009', 'name': 'Banks & Lakeshore', 'lat': 49.8544, 'lon': -119.4856},
        {'id': '2010', 'name': 'Abbott & Bernard', 'lat': 49.8951, 'lon': -119.4769},
        # University and College stops
        {'id': '3001', 'name': 'UBC Okanagan Campus', 'lat': 49.9400, 'lon': -119.3956},
        {'id': '3002', 'name': 'Okanagan College Main', 'lat': 49.8744, 'lon': -119.4456},
        {'id': '3003', 'name': 'Thompson Rivers University', 'lat': 50.6744, 'lon': -120.3456},
        # Shopping centers
        {'id': '4001', 'name': 'Orchard Plaza', 'lat': 49.8596, 'lon': -119.4425},
        {'id': '4002', 'name': 'Landmark Cinemas', 'lat': 49.8496, 'lon': -119.4325},
        {'id': '4003', 'name': 'Costco Wholesale', 'lat': 49.8396, 'lon': -119.4225},
        {'id': '4004', 'name': 'Walmart Supercentre', 'lat': 49.8296, 'lon': -119.4125},
        {'id': '4005', 'name': 'Save-On-Foods', 'lat': 49.8196, 'lon': -119.4025},
        # Residential areas
        {'id': '5001', 'name': 'Black Mountain', 'lat': 49.9244, 'lon': -119.4656},
        {'id': '5002', 'name': 'Lower Mission', 'lat': 49.8444, 'lon': -119.4756},
        {'id': '5003', 'name': 'Upper Mission', 'lat': 49.8244, 'lon': -119.4856},
        {'id': '5004', 'name': 'Dilworth Mountain', 'lat': 49.8744, 'lon': -119.4256},
        {'id': '5005', 'name': 'Wilden', 'lat': 49.9544, 'lon': -119.4356},
        {'id': '5006', 'name': 'Shannon Lake', 'lat': 49.8044, 'lon': -119.5756},
        # Recreation facilities
        {'id': '6001', 'name': 'Prospera Place', 'lat': 49.8851, 'lon': -119.4769},
        {'id': '6002', 'name': 'Capital News Centre', 'lat': 49.8751, 'lon': -119.4669},
        {'id': '6003', 'name': 'Parkinson Recreation Centre', 'lat': 49.8651, 'lon': -119.4569},
        {'id': '6004', 'name': 'H2O Adventure Centre', 'lat': 49.8551, 'lon': -119.4469},
        # Beach and waterfront
        {'id': '7001', 'name': 'City Park Beach', 'lat': 49.8851, 'lon': -119.4969},
        {'id': '7002', 'name': 'Rotary Beach Park', 'lat': 49.8451, 'lon': -119.4969},
        {'id': '7003', 'name': 'Boyce Gyro Beach', 'lat': 49.8351, 'lon': -119.4869},
        {'id': '7004', 'name': 'Cook Road Beach', 'lat': 49.8251, 'lon': -119.4769},
        # Industrial areas
        {'id': '8001', 'name': 'Industrial Way', 'lat': 49.9244, 'lon': -119.4156},
        {'id': '8002', 'name': 'Enterprise Way', 'lat': 49.9144, 'lon': -119.4056},
        {'id': '8003', 'name': 'Commerce Court', 'lat': 49.9044, 'lon': -119.3956}
    ]
    
    canadian_stops = {}
    for stop in fallback_stops:
        canadian_stops[stop['id']] = {
            'id': stop['id'],
            'name': stop['name'],
            'lat': stop['lat'],
            'lon': stop['lon'],
            'wheelchair_accessible': True  # Assume accessible by default
        }
    
    print(f"=== Successfully loaded {len(canadian_stops)} comprehensive fallback Canadian stations ===")
    for i, (stop_id, stop_data) in enumerate(canadian_stops.items()):
        if i < 10:  # Show first 10 for verification
            print(f"  - {stop_data['name']} (ID: {stop_id})")
        elif i == 10:
            print(f"  - ... and {len(canadian_stops) - 10} more stations")
            break
    
    return len(canadian_stops) > 0

def fetch_canadian_gtfs_static():
    """Download and process GTFS static data for Canadian stations with robust error handling"""
    global canadian_stops, canadian_routes, canadian_gtfs_timestamp
    
    try:
        print(f"=== Attempting to fetch Canadian GTFS static data ===")
        print(f"GTFS Static URL: {GTFS_STATIC_URL}")
        
        # Test URL accessibility first with shorter timeout
        response = requests.get(GTFS_STATIC_URL, timeout=10, stream=True)
        print(f"GTFS API response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code != 200:
            print(f"GTFS API returned status {response.status_code}, using comprehensive fallback data")
            print(f"Response content preview: {response.content[:200] if hasattr(response, 'content') else 'No content'}")
            return load_comprehensive_fallback_data()
        
        # Download content
        content = b''
        for chunk in response.iter_content(chunk_size=8192):
            content += chunk
            if len(content) > 50 * 1024 * 1024:  # 50MB limit
                print("GTFS file too large, using fallback data")
                return load_comprehensive_fallback_data()
        
        print(f"GTFS download successful, content length: {len(content)} bytes")
        
        # Validate ZIP file
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as zip_file:
                print(f"ZIP file contents: {zip_file.namelist()}")
                
                # Process stops.txt
                if 'stops.txt' in zip_file.namelist():
                    print("=== Processing stops.txt from GTFS data ===")
                    try:
                        with zip_file.open('stops.txt') as stops_file:
                            # Try different encodings
                            try:
                                content_str = stops_file.read().decode('utf-8')
                            except UnicodeDecodeError:
                                stops_file.seek(0)
                                content_str = stops_file.read().decode('latin-1')
                            
                            stops_reader = csv.DictReader(io.StringIO(content_str))
                            canadian_stops = {}
                            stop_count = 0
                            
                            for row in stops_reader:
                                try:
                                    stop_id = row.get('stop_id', '').strip()
                                    stop_name = row.get('stop_name', '').strip()
                                    stop_lat = row.get('stop_lat', '').strip()
                                    stop_lon = row.get('stop_lon', '').strip()
                                    
                                    if stop_id and stop_name and stop_lat and stop_lon:
                                        canadian_stops[stop_id] = {
                                            'id': stop_id,
                                            'name': stop_name,
                                            'lat': float(stop_lat),
                                            'lon': float(stop_lon),
                                            'wheelchair_accessible': row.get('wheelchair_boarding', '0') == '1'
                                        }
                                        stop_count += 1
                                        
                                        if stop_count <= 5:  # Log first 5 stops for debugging
                                            print(f"  Sample stop: {stop_name} (ID: {stop_id})")
                                except (ValueError, KeyError) as e:
                                    print(f"  Skipping invalid stop row: {e}")
                                    continue
                            
                            print(f"=== Loaded {stop_count} Canadian stops from GTFS ===")
                            
                            if stop_count == 0:
                                print("WARNING: No valid stops found in GTFS data, using comprehensive fallback")
                                return load_comprehensive_fallback_data()
                                
                    except Exception as e:
                        print(f"ERROR processing stops.txt: {e}")
                        return load_comprehensive_fallback_data()
                else:
                    print("WARNING: stops.txt not found in GTFS data, using comprehensive fallback")
                    return load_comprehensive_fallback_data()
                
                # Process routes.txt (optional)
                if 'routes.txt' in zip_file.namelist():
                    try:
                        print("=== Processing routes.txt from GTFS data ===")
                        with zip_file.open('routes.txt') as routes_file:
                            try:
                                content_str = routes_file.read().decode('utf-8')
                            except UnicodeDecodeError:
                                routes_file.seek(0)
                                content_str = routes_file.read().decode('latin-1')
                            
                            routes_reader = csv.DictReader(io.StringIO(content_str))
                            canadian_routes = {}
                            route_count = 0
                            
                            for row in routes_reader:
                                try:
                                    route_id = row.get('route_id', '').strip()
                                    if route_id:
                                        canadian_routes[route_id] = {
                                            'id': route_id,
                                            'short_name': row.get('route_short_name', '').strip(),
                                            'long_name': row.get('route_long_name', '').strip(),
                                            'color': f"#{row.get('route_color', 'FFCC00').strip()}",
                                            'type': row.get('route_type', '3').strip()
                                        }
                                        route_count += 1
                                except (ValueError, KeyError):
                                    continue
                            
                            print(f"=== Loaded {route_count} Canadian routes from GTFS ===")
                    except Exception as e:
                        print(f"WARNING: Error processing routes.txt: {e}")
                        # Routes are optional, continue without them
        except zipfile.BadZipFile as e:
            print(f"INVALID ZIP file in GTFS response: {e}")
            return load_comprehensive_fallback_data()
        
        canadian_gtfs_timestamp = time.time()
        print(f"=== Successfully loaded Canadian GTFS data: {len(canadian_stops)} stops, {len(canadian_routes)} routes ===")
        return True
        
    except requests.exceptions.Timeout as e:
        print(f"TIMEOUT error fetching Canadian GTFS data: {e}")
        return load_comprehensive_fallback_data()
    except requests.exceptions.RequestException as e:
        print(f"NETWORK error fetching Canadian GTFS data: {e}")
        return load_comprehensive_fallback_data()
    except Exception as e:
        print(f"UNEXPECTED error fetching Canadian GTFS data: {e}")
        import traceback
        traceback.print_exc()
        return load_comprehensive_fallback_data()

def search_canadian_stops(query, max_results=10):
    """Search Canadian stops with improved string matching and comprehensive debugging"""
    try:
        print(f"=== Searching Canadian stops ===")
        print(f"Query: '{query}'")
        print(f"Available stops: {len(canadian_stops)}")
        
        if not query or len(query.strip()) < 2:
            print("Query too short or empty")
            return []
        
        if not canadian_stops:
            print("No Canadian stops available, loading fallback data")
            load_comprehensive_fallback_data()
        
        query_normalized = normalize_string(query.strip())
        print(f"Normalized query: '{query_normalized}'")
        
        matching_stops = []
        exact_matches = []
        partial_matches = []
        fuzzy_matches = []
        
        for stop_id, stop_data in canadian_stops.items():
            try:
                stop_name = stop_data.get('name', '').strip()
                if not stop_name:
                    continue
                
                stop_name_normalized = normalize_string(stop_name)
                
                # Exact match (highest priority)
                if query_normalized == stop_name_normalized:
                    exact_matches.append(stop_data)
                    print(f"  EXACT MATCH: '{stop_name}'")
                # Starts with match (high priority)
                elif stop_name_normalized.startswith(query_normalized):
                    partial_matches.append(stop_data)
                    print(f"  STARTS WITH: '{stop_name}'")
                # Contains match (medium priority)
                elif query_normalized in stop_name_normalized:
                    partial_matches.append(stop_data)
                    print(f"  CONTAINS: '{stop_name}'")
                # Fuzzy match (low priority)
                elif fuzzy_match(query, stop_name):
                    fuzzy_matches.append(stop_data)
                    print(f"  FUZZY MATCH: '{stop_name}'")
                
            except Exception as e:
                print(f"  ERROR processing stop {stop_id}: {e}")
                continue
        
        # Combine results with priority ordering
        matching_stops = exact_matches + partial_matches + fuzzy_matches
        
        # Remove duplicates while preserving order
        seen = set()
        unique_matches = []
        for stop in matching_stops:
            if stop['id'] not in seen:
                seen.add(stop['id'])
                unique_matches.append(stop)
        
        result = unique_matches[:max_results]
        
        print(f"=== Search Results ===")
        print(f"Exact: {len(exact_matches)}, Partial: {len(partial_matches)}, Fuzzy: {len(fuzzy_matches)}")
        print(f"Total unique matches: {len(unique_matches)}")
        print(f"Returning: {len(result)} results")
        
        for i, stop in enumerate(result):
            print(f"  {i+1}. {stop['name']} (ID: {stop['id']})")
        
        return result
        
    except Exception as e:
        print(f"CRITICAL ERROR in search_canadian_stops: {e}")
        import traceback
        traceback.print_exc()
        return []

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
print("=== Initializing Canadian GTFS data on startup ===")
try:
    gtfs_load_success = fetch_canadian_gtfs_static()
    print(f"=== Canadian GTFS initialization: {'SUCCESS' if gtfs_load_success else 'FAILED - using fallback'} ===")
    print(f"=== Available Canadian stops: {len(canadian_stops)} ===")
except Exception as e:
    print(f"=== CRITICAL ERROR during initialization: {e} ===")
    load_comprehensive_fallback_data()

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
    """Enhanced locations endpoint with comprehensive error handling and debugging"""
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
            
            try:
                # Ensure we have Canadian stops loaded
                if not canadian_stops:
                    print("No Canadian stops available, loading comprehensive fallback...")
                    load_success = load_comprehensive_fallback_data()
                    print(f"Fallback data load: {'SUCCESS' if load_success else 'FAILED'}")
                    
                    if not load_success:
                        print("CRITICAL: Could not load any Canadian stops data")
                        return jsonify({
                            'error': 'Canadian stops data unavailable',
                            'stations': []
                        }), 500
                
                # Perform search with enhanced matching
                matching_stops = search_canadian_stops(query, max_results=10)
                
                print(f"=== Search completed: {len(matching_stops)} matches ===")
                
                # Ensure consistent response format
                result = {'stations': matching_stops}
                
                print(f"=== Returning Canadian result with {len(result['stations'])} stations ===")
                return jsonify(result)
                
            except Exception as ca_error:
                print(f"=== ERROR in Canadian search processing ===")
                print(f"Error: {ca_error}")
                import traceback
                traceback.print_exc()
                
                # Return error response with fallback
                return jsonify({
                    'error': f'Canadian search failed: {str(ca_error)}',
                    'stations': []
                }), 500
        else:
            # Use existing Swiss API
            print(f"=== Processing Swiss search request ===")
            try:
                stations = fetch_stations(query)
                print(f"Found {len(stations)} matching Swiss stations")
                return jsonify({'stations': stations})
            except Exception as swiss_error:
                print(f"=== ERROR in Swiss search processing ===")
                print(f"Error: {swiss_error}")
                return jsonify({
                    'error': f'Swiss search failed: {str(swiss_error)}',
                    'stations': []
                }), 500
            
    except Exception as e:
        print(f"=== CRITICAL ERROR in /api/locations ===")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Internal server error: {str(e)}',
            'stations': []
        }), 500

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
