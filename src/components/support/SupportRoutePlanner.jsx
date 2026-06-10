import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
    Route as RouteIcon, MapPin, Plus, X, ArrowUp, ArrowDown, 
    Compass, Search, Building2, ExternalLink, Copy, Navigation, 
    Map, List, Check, CheckCircle2, AlertTriangle, Eye, EyeOff,
    Calendar, Star
} from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

// Leaflet premium HTML custom pins creator
const createPremiumPin = (color, iconType, className = '') => {
    let iconHtml = '';
    if (iconType === 'hotel') {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
    } else if (iconType === 'restaurant') {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v8c0 1.1.9 2 2 2h3Z"/><path d="M18 22V15"/></svg>`;
    } else if (iconType === 'fuel') {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="15" y1="22" y2="22"/><line x1="4" x2="14" y1="2" y2="2"/><path d="M12 22V8c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v14"/><path d="M16 13h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-3"/><path d="M9 6h2"/><path d="M6 10h6"/><path d="M9 14h2"/><circle cx="9" cy="18" r="1"/></svg>`;
    } else if (iconType === 'home') {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    } else if (iconType === 'compass') {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`;
    } else if (iconType === 'search') {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>`;
    } else if (iconType === 'client') {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/></svg>`;
    } else {
        iconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
    }

    return L.divIcon({
        html: `
            <div style="position: relative; width: 30px; height: 38px; display: flex; align-items: center; justify-content: center;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 30" width="30" height="38" style="position: absolute; top: 0; left: 0; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">
                    <path fill="${color}" stroke="#ffffff" stroke-width="1.5" d="M12 0C5.37 0 0 5.37 0 12c0 7.33 12 18 12 18s12-10.67 12-18C24 5.37 18.63 0 12 0z"/>
                </svg>
                <div style="position: absolute; top: 8px; left: 8.5px; display: flex; align-items: center; justify-content: center; color: white; width: 13px; height: 13px;">
                    ${iconHtml}
                </div>
            </div>
        `,
        className: className || 'custom-premium-marker',
        iconSize: [30, 38],
        iconAnchor: [15, 38],
        popupAnchor: [0, -34]
    });
};

const icons = {
    hotel: createPremiumPin('#2563eb', 'hotel'),       // Blue for Hotels
    restaurant: createPremiumPin('#dc2626', 'restaurant'),  // Red for Restaurants
    fuel: createPremiumPin('#16a34a', 'fuel'),      // Green for Gas Stations
    other: createPremiumPin('#ca8a04', 'other'),    // Yellow for Others
    start: createPremiumPin('#ea580c', 'home'),     // Orange house for Sede
    gps: createPremiumPin('#ea580c', 'compass'),    // Orange compass for GPS
    client: createPremiumPin('#64748b', 'client', 'client-reference-marker') // Grey for Clients Reference
};

// Numbered badge icon creator for stops
const getNumberIcon = (number, color = '#4f46e5') => {
    return L.divIcon({
        html: `<div style="
            background-color: ${color}; 
            color: white; 
            width: 22px; 
            height: 22px; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 10px; 
            font-weight: 900; 
            border: 2px solid white; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">${number}</div>`,
        className: 'custom-number-icon',
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
};

// Recenter helper component
const RecenterMap = ({ bounds }) => {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.length > 0) {
            try {
                map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
            } catch (e) {
                console.warn("Could not fit map bounds:", e);
            }
        }
    }, [bounds, map]);
    return null;
};

