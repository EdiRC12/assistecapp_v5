import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, Compass, Navigation, Trash2, X, Star, Building2, HelpCircle, Layers } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

// Leaflet Icon Setup
const getCustomIcon = (color, className = '') => {
    return new L.Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: className
    });
};

const icons = {
    hotel: getCustomIcon('blue'),       // Blue for Hotels
    restaurant: getCustomIcon('red'),  // Red for Restaurants
    fuel: getCustomIcon('green'),      // Green for Gas Stations
    other: getCustomIcon('yellow'),    // Yellow for Others
    client: getCustomIcon('grey', 'client-reference-marker'), // Grey for Clients Reference (with class-opacity)
    search: getCustomIcon('orange')    // Orange for Search Pin
};

// Component to dynamically pan/zoom map to specific coordinates
const RecenterMap = ({ coords }) => {
    const map = useMap();
    useEffect(() => {
        if (coords) {
            map.setView(coords, 14, { animate: true });
        }
    }, [coords, map]);
    return null;
};

const SupportMapView = ({
    supabase,
    currentUser,
    theme,
    notifySuccess,
    notifyError
}) => {
    const isMobile = useIsMobile();
    
    // Core States
    const [places, setPlaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState([-23.5505, -46.6333]); // Default SP
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showResultsList, setShowResultsList] = useState(false);
    const [searchPin, setSearchPin] = useState(null);
    
    // Filters State
    const [activeFilters, setActiveFilters] = useState({
        hotel: true,
        restaurant: true,
        fuel: true,
        other: true,
        client: true
    });

    const [legendOpen, setLegendOpen] = useState(true);

    useEffect(() => {
        if (isMobile) {
            setLegendOpen(false);
        }
    }, [isMobile]);
    
    // Client Reference State (Fetched locally for high detail)
    const [clientPins, setClientPins] = useState([]);

    const toggleFilter = (type) => {
        setActiveFilters(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    const filteredPlaces = useMemo(() => {
        return places.filter(p => activeFilters[p.type]);
    }, [places, activeFilters]);

    const filteredClients = useMemo(() => {
        return activeFilters.client ? clientPins : [];
    }, [clientPins, activeFilters.client]);

    // Modal State for New Place Creation
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPlace, setNewPlace] = useState({
        name: '',
        type: 'hotel',
        address: '',
        latitude: 0,
        longitude: 0,
        notes: ''
    });
    const [saving, setSaving] = useState(false);

    // Fetch support places from Supabase
    const fetchPlaces = async () => {
        try {
            const { data, error } = await supabase
                .from('support_places')
                .select('*')
                .order('name');
            
            if (error) throw error;
            setPlaces(data || []);
        } catch (err) {
            console.error('Error fetching support places:', err);
            notifyError('Erro ao carregar locais', err.message);
        } finally {
            setLoading(false);
        }
    };

    // Fetch unique clients with valid addresses/coordinates
    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('id, client, geo')
                .not('geo', 'is', null);

            if (error) throw error;

            // Deduplicate clients by name
            const seen = new Set();
            const uniqueClients = [];
            (data || []).forEach(t => {
                if (t.client && t.geo?.lat && t.geo?.lng) {
                    const clientNameLower = t.client.trim().toLowerCase();
                    if (!seen.has(clientNameLower)) {
                        seen.add(clientNameLower);
                        uniqueClients.push({
                            id: t.id,
                            name: t.client.trim(),
                            lat: t.geo.lat,
                            lng: t.geo.lng
                        });
                    }
                }
            });
            setClientPins(uniqueClients);
        } catch (err) {
            console.warn('Could not load client coordinates for reference:', err);
        }
    };

    useEffect(() => {
        fetchPlaces();
        fetchClients();
    }, []);

    // Search address using OSM Nominatim (Free & Lightweight)
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearching(true);
        setShowResultsList(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
                { headers: { 'User-Agent': 'AssistecApp/1.0' } }
            );
            const data = await res.json();
            setSearchResults(data || []);
        } catch (err) {
            console.error('Search error:', err);
            notifyError('Erro de busca', 'Não foi possível conectar ao serviço de busca.');
        } finally {
            setSearching(false);
        }
    };

    // Click result from search list
    const handleSelectResult = (result) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        
        setMapCenter([lat, lon]);
        setShowResultsList(false);

        // Pin the selected search result on the map instead of opening the registration modal immediately
        setSearchPin({
            name: result.name || result.display_name.split(',')[0] || 'Local Encontrado',
            display_name: result.display_name,
            lat: lat,
            lon: lon
        });
    };

    // Get current GPS location and reverse-geocode address
    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            notifyError('GPS Não Suportado', 'Seu navegador não oferece suporte a geolocalização.');
            return;
        }

        notifySuccess('Obtendo posição do GPS...', '', { duration: 2500 });
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                setMapCenter([lat, lng]);

                // Query Nominatim for address reverse-geocoding
                let address = 'Localização Atual';
                let resolvedName = 'Minha Posição';
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                        { headers: { 'User-Agent': 'AssistecApp/1.0' } }
                    );
                    const data = await res.json();
                    address = data.display_name || address;
                    resolvedName = data.name || data.display_name.split(',')[0] || resolvedName;
                } catch (e) {
                    console.warn('Reverse geocoding failed, using coordinates instead.');
                }

                setNewPlace({
                    name: resolvedName,
                    type: 'hotel',
                    address: address,
                    latitude: lat,
                    longitude: lng,
                    notes: ''
                });

                setIsModalOpen(true);
            },
            (error) => {
                console.error('GPS Error:', error);
                notifyError('Falha no GPS', 'Não foi possível acessar o sinal GPS do aparelho.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    // Save support place to Supabase
    const handleSavePlace = async (e) => {
        e.preventDefault();
        if (!newPlace.name.trim()) {
            notifyError('Validação', 'O nome do local não pode ficar em branco.');
            return;
        }

        setSaving(true);
        try {
            const record = {
                name: newPlace.name.trim(),
                type: newPlace.type,
                address: newPlace.address.trim(),
                latitude: newPlace.latitude,
                longitude: newPlace.longitude,
                notes: newPlace.notes.trim(),
                created_by: currentUser?.id
            };

            const { error } = await supabase
                .from('support_places')
                .insert([record]);

            if (error) throw error;

            notifySuccess('Local salvo com sucesso!', 'Disponível para todos os técnicos.');
            setIsModalOpen(false);
            fetchPlaces();
        } catch (err) {
            console.error('Save place error:', err);
            notifyError('Erro ao salvar local', err.message);
        } finally {
            setSaving(false);
        }
    };

    // Delete support place from Supabase
    const handleDeletePlace = async (id) => {
        if (!confirm('Deseja realmente remover este local de apoio favorito?')) return;

        try {
            const { error } = await supabase
                .from('support_places')
                .delete()
                .eq('id', id);

            if (error) throw error;

            notifySuccess('Local removido com sucesso');
            fetchPlaces();
        } catch (err) {
            console.error('Delete place error:', err);
            notifyError('Erro ao deletar local', err.message);
        }
    };

    // Open Navigation App Link (Deep Links)
    const handleNavigate = (place, type) => {
        const { latitude, longitude, name } = place;
        if (type === 'waze') {
            window.open(`https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`, '_blank');
        } else {
            // Google Maps
            window.open(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`, '_blank');
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50 relative">
            <style>{`
                .client-reference-marker {
                    filter: brightness(1.28) contrast(0.88);
                    opacity: 0.9;
                }
            `}</style>
            {/* Control & Search Bar */}
            <div className="p-3 bg-white border-b border-slate-200 shadow-sm shrink-0 flex flex-wrap gap-2 items-center justify-between z-[400] relative">
                
                {/* Search Form */}
                <form onSubmit={handleSearch} className="flex items-center gap-1.5 w-full sm:w-[550px] relative">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar cidade, rua ou hotel..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-slate-50/50"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResultsList(false); setSearchPin(null); }}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        type="submit"
                        disabled={searching}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-3.5 py-2 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                    >
                        {searching ? 'Buscando...' : 'Pesquisar'}
                    </button>

                    {/* Results Dropdown */}
                    {showResultsList && searchResults.length > 0 && (
                        <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] overflow-hidden max-h-60 overflow-y-auto">
                            {searchResults.map((res, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => handleSelectResult(res)}
                                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 border-b border-slate-100 flex items-start gap-2.5 transition-colors"
                                >
                                    <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-slate-800 leading-tight">
                                            {res.name || res.display_name.split(',')[0]}
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-normal whitespace-normal break-words">
                                            {res.display_name}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </form>

                {/* GPS current location button */}
                <button
                    onClick={handleGetLocation}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black px-4 py-2 rounded-lg text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                    <Compass size={14} className="animate-spin-slow" />
                    <span>Salvar Posição Atual</span>
                </button>
            </div>

            {/* Leaflet Map Area */}
            <div className="flex-1 z-10 relative">
                {loading ? (
                    <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs font-bold text-slate-500">Montando mapa de suporte...</span>
                        </div>
                    </div>
                ) : null}

                {/* Floating Legend Trigger (when collapsed) */}
                {!loading && !legendOpen && (
                    <button
                        onClick={() => setLegendOpen(true)}
                        className="absolute top-3 right-3 bg-white/95 backdrop-blur-md p-2 rounded-full shadow-lg border border-slate-200/80 z-[500] text-slate-650 hover:text-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center w-8 h-8"
                        title="Ver Legenda e Filtros"
                    >
                        <Layers size={16} className="text-brand-600" />
                    </button>
                )}

                {/* Floating Legend & Filter Panel */}
                {!loading && legendOpen && (
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md p-2 md:p-3.5 rounded-xl shadow-xl border border-slate-200/80 z-[500] w-44 md:w-56 text-slate-700 select-none animate-in fade-in-50 duration-200">
                        <div className="flex items-center justify-between pb-1.5 md:pb-2 mb-1.5 md:mb-2 border-b border-slate-100">
                            <span className="font-extrabold text-[9px] md:text-[11px] uppercase tracking-wider text-slate-400">
                                {isMobile ? 'Legenda' : 'Filtros & Legenda'}
                            </span>
                            <div className="flex items-center gap-1 md:gap-1.5">
                                <span className="text-[9px] md:text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded-full shrink-0">
                                    {filteredPlaces.length + filteredClients.length} pin(s)
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setLegendOpen(false)}
                                    className="text-slate-400 hover:text-red-500 p-0.5 hover:bg-slate-100 rounded transition-colors"
                                    title="Recolher legenda"
                                >
                                    <X size={isMobile ? 10 : 12} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="space-y-1 md:space-y-2">
                            {[
                                { id: 'hotel', label: 'Hotéis', color: 'bg-blue-500', count: places.filter(p => p.type === 'hotel').length },
                                { id: 'restaurant', label: 'Restaurantes', color: 'bg-red-500', count: places.filter(p => p.type === 'restaurant').length },
                                { id: 'fuel', label: isMobile ? 'Postos Comb.' : 'Postos de Gasolina', color: 'bg-green-500', count: places.filter(p => p.type === 'fuel').length },
                                { id: 'other', label: isMobile ? 'Ptos. Apoio' : 'Pontos de Apoio', color: 'bg-yellow-500', count: places.filter(p => p.type === 'other').length },
                                { id: 'client', label: isMobile ? 'Clientes (Ref.)' : 'Clientes (Referência)', color: 'bg-slate-400', count: clientPins.length }
                            ].map((cat) => (
                                <label
                                    key={cat.id}
                                    className="flex items-center justify-between p-1 md:p-1.5 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-[10px] md:text-xs"
                                >
                                    <div className="flex items-center gap-1.5 md:gap-2 min-w-0">
                                        <span className={`w-2 md:h-3 md:w-3 h-2 rounded-full ${cat.color} border border-white shadow-sm shrink-0`} />
                                        <span className={`font-semibold md:font-medium truncate ${activeFilters[cat.id] ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                                            {cat.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <span className="text-[8px] md:text-[10px] font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded-full shrink-0">
                                            {cat.count}
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={activeFilters[cat.id]}
                                            onChange={() => toggleFilter(cat.id)}
                                            className="rounded text-brand-600 focus:ring-brand-500 border-slate-300 w-3 h-3 md:w-3.5 md:h-3.5 cursor-pointer accent-brand-600"
                                        />
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <MapContainer
                    center={mapCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    className="custom-map-container"
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Recenter triggers */}
                    <RecenterMap coords={mapCenter} />

                    {/* Support Places Pins */}
                    {filteredPlaces.map((place) => {
                        const icon = icons[place.type] || icons.other;
                        const labelType = {
                            hotel: '🏨 Hotel',
                            restaurant: '🍽️ Restaurante',
                            fuel: '⛽ Posto de Gasolina',
                            other: '📍 Ponto de Apoio'
                        }[place.type] || '📍 Ponto';

                        return (
                            <Marker
                                key={place.id}
                                position={[place.latitude, place.longitude]}
                                icon={icon}
                            >
                                <Popup>
                                    <div className="p-1 min-w-[200px] text-slate-800">
                                        <div className="flex items-center justify-between mb-1.5 border-b pb-1 border-slate-100">
                                            <span className="text-[10px] font-black text-brand-600 uppercase tracking-tight bg-brand-50 px-1.5 py-0.5 rounded">
                                                {labelType}
                                            </span>
                                            <button
                                                onClick={() => handleDeletePlace(place.id)}
                                                className="text-slate-400 hover:text-red-600 transition-colors"
                                                title="Remover dos favoritos"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <h3 className="font-extrabold text-sm text-slate-900 leading-tight mb-1">
                                            {place.name}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
                                            {place.address}
                                        </p>
                                        {place.notes && (
                                            <div className="bg-slate-50 p-1.5 rounded text-[10px] text-slate-600 border border-slate-100 italic mb-3">
                                                <strong>Obs:</strong> {place.notes}
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <button
                                                onClick={() => handleNavigate(place, 'google')}
                                                className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-2 rounded font-bold text-[10px] transition-colors border"
                                            >
                                                <Navigation size={10} className="text-slate-500" />
                                                <span>Google Maps</span>
                                            </button>
                                            <button
                                                onClick={() => handleNavigate(place, 'waze')}
                                                className="flex items-center justify-center gap-1 bg-brand-50 hover:bg-brand-100 text-brand-700 py-1.5 px-2 rounded font-bold text-[10px] transition-colors border border-brand-100"
                                            >
                                                <Star size={10} className="text-brand-500" />
                                                <span>Waze</span>
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Temporary Search Pin */}
                    {searchPin && (
                        <Marker
                            position={[searchPin.lat, searchPin.lon]}
                            icon={icons.search}
                        >
                            <Popup>
                                <div className="p-1 min-w-[200px] text-slate-800">
                                    <div className="flex items-center justify-between mb-1.5 border-b pb-1 border-slate-100">
                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-tight bg-amber-50 px-1.5 py-0.5 rounded">
                                            🔍 Local Encontrado
                                        </span>
                                        <button
                                            onClick={() => setSearchPin(null)}
                                            className="text-slate-400 hover:text-red-600 transition-colors"
                                            title="Remover alfinete"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                    <h3 className="font-extrabold text-sm text-slate-900 leading-tight mb-1">
                                        {searchPin.name}
                                    </h3>
                                    <p className="text-[10px] text-slate-500 mb-3 leading-normal whitespace-normal break-words">
                                        {searchPin.display_name}
                                    </p>
                                    <button
                                        onClick={() => {
                                            setNewPlace({
                                                name: searchPin.name,
                                                type: 'hotel',
                                                address: searchPin.display_name,
                                                latitude: searchPin.lat,
                                                longitude: searchPin.lon,
                                                notes: ''
                                            });
                                            setIsModalOpen(true);
                                        }}
                                        className="w-full flex items-center justify-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white py-1.5 px-3 rounded-lg font-bold text-[10px] transition-colors shadow-sm cursor-pointer"
                                    >
                                        <Star size={12} className="fill-white text-white" />
                                        <span>Salvar nos Favoritos</span>
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Clients Pins Reference (Grey/Violet translúcido) */}
                    {filteredClients.map((client) => (
                        <Marker
                            key={client.id}
                            position={[client.lat, client.lng]}
                            icon={icons.client}
                        >
                            <Popup>
                                <div className="p-1 min-w-[180px] text-slate-800">
                                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                        <Building2 size={11} className="text-slate-400" />
                                        <span>Cliente Registrado</span>
                                    </div>
                                    <h4 className="font-extrabold text-sm text-slate-900 leading-tight">
                                        {client.name}
                                    </h4>
                                    <p className="text-[9px] text-slate-400 italic mt-1">
                                        Ponto de referência neutro
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>

            {/* Creation Modal for Support Places */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                        
                        {/* Header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-brand-600 to-indigo-700 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Star size={18} className="text-amber-300" />
                                <h3 className="font-black text-base">Salvar Local Favorito</h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSavePlace} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Nome do Local *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Hotel Rota da Serra, Posto Ipiranga BR-101"
                                    value={newPlace.name}
                                    onChange={(e) => setNewPlace(p => ({ ...p, name: e.target.value }))}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                        Categoria *
                                    </label>
                                    <select
                                        value={newPlace.type}
                                        onChange={(e) => setNewPlace(p => ({ ...p, type: e.target.value }))}
                                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 bg-white"
                                    >
                                        <option value="hotel">🏨 Hotéis</option>
                                        <option value="restaurant">🍽️ Restaurantes</option>
                                        <option value="fuel">⛽ Postos de Gasolina</option>
                                        <option value="other">📍 Ponto de Apoio</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                        Coordenadas GPS
                                    </label>
                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-500 bg-slate-50 border rounded-lg h-9 truncate flex items-center">
                                        {newPlace.latitude.toFixed(5)}, {newPlace.longitude.toFixed(5)}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Endereço Identificado
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Endereço físico aproximado..."
                                    value={newPlace.address}
                                    onChange={(e) => setNewPlace(p => ({ ...p, address: e.target.value }))}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 resize-none bg-slate-50/50"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Observações Adicionais (Opcional)
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Ex: Wifi bom, café da manhã incluso, aceita faturamento, ducha excelente..."
                                    value={newPlace.notes}
                                    onChange={(e) => setNewPlace(p => ({ ...p, notes: e.target.value }))}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 resize-none"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-black rounded-lg text-xs shadow transition-all active:scale-95 cursor-pointer"
                                >
                                    {saving ? 'Salvando...' : 'Confirmar e Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportMapView;