// Component to handle map size invalidation on mobile tab change
const UpdateMapSize = ({ mobileTab }) => {
    const map = useMap();
    useEffect(() => {
        if (mobileTab === 'MAP') {
            const timer = setTimeout(() => {
                map.invalidateSize();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [mobileTab, map]);
    return null;
};

// Helper: Haversine distance in km
const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const SupportRoutePlanner = ({
    supabase,
    currentUser,
    theme,
    notifySuccess,
    notifyError,
    onNewTask,
    tasks = []
}) => {
    const isMobile = useIsMobile();
    const [mobileTab, setMobileTab] = useState('ITINERARY'); // 'ITINERARY' or 'MAP'

    // Core Lists
    const [allClients, setAllClients] = useState([]);
    const [supportPlaces, setSupportPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedState, setSelectedState] = useState('');
    const [showAllClientsOnMap, setShowAllClientsOnMap] = useState(false);

    // Available States for filtering
    const availableStates = useMemo(() => {
        const states = allClients
            .map(c => c.state?.trim().toUpperCase())
            .filter(Boolean);
        return [...new Set(states)].sort();
    }, [allClients]);

    // Starting Point State
    const [startType, setStartType] = useState('SEDE'); // 'SEDE' or 'GPS'
    const [gpsCoords, setGpsCoords] = useState(null);
    const [gpsLoading, setGpsLoading] = useState(false);

    // Default Company Coordinates (São Paulo, Praça da Sé) or Custom saved Sede
    const [sede, setSede] = useState(() => {
        try {
            const saved = localStorage.getItem('assistec_custom_sede');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error("Error loading custom sede from localStorage:", e);
        }
        return { lat: -23.5505, lng: -46.6333, name: 'Sede (Empresa)', address: 'Praça da Sé, SP' };
    });

    const [showSedeModal, setShowSedeModal] = useState(false);
    const [tempSede, setTempSede] = useState({ name: '', address: '', lat: '', lng: '' });
    const [sedeSearchQuery, setSedeSearchQuery] = useState('');
    const [sedeSearchResults, setSedeSearchResults] = useState([]);
    const [sedeSearching, setSedeSearching] = useState(false);
    const [sedeGpsLoading, setSedeGpsLoading] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const panelRef = useRef(null);
    const isGeocodingBatchRunning = useRef(false);

    // Batch geocode clients that don't have coordinates (run once per client, throttled to 1.1s to respect OSM terms)
    useEffect(() => {
        if (!showAllClientsOnMap || allClients.length === 0 || isGeocodingBatchRunning.current) return;

        const clientsWithoutGeo = allClients.filter(c => !c.lat || !c.lng);
        if (clientsWithoutGeo.length === 0) return;

        let active = true;
        isGeocodingBatchRunning.current = true;

        const geocodeBatch = async () => {
            for (const client of clientsWithoutGeo) {
                if (!active) break;

                const queryStr = client.address || `${client.street || ''}, ${client.number || ''} ${client.neighborhood || ''} ${client.city || ''} ${client.state || ''}`;
                if (!queryStr.trim()) continue;

                try {
                    console.log(`[Batch Geocode] Geocodificando cliente: "${client.name}" com busca: "${queryStr}"`);
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1&countrycodes=br`,
                        { headers: { 'User-Agent': 'AssistecApp/1.0' } }
                    );
                    const data = await res.json();
                    let lat = null;
                    let lng = null;

                    if (data && data[0]) {
                        lat = Number(data[0].lat);
                        lng = Number(data[0].lon);
                    }

                    if ((!lat || !lng) && client.city) {
                        const fallbackRes = await fetch(
                            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${client.city}, ${client.state || ''}`)}&limit=1&countrycodes=br`,
                            { headers: { 'User-Agent': 'AssistecApp/1.0' } }
                        );
                        const fallbackData = await fallbackRes.json();
                        if (fallbackData && fallbackData[0]) {
                            lat = Number(fallbackData[0].lat);
                            lng = Number(fallbackData[0].lon);
                        }
                    }

                    if (lat && lng) {
                        const historyLog = [{
                            date: new Date().toISOString(),
                            user: currentUser?.username || 'Sistema (Auto)',
                            method: 'GEOCODE_BATCH',
                            new_geo: { lat, lng },
                            message: 'Geocodificação em lote inicial bem-sucedida'
                        }];

                        const { error } = await supabase
                            .from('clients')
                            .update({
                                latitude: lat,
                                longitude: lng,
                                address_edit_history: historyLog
                            })
                            .eq('id', client.id);

                        if (!error) {
                            setAllClients(prev => prev.map(c => 
                                c.id === client.id 
                                    ? { ...c, lat, lng, hasGeo: true } 
                                    : c
                            ));
                            console.log(`[Batch Geocode] Cliente "${client.name}" geolocalizado e atualizado no banco!`);
                        }
                    }
                } catch (e) {
                    console.error("Batch Geocode error:", e);
                }

                await new Promise(resolve => setTimeout(resolve, 1100));
            }
            isGeocodingBatchRunning.current = false;
        };

        geocodeBatch();

        return () => {
            active = false;
            isGeocodingBatchRunning.current = false;
        };
    }, [showAllClientsOnMap]);

    // Route Templates and Task Integration States
    const [savedRoutes, setSavedRoutes] = useState([]);
    const [savedRoutesLoading, setSavedRoutesLoading] = useState(false);
    const [showSaveRouteModal, setShowSaveRouteModal] = useState(false);
    const [showTemplatesModal, setShowTemplatesModal] = useState(false);
    const [newRouteName, setNewRouteName] = useState('');
    const [newRouteNotes, setNewRouteNotes] = useState('');
    const [savingRoute, setSavingRoute] = useState(false);

    // Fetch saved routes templates
    const fetchSavedRoutes = async () => {
        if (!currentUser?.id) return;
        try {
            setSavedRoutesLoading(true);
            const { data, error } = await supabase
                .from('support_routes')
                .select('*')
                .eq('user_id', currentUser.id)
                .order('created_at', { ascending: false });
            if (error) throw error;
            setSavedRoutes(data || []);
        } catch (err) {
            console.error("Error fetching saved routes:", err);
        } finally {
            setSavedRoutesLoading(false);
        }
    };

    // Save current route as template
    const handleSaveRoute = async () => {
        if (!newRouteName.trim()) {
            notifyError("Validação", "Por favor, informe um nome para o modelo de rota.");
            return;
        }
        const activeStops = destinations.filter(d => d !== null);
        if (activeStops.length === 0) {
            notifyError("Validação", "Adicione pelo menos um cliente válido antes de salvar a rota.");
            return;
        }

        setSavingRoute(true);
        try {
            const payload = {
                user_id: currentUser?.id,
                name: newRouteName.trim(),
                start_point: startPoint,
                destinations: activeStops,
                notes: newRouteNotes.trim(),
                distance_km: routeDistance || 0,
                duration_min: routeDuration || 0
            };

            const { error } = await supabase
                .from('support_routes')
                .insert([payload]);

            if (error) throw error;

            notifySuccess("Rota padrão salva com sucesso!", "Você poderá recarregar este trajeto a qualquer momento.");
            setShowSaveRouteModal(false);
            setNewRouteName('');
            setNewRouteNotes('');
            fetchSavedRoutes();
        } catch (err) {
            console.error("Error saving route:", err);
            notifyError("Erro ao salvar rota", err.message);
        } finally {
            setSavingRoute(false);
        }
    };

    // Delete saved route template
    const handleDeleteRoute = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Deseja realmente excluir este modelo de rota?")) return;
        try {
            const { error } = await supabase
                .from('support_routes')
                .delete()
                .eq('id', id);
            if (error) throw error;
            notifySuccess("Modelo de rota excluído.");
            fetchSavedRoutes();
        } catch (err) {
            console.error("Error deleting route:", err);
            notifyError("Erro ao excluir", err.message);
        }
    };

    // Load saved route template
    const handleLoadRoute = (route) => {
        if (route.start_point) {
            if (route.start_point.name === 'Minha Posição Atual (GPS)') {
                setStartType('GPS');
            } else {
                setStartType('SEDE');
                setSede(route.start_point);
            }
        }

        const loadedStops = route.destinations || [];
        setDestinations(loadedStops.length > 0 ? loadedStops : [null]);
        setSearchQueries(loadedStops.length > 0 ? loadedStops.map(s => s.name) : ['']);
        notifySuccess(`Rota "${route.name}" carregada!`);
    };

    // Check if client has active task assigned to technician
    const hasActiveTask = (dest) => {
        if (!dest || !tasks) return false;
        return tasks.some(t => 
            t.client && 
            t.client.trim().toLowerCase() === dest.name.trim().toLowerCase() &&
            t.user_id === currentUser?.id &&
            t.status !== 'CONCLUIDO' &&
            t.status !== 'CANCELADO'
        );
    };

    // Trigger individual OS creation for a stop
    const handleCreateTaskFromStop = (dest) => {
        if (!dest) return;
        if (onNewTask) {
            onNewTask(dest.name, {
                description: `VISITA PROGRAMADA VIA PLANEJADOR DE ROTA - UNIDADE: ${dest.location || 'GERAL'}`,
                client: dest.name,
                location: dest.location || '',
                geo: { lat: dest.lat, lng: dest.lng }
            });
        } else {
            notifyError("Ação não disponível", "Não foi possível abrir o criador de tarefas.");
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                setActiveSearchIndex(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Dynamic Destinations State
    // An array of client objects or null (representing an empty stop field)
    const [destinations, setDestinations] = useState([null]);
    
    // Search Autocomplete States per input index
    const [activeSearchIndex, setActiveSearchIndex] = useState(null);
    const [searchQueries, setSearchQueries] = useState(['']);

    // OSRM Computed Route State
    const [routeGeometry, setRouteGeometry] = useState([]);
    const [routeDistance, setRouteDistance] = useState(0); // km
    const [routeDuration, setRouteDuration] = useState(0); // minutes
    const [routeLoading, setRouteLoading] = useState(false);

    // Support Points Filters
    const [showHotels, setShowHotels] = useState(true);
    const [showRestaurants, setShowRestaurants] = useState(true);
    const [showGasStations, setShowGasStations] = useState(true);
    const [radiusFilter, setRadiusFilter] = useState('ALL'); // 'ALL', '5', '15', '50'

    // Get live GPS position
    const handleGetGPSLocation = () => {
        setGpsLoading(true);
        if (!navigator.geolocation) {
            notifyError('GPS não suportado', 'Seu navegador não oferece suporte a geolocalização.');
            setGpsLoading(false);
            setStartType('SEDE');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGpsCoords({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    name: 'Minha Posição Atual (GPS)'
                });
                setGpsLoading(false);
                notifySuccess('GPS localizado!', 'Coordenadas carregadas como partida.');
            },
            (err) => {
                console.error("GPS error:", err);
                notifyError('Erro de GPS', 'Não foi possível ler as coordenadas. Verifique as permissões.');
                setGpsLoading(false);
                setStartType('SEDE');
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    useEffect(() => {
        if (startType === 'GPS' && !gpsCoords) {
            handleGetGPSLocation();
        }
    }, [startType]);

    // Fetch clients and places
    const loadData = async () => {
        try {
            setLoading(true);
            
            // 1. Fetch support places
            const { data: placesData, error: placesError } = await supabase
                .from('support_places')
                .select('*')
                .order('name');
            if (placesError) throw placesError;
            setSupportPlaces(placesData || []);

            // 2. Fetch all registered clients from 'clients' table
            const { data: clientsTableData, error: clientsTableError } = await supabase
                .from('clients')
                .select('*')
                .order('name');
            if (clientsTableError) throw clientsTableError;

            // 3. Fetch clients with coordinates from tasks table
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select('id, client, geo, location')
                .not('geo', 'is', null);
            if (tasksError) throw tasksError;

            // 4. Fetch COMPANY_SEDE config to sync sede across devices
            const { data: configData, error: configError } = await supabase
                .from('app_configs')
                .select('config_value')
                .eq('config_key', 'COMPANY_SEDE')
                .single();
            
            if (!configError && configData?.config_value) {
                try {
                    const parsed = JSON.parse(configData.config_value);
                    if (parsed && parsed.lat && parsed.lng) {
                        setSede(parsed);
                        localStorage.setItem('assistec_custom_sede', configData.config_value);
                    }
                } catch (e) {
                    console.error("Error parsing COMPANY_SEDE", e);
                }
            }

            // Build an object of client normalized name -> valid coordinates & details from tasks
            const clientGeoMap = {};
            (tasksData || []).forEach(t => {
                if (t.client && t.geo?.lat && t.geo?.lng) {
                    const clientKey = t.client.trim().toLowerCase();
                    clientGeoMap[clientKey] = {
                        lat: Number(t.geo.lat),
                        lng: Number(t.geo.lng),
                        location: (t.location || '').trim()
                    };
                }
            });

            const uniqueClients = [];
            const seenKeys = new Set();

            // First, process all clients from the registered 'clients' table
            (clientsTableData || []).forEach(c => {
                if (c.name) {
                    const clientName = c.name.trim();
                    const clientKey = clientName.toLowerCase();
                    
                    // Look up coordinates from geo map
                    const geoInfo = clientGeoMap[clientKey];
                    
                    const lat = (c.latitude !== null && c.latitude !== undefined) ? Number(c.latitude) : (geoInfo ? geoInfo.lat : null);
                    const lng = (c.longitude !== null && c.longitude !== undefined) ? Number(c.longitude) : (geoInfo ? geoInfo.lng : null);
                    
                    // Compile location label
                    let locationStr = '';
                    if (c.city) {
                        locationStr = c.state ? `${c.city.trim()} - ${c.state.trim()}` : c.city.trim();
                    } else if (geoInfo && geoInfo.location) {
                        locationStr = geoInfo.location;
                    }

                    seenKeys.add(clientKey);
                    uniqueClients.push({
                        id: c.id,
                        name: clientName,
                        lat: lat,
                        lng: lng,
                        location: locationStr.toUpperCase(),
                        address: c.address || '',
                        street: c.street || '',
                        number: c.number || '',
                        neighborhood: c.neighborhood || '',
                        city: c.city || '',
                        state: c.state || '',
                        main_phone: c.main_phone || c.phone || '',
                        hasGeo: !!(lat && lng)
                    });
                }
            });

            // Second, add any extra clients from the 'tasks' table that are NOT in the 'clients' table
            (tasksData || []).forEach(t => {
                if (t.client && t.geo?.lat && t.geo?.lng) {
                    const clientName = t.client.trim();
                    const clientKey = clientName.toLowerCase();
                    if (!seenKeys.has(clientKey)) {
                        seenKeys.add(clientKey);
                        uniqueClients.push({
                            id: t.id,
                            name: clientName,
                            lat: Number(t.geo.lat),
                            lng: Number(t.geo.lng),
                            location: (t.location || '').trim().toUpperCase(),
                            address: '',
                            hasGeo: true
                        });
                    }
                }
            });

            // Sort clients alpha-numerically (using standard compare)
            uniqueClients.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
            setAllClients(uniqueClients);

        } catch (err) {
            console.error("Error loading route data:", err);
            notifyError("Erro ao carregar dados", err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSedeAddress = async (e) => {
        if (e) e.preventDefault();
        if (!sedeSearchQuery.trim()) return;
        setSedeSearching(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(sedeSearchQuery)}&limit=5&countrycodes=br`,
                { headers: { 'User-Agent': 'AssistecApp/1.0' } }
            );
            const data = await res.json();
            setSedeSearchResults(data || []);
        } catch (err) {
            console.error('Sede address search error:', err);
            notifyError('Erro de busca', 'Não foi possível conectar ao serviço de busca.');
        } finally {
            setSedeSearching(false);
        }
    };

    const handleSelectSedeSuggestion = (item) => {
        setTempSede({
            name: tempSede.name || 'Sede (Empresa)',
            address: item.display_name,
            lat: Number(item.lat),
            lng: Number(item.lon)
        });
        setSedeSearchResults([]);
        setSedeSearchQuery('');
    };

    const handleGetSedeGPSLocation = () => {
        setSedeGpsLoading(true);
        if (!navigator.geolocation) {
            notifyError('GPS não suportado', 'Seu navegador não oferece suporte a geolocalização.');
            setSedeGpsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                
                // Set temp details immediately
                setTempSede(prev => ({
                    ...prev,
                    lat: lat,
                    lng: lng,
                    address: prev.address || 'Carregando endereço do GPS...'
                }));

                notifySuccess('GPS localizado!', 'Coordenadas capturadas. Tentando obter endereço...');

                // Try reverse geocoding to fill address field
                try {
                    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
                    const res = await fetch(reverseUrl, { headers: { 'User-Agent': 'AssistecApp/1.0' } });
                    const data = await res.json();
                    if (data && data.display_name) {
                        setTempSede(prev => ({
                            ...prev,
                            address: data.display_name
                        }));
                    } else {
                        setTempSede(prev => ({
                            ...prev,
                            address: `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
                        }));
                    }
                } catch (e) {
                    console.error("Reverse geocoding error:", e);
                    setTempSede(prev => ({
                        ...prev,
                        address: `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
                    }));
                } finally {
                    setSedeGpsLoading(false);
                }
            },
            (err) => {
                console.error("GPS Sede error:", err);
                notifyError('Erro de GPS', 'Não foi possível capturar as coordenadas. Verifique as permissões de localização.');
                setSedeGpsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (currentUser?.id) {
            fetchSavedRoutes();
        }
    }, [currentUser?.id]);

    // Get Active Start coordinates
    const startPoint = useMemo(() => {
        if (startType === 'SEDE') return sede;
        if (startType === 'GPS' && gpsCoords) return gpsCoords;
        return sede; // fallback
    }, [startType, gpsCoords, sede]);

    // Compute route using OSRM API
    const computeRoute = async () => {
        // Collect all valid stop points in order
        const validStops = destinations.filter(d => d !== null && d.lat !== null && d.lng !== null);
        
        if (validStops.length === 0) {
            setRouteGeometry([]);
            setRouteDistance(0);
            setRouteDuration(0);
            return;
        }

        setRouteLoading(true);
        try {
            const allPoints = [startPoint, ...validStops];
            const coordsStr = allPoints.map(pt => `${pt.lng},${pt.lat}`).join(';');
            const url = `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.code === 'Ok' && data.routes && data.routes[0]) {
                const route = data.routes[0];
                const distanceKm = route.distance / 1000;
                const durationMin = route.duration / 60;
                
                // Convert [lng, lat] to Leaflet-compatible [lat, lng]
                const polylineCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
                
                setRouteGeometry(polylineCoords);
                setRouteDistance(distanceKm);
                setRouteDuration(durationMin);
            } else {
                console.warn("OSRM Route was not computed successfully", data);
                // Fallback to straight lines connecting the stops if routing fails
                const straightLineCoords = allPoints.map(pt => [pt.lat, pt.lng]);
                setRouteGeometry(straightLineCoords);
                setRouteDistance(0);
                setRouteDuration(0);
            }
        } catch (err) {
            console.error("OSRM call failed, falling back to straight lines:", err);
            const allPoints = [startPoint, ...destinations.filter(d => d !== null)];
            const straightLineCoords = allPoints.map(pt => [pt.lat, pt.lng]);
            setRouteGeometry(straightLineCoords);
            setRouteDistance(0);
            setRouteDuration(0);
        } finally {
            setRouteLoading(false);
        }
    };

    // Trigger route computation when stops or starting point changes
    useEffect(() => {
        computeRoute();
    }, [startPoint, destinations]);



    // Remove a destination stop field
    const removeDestinationField = (index) => {
        const newDestinations = destinations.filter((_, idx) => idx !== index);
        const newSearchQueries = searchQueries.filter((_, idx) => idx !== index);

        // Ensure we always have at least one stop field
        if (newDestinations.length === 0) {
            setDestinations([null]);
            setSearchQueries(['']);
        } else {
            setDestinations(newDestinations);
            setSearchQueries(newSearchQueries);
        }
    };

    // Add a new empty destination stop field
    const addDestinationField = () => {
        setDestinations(prev => [...prev, null]);
        setSearchQueries(prev => [...prev, '']);
    };

    // Select client from autocomplete dropdown
    const handleSelectClient = async (client, index) => {
        // Create copies of state arrays
        const newDestinations = [...destinations];
        const newSearchQueries = [...searchQueries];
        
        // If client doesn't have coordinates, attempt on-the-fly geocoding
        if (!client.lat || !client.lng) {
            newSearchQueries[index] = client.name;
            setSearchQueries(newSearchQueries);
            
            // Set a temporary "Geocoding..." state for this stop
            newDestinations[index] = { 
                ...client, 
                name: `${client.name} (Obtendo GPS...)`, 
                geocoding: true 
            };
            setDestinations(newDestinations);
            
            try {
                // Try geocoding by full compiled address
                const queryStr = client.address || `${client.street || ''}, ${client.number || ''} ${client.neighborhood || ''} ${client.city || ''} ${client.state || ''}`;
                console.log(`Geocodificando cliente: "${client.name}" com busca: "${queryStr}"`);
                
                let lat = null;
                let lng = null;
                
                if (queryStr.trim()) {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1&countrycodes=br`,
                        { headers: { 'User-Agent': 'AssistecApp/1.0' } }
                    );
                    const data = await res.json();
                    
                    if (data && data[0]) {
                        lat = Number(data[0].lat);
                        lng = Number(data[0].lon);
                    }
                }
                
                // Fallback: If full address geocoding fails, try geocoding by City + State
                if ((!lat || !lng) && client.city) {
                    console.log(`Falha na busca detalhada, tentando geocodificar por Cidade/UF: "${client.city}, ${client.state || ''}"`);
                    const fallbackRes = await fetch(
                        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${client.city}, ${client.state || ''}`)}&limit=1&countrycodes=br`,
                        { headers: { 'User-Agent': 'AssistecApp/1.0' } }
                    );
                    const fallbackData = await fallbackRes.json();
                    if (fallbackData && fallbackData[0]) {
                        lat = Number(fallbackData[0].lat);
                        lng = Number(fallbackData[0].lon);
                    }
                }
                
                if (lat && lng) {
                    const geocodedClient = {
                        ...client,
                        lat: lat,
                        lng: lng,
                        name: client.name,
                        geocoded: true
                    };
                    
                    // Update destinations state with found coordinates
                    const updatedDestinations = [...destinations];
                    updatedDestinations[index] = geocodedClient;
                    setDestinations(updatedDestinations);
                    
                    notifySuccess("Endereço localizado!", `Coordenadas obtidas com sucesso para "${client.name}".`);
                } else {
                    throw new Error("Endereço não pôde ser geolocalizado pelo Nominatim.");
                }
            } catch (err) {
                console.warn("Geocoding error:", err);
                notifyError("Erro de Localização", `Não foi possível encontrar as coordenadas automáticas para "${client.name}". Ponto padrão será utilizado provisoriamente.`);
                
                // Fallback to Sede coordinates so it doesn't break routing completely
                const failedClient = {
                    ...client,
                    lat: startPoint.lat,
                    lng: startPoint.lng,
                    name: `${client.name} (Sem GPS - Ponto de Partida Usado)`,
                    noGeoFound: true
                };
                const updatedDestinations = [...destinations];
                updatedDestinations[index] = failedClient;
                setDestinations(updatedDestinations);
            }
        } else {
            // Client already has coordinates
            newDestinations[index] = client;
            setDestinations(newDestinations);
            
            newSearchQueries[index] = client.name;
            setSearchQueries(newSearchQueries);
        }
        
        setActiveSearchIndex(null);
    };

    const handleAddClientToRoute = (client) => {
        const emptyIdx = destinations.findIndex(d => d === null);
        const indexToUse = emptyIdx !== -1 ? emptyIdx : destinations.length;
        
        const newDestinations = [...destinations];
        const newSearchQueries = [...searchQueries];
        
        newDestinations[indexToUse] = client;
        newSearchQueries[indexToUse] = client.name;
        
        setDestinations(newDestinations);
        setSearchQueries(newSearchQueries);
        
        if (notifySuccess) {
            notifySuccess("Destino Adicionado", `"${client.name}" adicionado ao roteiro.`);
        }
    };

    // Generate dynamic autocomplete options for a specific query
    const getAutocompleteOptions = (query) => {
        if (!query.trim()) return [];
        const cleanQuery = query.toLowerCase().trim();
        return allClients.filter(c => {
            const matchesState = !selectedState || c.state?.trim().toUpperCase() === selectedState;
            const matchesSearch = c.name.toLowerCase().includes(cleanQuery) || 
                                 (c.location && c.location.toLowerCase().includes(cleanQuery));
            return matchesState && matchesSearch;
        }).slice(0, 10);
    };

    // Clean address format for WhatsApp export
    const formatTimeStr = (totalMinutes) => {
        if (totalMinutes <= 0) return '0 min';
        const hours = Math.floor(totalMinutes / 60);
        const mins = Math.round(totalMinutes % 60);
        if (hours > 0) {
            return `${hours}h ${mins.toString().padStart(2, '0')}m`;
        }
        return `${mins} min`;
    };

    // Share itinerary text to WhatsApp or Clipboard
    const getItineraryText = () => {
        const activeStops = destinations.filter(d => d !== null);
        let txt = `*ROTEIRO DE VIAGEM - ASSISTEC*\n`;
        txt += `Partida: ${startPoint.name}\n`;
        activeStops.forEach((stop, idx) => {
            txt += `Parada ${idx + 1}: ${stop.name}\n`;
        });
        if (routeDistance > 0) {
            txt += `\n*Distância Total:* ${routeDistance.toFixed(1)} km`;
            txt += `\n*Tempo Estimado de Direção:* ${formatTimeStr(routeDuration)}`;
        }
        return txt;
    };

    const handleCopyItinerary = () => {
        const text = getItineraryText();
        navigator.clipboard.writeText(text);
        notifySuccess('Roteiro copiado!', 'Texto formatado na área de transferência.');
    };

    // Deep link multi-stop Google Maps URL
    const handleOpenGoogleMaps = () => {
        const activeStops = destinations.filter(d => d !== null && d.lat !== null && d.lng !== null);
        const allPoints = [startPoint, ...activeStops];
        const coordsStr = allPoints.map(pt => `${pt.lat},${pt.lng}`).join('/');
        const url = `https://www.google.com/maps/dir/${coordsStr}`;
        window.open(url, '_blank');
    };

    // Smart filter of support places based on proximity to route polyline
    const filteredSupportPlaces = useMemo(() => {
        return supportPlaces.filter(place => {
            // Apply category show/hide first
            if (place.type === 'hotel' && !showHotels) return false;
            if (place.type === 'restaurant' && !showRestaurants) return false;
            if (place.type === 'fuel' && !showGasStations) return false;
            if (place.type === 'other') return false; // Hide other by default

            if (radiusFilter === 'ALL' || routeGeometry.length === 0) return true;

            const radiusLimit = Number(radiusFilter);
            
            // Check distance to closest route node
            return routeGeometry.some(node => {
                const dist = getHaversineDistance(place.latitude, place.longitude, node[0], node[1]);
                return dist <= radiusLimit;
            });
        });
    }, [supportPlaces, showHotels, showRestaurants, showGasStations, radiusFilter, routeGeometry]);

    // Active pins bounds for Leaflet map recentering
    const mapBounds = useMemo(() => {
        const bounds = [[startPoint.lat, startPoint.lng]];
        destinations.filter(d => d !== null && d.lat !== null && d.lng !== null).forEach(stop => {
            bounds.push([stop.lat, stop.lng]);
        });
        return bounds;
    }, [startPoint, destinations]);

    return (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-slate-50 relative overflow-hidden">
            <style>{`
                .client-reference-marker {
                    filter: brightness(1.28) contrast(0.88);
                    opacity: 0.9;
                }
            `}</style>
            
            {/* Mobile Tab Swapper */}
            {isMobile && (
                <div className="flex bg-white border-b border-slate-200 shrink-0 z-20">
                    <button
                        onClick={() => setMobileTab('ITINERARY')}
                        className={`flex-1 py-3 text-xs font-black flex items-center justify-center gap-2 border-b-2 transition-all ${
                            mobileTab === 'ITINERARY'
                                ? 'border-brand-600 text-brand-600 bg-brand-50/20'
                                : 'border-transparent text-slate-500'
                        }`}
                    >
                        <List size={14} />
                        <span>Itinerário</span>
                    </button>
                    <button
                        onClick={() => setMobileTab('MAP')}
                        className={`flex-1 py-3 text-xs font-black flex items-center justify-center gap-2 border-b-2 transition-all ${
                            mobileTab === 'MAP'
                                ? 'border-brand-600 text-brand-600 bg-brand-50/20'
                                : 'border-transparent text-slate-500'
                        }`}
                    >
                        <Map size={14} />
                        <span>Visualizar Rota</span>
                    </button>
                </div>
            )}

            {/* LEFT PANEL: Itinerary Controls */}
            <div 
                ref={panelRef}
                className={`w-full bg-white border-r border-slate-200 flex flex-col min-h-0 shrink-0 z-10 transition-all duration-300 ease-in-out ${
                    isSidebarCollapsed 
                        ? 'md:w-0 md:opacity-0 md:pointer-events-none md:border-r-0 overflow-hidden' 
                        : 'md:w-[460px]'
                } ${
                    isMobile && mobileTab !== 'ITINERARY' ? 'hidden' : 'flex'
                }`}
            >
                
                {/* Panel Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                        <RouteIcon className="text-brand-600" size={18} />
                        <span>Montar Nova Rota</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Defina a partida, adicione os clientes e visualize o percurso
                    </p>
                </div>

                {/* Itinerary Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    
                    {/* MODELOS SALVOS (ROUTE TEMPLATES) */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-2xl hover:bg-slate-100/50 transition-colors shadow-sm select-none shrink-0 mb-1">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="bg-brand-50 text-brand-600 p-2 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                                <Star size={16} className="fill-brand-600 animate-pulse text-amber-500 fill-amber-500" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[11px] font-black text-slate-700 tracking-tight leading-tight">
                                    Modelos Regionais
                                </div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                                    {savedRoutes.length > 0 ? `${savedRoutes.length} templates salvos` : 'Nenhum template salvo'}
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowTemplatesModal(true)}
                            className="px-3 py-1.5 bg-white hover:bg-brand-600 text-slate-600 hover:text-white border border-slate-200 hover:border-brand-600 text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                        >
                            Gerenciar
                        </button>
                    </div>

                    {/* START POINT SELECTOR */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            1. Ponto de Partida
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setStartType('SEDE')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    startType === 'SEDE'
                                        ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <Building2 size={13} />
                                <span>Sede (Empresa)</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setStartType('GPS')}
                                className={`flex-1 py-2 px-3 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    startType === 'GPS'
                                        ? 'bg-brand-50 border-brand-300 text-brand-700 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <Compass size={13} className={gpsLoading ? 'animate-spin' : ''} />
                                <span>Meu GPS</span>
                            </button>
                        </div>
                        
                        {/* Partida Coords info badge */}
                        <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-[10px] text-slate-500 font-medium flex items-center justify-between gap-1.5 shadow-sm">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <MapPin size={11} className="text-slate-400 shrink-0" />
                                <span className="truncate text-slate-650 font-bold">
                                    {startType === 'SEDE' 
                                        ? `${sede.name}: ${sede.address || 'Sem endereço configurado'}` 
                                        : (gpsCoords ? 'GPS: Coordenadas Capturadas' : 'Localizando GPS...')}
                                </span>
                            </div>
                            {startType === 'SEDE' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTempSede({
                                            name: sede.name,
                                            address: sede.address || '',
                                            lat: sede.lat,
                                            lng: sede.lng
                                        });
                                        setShowSedeModal(true);
                                    }}
                                    className="text-indigo-600 hover:text-indigo-750 font-black cursor-pointer uppercase tracking-wider text-[9px] shrink-0 active:scale-95 select-none"
                                >
                                    Editar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* DYNAMIC DESTINATIONS LIST */}
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            2. Sequência de Clientes
                        </label>
                        
                        {/* State & Map Vis Filter Selector */}
                        <div className="flex flex-col gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3 select-none mb-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Visualizar Clientes:</span>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showAllClientsOnMap}
                                        onChange={(e) => setShowAllClientsOnMap(e.target.checked)}
                                        className="rounded text-brand-600 focus:ring-brand-500 border-slate-350 w-3 h-3 cursor-pointer accent-brand-600"
                                    />
                                    <span className="text-[10px] font-bold text-slate-700">Ver Todos no Mapa</span>
                                </label>
                            </div>
                            
                            {showAllClientsOnMap && (
                                <div className="flex items-center gap-2 border-t border-slate-150 pt-2 animate-in fade-in duration-100">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider">Filtrar por Estado:</span>
                                    <select
                                        value={selectedState}
                                        onChange={(e) => {
                                            setSelectedState(e.target.value);
                                        }}
                                        className="flex-1 bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
                                    >
                                        <option value="">TODOS</option>
                                        {availableStates.map(st => (
                                            <option key={st} value={st}>{st}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 relative">
                            {destinations.map((dest, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex w-full gap-1.5 items-start relative p-1 rounded-xl transition-all duration-200 ${
                                        draggedIndex === idx ? 'opacity-30 border border-dashed border-brand-400 bg-brand-50/10 scale-95' : ''
                                    }`}
                                >
                                    {/* Draggable Number Circle indicator */}
                                    <div 
                                        draggable={true}
                                        onDragStart={(e) => {
                                            setDraggedIndex(idx);
                                            e.dataTransfer.effectAllowed = 'move';
                                        }}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDragEnter={() => {
                                            if (draggedIndex !== null && draggedIndex !== idx) {
                                                const newDestinations = [...destinations];
                                                const tempDest = newDestinations[draggedIndex];
                                                newDestinations[draggedIndex] = newDestinations[idx];
                                                newDestinations[idx] = tempDest;
                                                setDestinations(newDestinations);

                                                const newQueries = [...searchQueries];
                                                const tempQuery = newQueries[draggedIndex];
                                                newQueries[draggedIndex] = newQueries[idx];
                                                newQueries[idx] = tempQuery;
                                                setSearchQueries(newQueries);

                                                setDraggedIndex(idx);
                                            }
                                        }}
                                        onDragEnd={() => setDraggedIndex(null)}
                                        className={`w-5 h-5 rounded-full text-brand-700 font-black text-[9px] flex items-center justify-center shrink-0 mt-2 cursor-grab active:cursor-grabbing transition-all select-none shadow-sm border ${
                                            draggedIndex === idx 
                                                ? 'bg-brand-600 text-white border-brand-700 animate-pulse scale-110' 
                                                : 'bg-brand-100 border-brand-200 hover:bg-brand-200'
                                        }`}
                                        title="Arraste para reordenar"
                                    >
                                        {idx + 1}
                                    </div>

                                    {/* Autocomplete Input Container */}
                                    <div className="flex-grow min-w-0 relative">
                                        <input
                                            type="text"
                                            placeholder="Buscar cliente..."
                                            value={searchQueries[idx]}
                                            onChange={(e) => {
                                                const newQueries = [...searchQueries];
                                                newQueries[idx] = e.target.value;
                                                setSearchQueries(newQueries);
                                                setActiveSearchIndex(idx);

                                                // If query is cleared, reset destination stop
                                                if (!e.target.value.trim()) {
                                                    const newDests = [...destinations];
                                                    newDests[idx] = null;
                                                    setDestinations(newDests);
                                                }
                                            }}
                                            onFocus={() => setActiveSearchIndex(idx)}
                                            className={`w-full pl-3 pr-7 py-2 border border-slate-200 rounded-lg outline-none focus:border-brand-500 bg-slate-50/50 text-slate-700 shadow-sm transition-all ${
                                                dest ? 'text-[9px] font-black tracking-tighter uppercase leading-tight' : 'text-xs font-bold'
                                            }`}
                                        />
                                        
                                        {/* Checked marker when valid client selected */}
                                        {dest && (
                                            <Check size={12} className="absolute right-2.5 top-2.5 text-emerald-500 font-black" />
                                        )}

                                        {/* Autocomplete dropdown options */}
                                        {activeSearchIndex === idx && searchQueries[idx] && (
                                            <div className="absolute left-0 w-[310px] md:w-[350px] mt-1 bg-white border border-slate-250 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto animate-in fade-in duration-100">
                                                {getAutocompleteOptions(searchQueries[idx]).length > 0 ? (
                                                    getAutocompleteOptions(searchQueries[idx]).map(client => (
                                                        <button
                                                            key={`${client.id}_${client.lat}_${client.lng}`}
                                                            type="button"
                                                            onClick={() => handleSelectClient(client, idx)}
                                                            className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 transition-all flex items-start gap-2.5 group"
                                                        >
                                                            <MapPin size={13} className="text-slate-400 mt-0.5 group-hover:text-indigo-600 transition-colors shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-extrabold text-slate-800 leading-snug whitespace-normal break-words uppercase">
                                                                    {client.name}
                                                                </div>
                                                                {client.location && (
                                                                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider mt-0.5 leading-tight whitespace-normal break-words">
                                                                        {client.location}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="p-3 text-[10px] text-slate-400 font-bold text-center">
                                                        Nenhum cliente georreferenciado encontrado
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Unit address helper badge */}
                                        {dest && dest.location && (
                                            <div className="mt-1 px-2 py-1 bg-indigo-50/50 border border-indigo-100 rounded-md text-[9px] text-indigo-700 font-bold flex items-center gap-1 shadow-sm">
                                                <span className="w-1 h-1 rounded-full bg-indigo-500 shrink-0" />
                                                <span className="truncate select-none uppercase tracking-wide">{dest.location}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons (Schedule OS & Delete X) */}
                                    <div className="shrink-0 mt-1 flex gap-0.5 items-center">
                                        {dest && (
                                            <button
                                                type="button"
                                                onClick={() => handleCreateTaskFromStop(dest)}
                                                className={`p-1.5 rounded cursor-pointer transition-all flex items-center justify-center ${
                                                    hasActiveTask(dest)
                                                        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 scale-105'
                                                        : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50'
                                                }`}
                                                title={hasActiveTask(dest) ? "Tarefa já Agendada para este Cliente" : "Agendar OS para esta Parada"}
                                            >
                                                {hasActiveTask(dest) ? (
                                                    <CheckCircle2 size={12} className="text-emerald-500 animate-in zoom-in duration-200" />
                                                ) : (
                                                    <Calendar size={12} />
                                                )}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeDestinationField(idx)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50 cursor-pointer transition-colors"
                                            title="Remover parada"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {/* Add stop button */}
                        <button
                            type="button"
                            onClick={addDestinationField}
                            className="w-full py-1.5 border border-dashed border-slate-200 rounded-lg text-slate-500 hover:text-brand-600 hover:border-brand-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all bg-slate-50/20 hover:bg-white cursor-pointer active:scale-98"
                        >
                            <Plus size={13} />
                            <span>Adicionar Destino</span>
                        </button>
                    </div>

                    {/* DYNAMIC PROXIMITY RADIUS FILTER CONTROL */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            3. Raio de Filtro das Paradas
                        </label>
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2.5">
                            
                            {/* Switches */}
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowHotels(!showHotels)}
                                    className={`py-1 px-2 border rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                        showHotels 
                                            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-400'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                    <span>Hotéis</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowRestaurants(!showRestaurants)}
                                    className={`py-1 px-2 border rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                        showRestaurants 
                                            ? 'bg-red-50 border-red-200 text-red-700 shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-400'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    <span>Rests.</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowGasStations(!showGasStations)}
                                    className={`py-1 px-2 border rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                        showGasStations 
                                            ? 'bg-green-50 border-green-200 text-green-700 shadow-sm'
                                            : 'bg-white border-slate-200 text-slate-400'
                                    }`}
                                >
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    <span>Postos</span>
                                </button>
                            </div>

                            {/* Radius selector pills */}
                            <div className="space-y-1">
                                <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Distância dos Apoios à Rodovia:</span>
                                <div className="flex border border-slate-200 rounded-lg overflow-hidden bg-white text-[10px] font-extrabold text-slate-600">
                                    {[
                                        { id: 'ALL', label: 'Todos' },
                                        { id: '5', label: '5 km' },
                                        { id: '15', label: '15 km' },
                                        { id: '50', label: '50 km' }
                                    ].map(pill => (
                                        <button
                                            key={pill.id}
                                            type="button"
                                            onClick={() => setRadiusFilter(pill.id)}
                                            className={`flex-1 py-1.5 text-center transition-colors cursor-pointer border-r last:border-r-0 border-slate-100 ${
                                                radiusFilter === pill.id
                                                    ? 'bg-slate-200 text-slate-800 font-black'
                                                    : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            {pill.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TRIP COMPUTED STATISTICS PANEL & EXPORT ACTIONS */}
                {destinations.some(d => d !== null) && (
                    <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
                        {/* Calculated route specs */}
                        <div className="flex gap-2 justify-between items-center text-xs text-slate-700">
                            <div>
                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Distância de Rodagem</span>
                                <span className="text-sm font-black text-slate-800 leading-none mt-1 block">
                                    {routeDistance > 0 ? `${routeDistance.toFixed(1)} km` : 'Calculando...'}
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Tempo de Direção Est.</span>
                                <span className="text-sm font-black text-indigo-600 leading-none mt-1 block">
                                    {routeDuration > 0 ? formatTimeStr(routeDuration) : 'Calculando...'}
                                </span>
                            </div>
                        </div>

                        {/* Route warning if straight line fallback */}
                        {routeDistance === 0 && !routeLoading && destinations.some(d => d !== null) && (
                            <div className="bg-amber-50 border border-amber-250 p-2 rounded-lg text-[9px] text-amber-700 font-bold flex items-center gap-1.5">
                                <AlertTriangle size={12} className="shrink-0 text-amber-500" />
                                <span>Exibindo linha reta (sem conexão OSRM).</span>
                            </div>
                        )}

                        {/* Export/Action buttons */}
                        <div className="flex gap-1.5">
                            <button
                                type="button"
                                onClick={() => setShowSaveRouteModal(true)}
                                className="flex-1 py-2 px-2 border border-indigo-150 rounded-lg text-[10px] font-bold text-indigo-700 bg-indigo-50/30 hover:bg-indigo-50/80 transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer active:scale-95"
                                title="Salvar roteiro como modelo padrão"
                            >
                                <Star size={11} className="text-indigo-600 fill-indigo-100" />
                                <span>Salvar Rota</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleCopyItinerary}
                                className="flex-1 py-2 px-2 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-650 bg-white hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                                title="Copiar texto formatado"
                            >
                                <Copy size={11} />
                                <span>Copiar</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleOpenGoogleMaps}
                                className="flex-1 py-2 px-2 rounded-lg text-[10px] font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer active:scale-95"
                                title="Abrir roteiro no Google Maps"
                            >
                                <Navigation size={11} />
                                <span>No GPS</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* RIGHT PANEL: Interactive Leaflet Map */}
            <div className={`flex-1 h-full min-h-0 relative ${
                isMobile && mobileTab !== 'MAP' ? 'hidden' : 'block'
            }`}>
                {loading ? (
                    <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold text-slate-500">Iniciando mapeamento...</span>
                        </div>
                    </div>
                ) : null}

                {routeLoading ? (
                    <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur shadow-lg border p-3 rounded-xl flex items-center gap-2.5 z-[1000] text-xs font-bold text-slate-650 animate-pulse">
                        <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Traçando rota rodoviária real...</span>
                    </div>
                ) : null}

                <MapContainer
                    center={[-23.5505, -46.6333]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    className="custom-map-container"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Active bound recenter helper */}
                    <RecenterMap bounds={mapBounds} />
                    <UpdateMapSize mobileTab={mobileTab} />

                    {/* Marker: Start Point */}
                    <Marker
                        position={[startPoint.lat, startPoint.lng]}
                        icon={startType === 'SEDE' ? icons.start : icons.gps}
                    >
                        <Popup>
                            <div className="text-xs select-none max-w-[200px]">
                                <h4 className="font-black text-slate-800">Partida da Viagem</h4>
                                <p className="font-bold text-slate-700 mt-0.5">{startPoint.name}</p>
                                {startPoint.address && <p className="text-slate-400 text-[10px] mt-0.5 leading-snug">{startPoint.address}</p>}
                            </div>
                        </Popup>
                    </Marker>

                    {/* Markers: Active Destination Client Stops */}
                    {destinations.map((stop, idx) => {
                        if (!stop || stop.lat === null || stop.lng === null) return null;
                        return (
                            <Marker
                                key={`${stop.id}_${idx}`}
                                position={[stop.lat, stop.lng]}
                                icon={getNumberIcon(idx + 1)}
                            >
                                <Popup>
                                    <div className="text-xs select-none max-w-[220px]">
                                        <h4 className="font-black text-indigo-700">Parada #{idx + 1}</h4>
                                        <p className="font-extrabold text-slate-800 mt-0.5">{stop.name}</p>
                                        {stop.location && <p className="text-slate-400 text-[10px] mt-0.5 leading-snug">{stop.location}</p>}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Render Routing Path line */}
                    {routeGeometry.length > 0 && (
                        <Polyline
                            positions={routeGeometry}
                            color="#4f46e5"
                            weight={5}
                            opacity={0.8}
                            dashArray={routeDistance === 0 ? "5, 10" : undefined} // dashed line if straight lines fallback
                        />
                    )}

                    {/* Markers: Reference Clients Pins */}
                    {showAllClientsOnMap && allClients
                        .filter(c => c.lat !== null && c.lng !== null)
                        .filter(c => !selectedState || c.state?.trim().toUpperCase() === selectedState)
                        .map((client) => (
                            <Marker
                                key={`ref_client_${client.id}`}
                                position={[client.lat, client.lng]}
                                icon={icons.client}
                            >
                                <Popup>
                                    <div className="text-xs select-none max-w-[200px] p-1">
                                        <div className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                            <Building2 size={11} className="text-slate-400" />
                                            <span>Cliente de Referência</span>
                                        </div>
                                        <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                                            {client.name}
                                        </h4>
                                        {client.location && (
                                            <p className="text-slate-400 text-[10px] mt-0.5 leading-snug truncate uppercase">
                                                {client.location}
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleAddClientToRoute(client)}
                                            className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-1.5 px-3 rounded-lg text-[10px] transition-all shadow-sm cursor-pointer text-center uppercase tracking-wider"
                                        >
                                            Adicionar ao Roteiro
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                    {/* Markers: Intelligent Support Points (Filtered by Proximity Radius) */}
                    {filteredSupportPlaces.map((place) => (
                        <Marker
                            key={place.id}
                            position={[place.latitude, place.longitude]}
                            icon={icons[place.type] || icons.other}
                        >
                            <Popup>
                                <div className="text-xs select-none max-w-[200px]">
                                    <div className="flex items-center gap-1.5 font-black text-slate-800">
                                        <span className="capitalize">
                                            {place.type === 'hotel' ? '🏨 Hotel' : place.type === 'restaurant' ? '🍽️ Restaurante' : '⛽ Posto'}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-700 mt-1">{place.name}</h4>
                                    {place.address && <p className="text-slate-400 mt-0.5 leading-relaxed text-[10px]">{place.address}</p>}
                                    {place.notes && <p className="text-slate-500 mt-1 italic text-[10px] bg-slate-50 p-1 rounded border">{place.notes}</p>}
                                    
                                    {/* Action Links */}
                                    <div className="flex gap-2 mt-2 pt-1 border-t border-slate-100 font-bold text-[9px] text-slate-500">
                                        <a
                                            href={`https://waze.com/ul?ll=${place.latitude},${place.longitude}&navigate=yes`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-0.5 hover:text-indigo-600 transition-colors"
                                        >
                                            <ExternalLink size={9} />
                                            <span>Abrir Waze</span>
                                        </a>
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-0.5 hover:text-indigo-600 transition-colors"
                                        >
                                            <ExternalLink size={9} />
                                            <span>Google Maps</span>
                                        </a>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {!isMobile && (
                <button
                    onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    className="absolute bottom-6 z-[1000] p-3 rounded-2xl bg-white border border-slate-200 shadow-xl text-slate-600 hover:text-brand-600 hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center backdrop-blur-md bg-white/90 select-none group"
                    style={{
                        left: isSidebarCollapsed ? '16px' : '476px',
                        transition: 'left 300ms cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    title={isSidebarCollapsed ? "Expandir Itinerário" : "Minimizar Itinerário"}
                >
                    {isSidebarCollapsed ? (
                        <div className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider text-slate-800">
                            <Navigation size={14} className="text-brand-600 rotate-90 animate-pulse" />
                            <span>Abrir Menu</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5 font-black text-[10px] uppercase tracking-wider text-slate-800">
                            <X size={14} className="text-slate-500 group-hover:text-red-500 transition-colors" />
                            <span>Ocultar Menu</span>
                        </div>
                    )}
                </button>
            )}

            {showSedeModal && createPortal(
                <div className="fixed inset-0 z-[100005] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        {/* Header */}
                        <div className="p-6 pb-4 flex justify-between items-start border-b border-slate-150">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Configurar Sede</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mt-1">
                                    Defina o endereço e coordenadas padrão da sua empresa
                                </p>
                            </div>
                            <button 
                                onClick={() => {
                                    setShowSedeModal(false);
                                    setSedeSearchResults([]);
                                    setSedeSearchQuery('');
                                }}
                                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-4 max-h-[70vh] custom-scrollbar">
                            {/* Nominatim Search */}
                            <div className="space-y-1.5">
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                    Buscar Endereço Autocomplete
                                </label>
                                <form onSubmit={handleSearchSedeAddress} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            placeholder="Digite rua, cidade ou CEP..."
                                            value={sedeSearchQuery}
                                            onChange={(e) => setSedeSearchQuery(e.target.value)}
                                            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-bold bg-slate-50/50 text-slate-700 shadow-sm"
                                        />
                                        <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={sedeSearching}
                                        className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-black hover:bg-slate-900 transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                                    >
                                        {sedeSearching ? 'Buscando...' : 'Buscar'}
                                    </button>
                                </form>

                                {/* GPS Capture Button */}
                                <button
                                    type="button"
                                    onClick={handleGetSedeGPSLocation}
                                    disabled={sedeGpsLoading}
                                    className="w-full py-2.5 px-3 border border-indigo-150 rounded-xl text-xs font-black text-indigo-700 bg-indigo-50/30 hover:bg-indigo-50/80 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 mt-1.5"
                                >
                                    <Compass size={13} className={`text-indigo-600 ${sedeGpsLoading ? 'animate-spin' : ''}`} />
                                    <span>{sedeGpsLoading ? 'Capturando Coordenadas GPS...' : 'Usar Minha Localização Atual (GPS)'}</span>
                                </button>

                                {/* Suggestions list */}
                                {sedeSearchResults.length > 0 && (
                                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-40 overflow-y-auto shadow-sm">
                                        {sedeSearchResults.map((item, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSelectSedeSuggestion(item)}
                                                className="w-full p-2.5 text-left text-[11px] font-bold text-slate-750 hover:bg-slate-50 transition-colors flex items-start gap-2"
                                            >
                                                <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
                                                <span className="leading-snug">{item.display_name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative flex py-2 items-center shrink-0">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="flex-shrink mx-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Coordenadas e Detalhes</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                            </div>

                            {/* Sede Form */}
                            <div className="space-y-3.5">
                                <div className="space-y-1">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        Nome da Sede
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Sede Matriz"
                                        value={tempSede.name}
                                        onChange={(e) => setTempSede({ ...tempSede, name: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-bold bg-slate-50/50 text-slate-750"
                                        required
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                        Endereço Completo
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Rua, Número, Bairro, Cidade, UF"
                                        value={tempSede.address}
                                        onChange={(e) => setTempSede({ ...tempSede, address: e.target.value })}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-bold bg-slate-50/50 text-slate-750 resize-none"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                            Latitude
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="Ex: -23.5505"
                                            value={tempSede.lat}
                                            onChange={(e) => setTempSede({ ...tempSede, lat: e.target.value === '' ? '' : Number(e.target.value) })}
                                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-bold bg-slate-50/50 text-slate-750"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                            Longitude
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="Ex: -46.6333"
                                            value={tempSede.lng}
                                            onChange={(e) => setTempSede({ ...tempSede, lng: e.target.value === '' ? '' : Number(e.target.value) })}
                                            className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-bold bg-slate-50/50 text-slate-750"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSedeModal(false);
                                    setSedeSearchResults([]);
                                    setSedeSearchQuery('');
                                }}
                                className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!tempSede.name.trim() || !tempSede.address.trim() || tempSede.lat === '' || tempSede.lng === '') {
                                        notifyError('Campos obrigatórios', 'Por favor, preencha todos os campos corretamente.');
                                        return;
                                    }
                                    const savedSede = {
                                        name: tempSede.name.trim(),
                                        address: tempSede.address.trim(),
                                        lat: Number(tempSede.lat),
                                        lng: Number(tempSede.lng)
                                    };
                                    setSede(savedSede);
                                    try {
                                        localStorage.setItem('assistec_custom_sede', JSON.stringify(savedSede));
                                        
                                        // Save to database to sync across devices
                                        const { error } = await supabase.from('app_configs').upsert({
                                            config_key: 'COMPANY_SEDE',
                                            config_value: JSON.stringify(savedSede),
                                            description: 'Coordenadas da Sede da Empresa'
                                        }, { onConflict: 'config_key' });
                                        
                                        if (error) throw error;
                                        
                                        notifySuccess('Sede salva na nuvem!', 'Endereço atualizado em todos os aparelhos.');
                                    } catch (e) {
                                        console.error('Error saving custom sede:', e);
                                        notifyError('Erro ao sincronizar', 'Sede salva localmente, mas não foi enviada para a nuvem.');
                                    }
                                    setShowSedeModal(false);
                                    setSedeSearchResults([]);
                                    setSedeSearchQuery('');
                                }}
                                className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                                Salvar Sede
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {showSaveRouteModal && (
                <div className="fixed inset-0 z-[100005] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        {/* Header */}
                        <div className="p-6 pb-4 flex justify-between items-start border-b border-slate-150">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Salvar Rota Padrão</h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mt-1">
                                    Crie um modelo regional reutilizável
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowSaveRouteModal(false)}
                                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                    Nome do Modelo *
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: Rota Sul - Criciúma/Tubarão"
                                    value={newRouteName}
                                    onChange={(e) => setNewRouteName(e.target.value)}
                                    className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-bold bg-slate-50/50 text-slate-750"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                    Notas da Rota (Paradas boas, hotéis, etc.)
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Digite notas rápidas sobre esta rota, locais recomendados de alimentação, trânsito..."
                                    value={newRouteNotes}
                                    onChange={(e) => setNewRouteNotes(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-bold bg-slate-50/50 text-slate-750 resize-none"
                                />
                            </div>

                            {/* Summary Badge */}
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] text-indigo-700 font-bold space-y-1">
                                <div className="flex justify-between">
                                    <span>Paradas Programadas:</span>
                                    <span>{destinations.filter(d => d !== null).length} clientes</span>
                                </div>
                                {routeDistance > 0 && (
                                    <div className="flex justify-between">
                                        <span>Distância Estimada:</span>
                                        <span>{routeDistance.toFixed(1)} km</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-150 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowSaveRouteModal(false)}
                                className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveRoute}
                                disabled={savingRoute}
                                className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                            >
                                {savingRoute ? 'Salvando...' : 'Salvar Modelo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showTemplatesModal && (
                <div className="fixed inset-0 z-[100005] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
                        {/* Header */}
                        <div className="p-6 pb-4 flex justify-between items-start border-b border-slate-150 shrink-0">
                            <div>
                                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                    <Star className="text-amber-500 fill-amber-500" size={20} />
                                    <span>Modelos de Rota Salvos</span>
                                </h3>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider mt-1">
                                    Gerencie e recarregue seus roteiros de viagens frequentes
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowTemplatesModal(false)}
                                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/50">
                            {savedRoutes.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {savedRoutes.map(route => (
                                        <div 
                                            key={route.id}
                                            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-brand-500 transition-all flex flex-col justify-between"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-start gap-2">
                                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight truncate flex-1">
                                                        {route.name}
                                                    </h4>
                                                    <span className="text-[8px] font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full shrink-0">
                                                        {route.destinations?.length} paradas
                                                    </span>
                                                </div>

                                                {/* Stats */}
                                                <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                    {route.distance_km > 0 && (
                                                        <span>{Number(route.distance_km).toFixed(1)} km</span>
                                                    )}
                                                    {route.duration_min > 0 && (
                                                        <>
                                                            <span>•</span>
                                                            <span>{formatTimeStr(route.duration_min)}</span>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Stops list preview */}
                                                {route.destinations && route.destinations.length > 0 && (
                                                    <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-2.5 space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                                                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                                                            Itinerário:
                                                        </div>
                                                        {route.destinations.map((dest, idx) => (
                                                            <div key={idx} className="text-[9px] font-bold text-slate-600 truncate flex items-center gap-1">
                                                                <span className="text-brand-500 font-extrabold">{idx + 1}.</span>
                                                                <span className="truncate">{dest?.name || 'Cliente'}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Notes */}
                                                {route.notes && (
                                                    <div className="text-[10px] text-slate-500 italic bg-amber-50/50 border border-amber-100/50 rounded-xl p-2.5 font-medium leading-relaxed">
                                                        <strong>Notas: </strong>{route.notes}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-4 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        handleDeleteRoute(route.id, e);
                                                    }}
                                                    className="px-2.5 py-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                                                >
                                                    Excluir
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleLoadRoute(route);
                                                        setShowTemplatesModal(false);
                                                    }}
                                                    className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all shadow active:scale-95"
                                                >
                                                    Carregar Rota
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-white border border-dashed border-slate-200 rounded-3xl p-6">
                                    <Star className="text-slate-300 mx-auto mb-3" size={36} />
                                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider">Nenhum modelo de rota</h4>
                                    <p className="text-[10px] text-slate-400 font-medium max-w-xs mx-auto mt-1">
                                        Salve seus roteiros ativos para visualizá-los e recarregá-los rapidamente aqui.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-150 flex justify-end shrink-0">
                            <button
                                type="button"
                                onClick={() => setShowTemplatesModal(false)}
                                className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportRoutePlanner;
