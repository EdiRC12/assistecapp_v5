import React, { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Filter, Users, MapPin, Lock, Plus, Map as MapIcon, Navigation, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';
import { TaskStatus, StatusLabels } from '../constants/taskConstants';
import useIsMobile from '../hooks/useIsMobile';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point } from '@turf/helpers';
import { UI_TOKENS } from '../constants/themeConstants';
import { calculateClientSLA } from '../utils/slaCalculator';

const FitBounds = ({ data }) => {
    const map = useMap();
    useEffect(() => {
        if (data) {
            const layer = L.geoJSON(data);
            map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        }
    }, [data, map]);
    return null;
};

const ResizeHandler = () => {
    const map = useMap();
    useEffect(() => {
        const observer = new ResizeObserver(() => {
            map.invalidateSize();
        });
        const container = map.getContainer();
        if (container) {
            observer.observe(container);
        }
        return () => observer.disconnect();
    }, [map]);
    return null;
};

const MapView = ({ tasks, allClients = [], mapFilter, setMapFilter, users, highlightedClients = [], onNewTask }) => {
    const isMobile = useIsMobile();
    // Move state declarations here to avoid ReferenceError in useMemo
    const [viewMode, setViewMode] = useState('PINS'); // 'PINS' or 'COVERAGE'
    const [selectedState, setSelectedState] = useState('ALL');
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [mesoregionsMeta, setMesoregionsMeta] = useState({});
    const [isLoadingGeo, setIsLoadingGeo] = useState(false);
    const [coverageStats, setCoverageStats] = useState({});
    const [statsVersion, setStatsVersion] = useState(0);
    const [pinColorMode, setPinColorMode] = useState('DEFAULT'); // 'DEFAULT' | 'SLA'

    // Custom Icons
    const blueIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const purpleIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
        className: 'opacity-60' // Translucent for suggestions
    });

    const greenIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const yellowIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const greyIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    const technicians = useMemo(() => {
        const set = new Set();
        tasks.forEach(t => {
            if (t.travels) {
                t.travels.forEach(tr => {
                    const team = Array.isArray(tr.team) ? tr.team : [tr.team];
                    team.forEach(m => { if (m && m.trim()) set.add(m.trim()); });
                });
            }
        });
        return Array.from(set).sort();
    }, [tasks]);

    const mapItems = useMemo(() => {
        const items = [];
        tasks.forEach(t => {
            if (!t.geo || !t.geo.lat) return;

            const hasTravels = t.travels && Array.isArray(t.travels) && t.travels.length > 0;
            
            if (hasTravels) {
                t.travels.forEach((tr, idx) => {
                    let matchesFilter = true;
                    
                    // Status Filter (Travel-based)
                    if (mapFilter.status === 'ACTIVE' && tr.status === 'FINALIZADA') matchesFilter = false;
                    else if (mapFilter.status === 'FINISHED' && tr.status !== 'FINALIZADA') matchesFilter = false;

                    // Date Filter (Travel-specific)
                    const travelDate = tr.date || t.due_date || t.created_at;
                    if (mapFilter.month !== 'ALL' || mapFilter.year !== 'ALL') {
                        if (!travelDate) matchesFilter = false;
                        else {
                            const dateObj = new Date(travelDate);
                            const mMatch = mapFilter.month === 'ALL' || (dateObj.getUTCMonth() + 1).toString() === mapFilter.month;
                            const yMatch = mapFilter.year === 'ALL' || dateObj.getUTCFullYear().toString() === mapFilter.year;
                            if (!mMatch || !yMatch) matchesFilter = false;
                        }
                    }

                    // Tech Filter
                    if (mapFilter.userId !== 'ALL') {
                        const team = Array.isArray(tr.team) ? tr.team : [tr.team];
                        if (!team.some(m => m === mapFilter.userId)) matchesFilter = false;
                    }

                    if (matchesFilter) {
                        // Jitter a bit if multiple travels for the same task to avoid perfect overlap
                        const jitter = hasTravels && t.travels.length > 1 ? (idx * 0.00005) : 0;
                        items.push({
                            id: `${t.id}-tr-${tr.id || idx}`,
                            type: 'TRAVEL',
                            task: t,
                            travel: tr,
                            geo: { lat: t.geo.lat + jitter, lng: t.geo.lng + jitter },
                            status: tr.status,
                            date: travelDate,
                            icon: tr.status === 'FINALIZADA' ? greenIcon : (t.parent_test_id ? yellowIcon : (t.parent_followup_id ? redIcon : blueIcon))
                        });
                    }
                });
            } else if (t.visitation?.required) {
                let matchesFilter = true;
                if (mapFilter.status === 'ACTIVE' && (t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELED)) matchesFilter = false;
                else if (mapFilter.status === 'FINISHED' && (t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED)) matchesFilter = false;

                if (mapFilter.userId !== 'ALL') matchesFilter = false;

                if (matchesFilter) {
                    items.push({
                        id: t.id,
                        type: 'TASK',
                        task: t,
                        geo: t.geo,
                        status: t.status,
                        date: t.due_date,
                        icon: (t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELED) ? greenIcon : (t.parent_test_id ? yellowIcon : (t.parent_followup_id ? redIcon : blueIcon))
                    });
                }
            }
        });
        return items;
    }, [tasks, mapFilter, pinColorMode]);

    const slaMapItems = useMemo(() => {
        if (pinColorMode !== 'SLA') return [];
        const items = [];
        (allClients || []).forEach(client => {
            if (!client.name) return;
            const sla = calculateClientSLA(client, tasks);
            if (sla.status === 'NO_SLA') return; // Hide clients without SLA to declutter map
            
            // Find the most recent task with GEO for this client
            const clientTasksWithGeo = tasks.filter(t => t.client && t.client.toLowerCase() === client.name.toLowerCase() && t.geo && t.geo.lat && t.geo.lng);
            if (clientTasksWithGeo.length === 0) return;
            
            // Sort by most recent
            clientTasksWithGeo.sort((a, b) => new Date(b.createdAt || b.created_at) - new Date(a.createdAt || a.created_at));
            const latestTask = clientTasksWithGeo[0];

            let icon = greyIcon;
            if (sla.status === 'OVERDUE') icon = redIcon;
            else if (sla.status === 'SCHEDULED') icon = yellowIcon;
            else if (sla.status === 'OK') icon = greenIcon;

            items.push({
                id: `sla-${client.id}`,
                type: 'CLIENT_SLA',
                client: client,
                geo: latestTask.geo,
                sla: sla,
                icon: icon,
                task: latestTask
            });
        });
        return items;
    }, [allClients, tasks, pinColorMode]);

    // COVERAGE MAP LOGIC

    // Fetch Mesoregion Names ONCE
    useEffect(() => {
        let isMounted = true;
        const fetchMeta = async () => {
            try {
                const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/mesorregioes');
                const data = await res.json();
                const metaDict = {};
                data.forEach(item => {
                    metaDict[item.id] = `${item.nome} (${item.UF.sigla})`;
                });
                if (isMounted) setMesoregionsMeta(metaDict);
            } catch (err) {
                console.error("Error loading mesoregion metadata", err);
            }
        };
        fetchMeta();
        return () => { isMounted = false; };
    }, []);

    // Fetch GeoJSON when state changes and in COVERAGE mode
    useEffect(() => {
        if (viewMode !== 'COVERAGE') return;
        
        let isMounted = true;
        const fetchGeo = async () => {
            setIsLoadingGeo(true);
            try {
                let url = '';
                if (selectedState === 'INTL') {
                    url = '/maps/south_america.geojson';
                } else if (selectedState === 'ALL') {
                    url = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&intrarregiao=mesorregiao';
                } else if (selectedState === 'ARG') {
                    url = '/maps/argentina.geojson';
                } else if (selectedState === 'PER') {
                    url = '/maps/peru.geojson';
                } else {
                    url = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${selectedState}?formato=application/vnd.geo+json&intrarregiao=mesorregiao`;
                }
                
                const res = await fetch(url);
                if (!res.ok) throw new Error('Failed to fetch map data');
                const data = await res.json();
                if (isMounted) setGeoJsonData(data);
            } catch (err) {
                console.error("Error loading GeoJSON:", err);
            } finally {
                if (isMounted) setIsLoadingGeo(false);
            }
        };
        fetchGeo();
        return () => { isMounted = false; };
    }, [selectedState, viewMode]);

    // Calculate coverage intersections when mapItems or geoJsonData changes
    useEffect(() => {
        if (viewMode !== 'COVERAGE' || !geoJsonData) return;

        const stats = {};
        const getRegionId = (f) => f.properties.codarea || f.properties.FIRST_IDDP || f.properties.adm1_code || f.properties['ISO3166-1-Alpha-3'] || f.properties.name || f.properties.NOMBDEP;
        const getRegionName = (f, rId) => mesoregionsMeta[rId] || f.properties.NM_MESO || f.properties.NOMBDEP || f.properties.name || `Região ${rId}`;
        
        // Initialize stats for all regions
        geoJsonData.features.forEach(feature => {
            const regionId = getRegionId(feature);
            stats[regionId] = { count: 0, name: getRegionName(feature, regionId) };
        });

        // Test each task against all polygons
        mapItems.forEach(item => {
            if (!item.geo || !item.geo.lat || !item.geo.lng) return;
            const pt = point([item.geo.lng, item.geo.lat]); // Turf uses [lng, lat]
            
            for (const feature of geoJsonData.features) {
                // booleanPointInPolygon handles MultiPolygons and Polygons
                if (booleanPointInPolygon(pt, feature)) {
                    const regionId = getRegionId(feature);
                    if (!stats[regionId]) {
                        stats[regionId] = { count: 0, name: getRegionName(feature, regionId) };
                    }
                    stats[regionId].count += 1;
                    break; // Found the region, no need to check others for this point
                }
            }
        });

        setCoverageStats(stats);
        setStatsVersion(v => v + 1);
    }, [mapItems, geoJsonData, viewMode, mesoregionsMeta]);

    // Style function for Choropleth
    const getRegionStyle = (feature) => {
        const regionId = feature.properties.codarea || feature.properties.FIRST_IDDP || feature.properties.adm1_code || feature.properties['ISO3166-1-Alpha-3'] || feature.properties.name || feature.properties.NOMBDEP;
        const count = coverageStats[regionId]?.count || 0;
        
        let fillColor = '#cbd5e1'; // slate-300 (0 visits)
        let fillOpacity = 0.4;
        
        if (count > 0) {
            fillColor = '#10b981'; // emerald-500
            fillOpacity = Math.min(0.4 + (count * 0.1), 0.9); // Gets darker with more visits
        }

        return {
            fillColor,
            weight: 1,
            opacity: 1,
            color: '#64748b', // border color
            fillOpacity
        };
    };

    const onEachFeature = (feature, layer) => {
        const regionId = feature.properties.codarea || feature.properties.FIRST_IDDP || feature.properties.adm1_code || feature.properties['ISO3166-1-Alpha-3'] || feature.properties.name || feature.properties.NOMBDEP;
        const count = coverageStats[regionId]?.count || 0;
        const regionName = coverageStats[regionId]?.name || feature.properties.NM_MESO || feature.properties.NOMBDEP || feature.properties.name || `Região ${regionId}`;
        
        // Use a simple tooltip for hover
        layer.bindTooltip(`
            <div class="text-center">
                <div class="font-bold text-slate-800">${regionName}</div>
                <div class="text-sm ${count > 0 ? 'text-emerald-600 font-bold' : 'text-slate-500'}">
                    ${count} atendimento(s)
                </div>
            </div>
        `, { sticky: true, className: 'bg-white/90 backdrop-blur border-none shadow-md rounded-lg p-2' });
    };

    const BR_STATES = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'];
    
    useEffect(() => {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
        });
    }, []);

    const months = [
        { v: '1', l: 'Janeiro' }, { v: '2', l: 'Fevereiro' }, { v: '3', l: 'Março' },
        { v: '4', l: 'Abril' }, { v: '5', l: 'Maio' }, { v: '6', l: 'Junho' },
        { v: '7', l: 'Julho' }, { v: '8', l: 'Agosto' }, { v: '9', l: 'Setembro' },
        { v: '10', l: 'Outubro' }, { v: '11', l: 'Novembro' }, { v: '12', l: 'Dezembro' }
    ];

    const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - 2 + i).toString());

    return (
        <div className="flex flex-col flex-1 h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
            <div className={`bg-slate-50 border-b border-slate-200 ${isMobile ? 'p-1.5' : 'p-3'} flex flex-wrap gap-2 md:gap-3 items-center z-10 shrink-0`}>
                <div className="flex items-center gap-1.5 md:gap-2 bg-white border rounded-lg px-2 py-0.5 md:py-1 shadow-sm">
                    <Filter size={isMobile ? 10 : 12} className="text-slate-400" />
                    <select
                        value={mapFilter.status}
                        onChange={e => setMapFilter(p => ({ ...p, status: e.target.value }))}
                        className="text-[9px] md:text-xs font-bold text-slate-700 bg-transparent outline-none cursor-pointer"
                    >
                        <option value="ACTIVE">Ativas</option>
                        <option value="FINISHED">Finalizadas</option>
                        <option value="ALL">Todas</option>
                    </select>
                </div>

                <div className="flex items-center gap-1 md:gap-2">
                    <select
                        value={mapFilter.month}
                        onChange={e => setMapFilter(p => ({ ...p, month: e.target.value }))}
                        className="text-[9px] md:text-xs bg-white border border-slate-200 rounded-lg px-1 md:px-2 py-1 md:py-1.5 outline-none hover:border-brand-500 transition-colors"
                    >
                        <option value="ALL">Meses</option>
                        {months.map(m => <option key={m.v} value={m.v}>{isMobile ? m.l.substring(0, 3) : m.l}</option>)}
                    </select>
                    <select
                        value={mapFilter.year}
                        onChange={e => setMapFilter(p => ({ ...p, year: e.target.value }))}
                        className="text-[9px] md:text-xs bg-white border border-slate-200 rounded-lg px-1 md:px-2 py-1 md:py-1.5 outline-none hover:border-brand-500 transition-colors"
                    >
                        <option value="ALL">Anos</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-1 md:gap-2 flex-1 min-w-[100px] md:min-w-[150px]">
                    <Users size={isMobile ? 10 : 12} className="text-slate-400" />
                    <select
                        value={mapFilter.userId}
                        onChange={e => setMapFilter(p => ({ ...p, userId: e.target.value }))}
                        className="flex-1 text-[9px] md:text-xs bg-white border border-slate-200 rounded-lg px-1 md:px-2 py-1 md:py-1.5 outline-none hover:border-brand-500 transition-colors"
                    >
                        <option value="ALL">{isMobile ? "Quem?" : "Quem foi? (Todos)"}</option>
                        {technicians.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="flex flex-wrap gap-3 md:gap-4">
                    {viewMode === 'PINS' && pinColorMode === 'DEFAULT' ? (
                        <>
                            <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" /> <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Tarefas</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" /> <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Finalizadas</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" /> <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Testes</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" /> <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Acomp.</span></div>
                        </>
                    ) : viewMode === 'PINS' && pinColorMode === 'SLA' ? (
                        <>
                            <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 animate-pulse" /> <span className="text-[10px] md:text-xs font-black text-rose-500 uppercase tracking-wider">Visita Vencida</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" /> <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Programado</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" /> <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Em Dia</span></div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-sm bg-emerald-500 opacity-60" /> <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Atendido</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-sm bg-slate-300 opacity-40" /> <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Sem Visitas</span></div>
                        </>
                    )}
                </div>

                <div className="flex flex-1 justify-end items-center gap-2 border-l border-slate-200 pl-3 ml-auto">
                    <div className="flex bg-slate-200/50 rounded-lg p-0.5">
                        <button 
                            onClick={() => { setViewMode('PINS'); setPinColorMode('DEFAULT'); }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] md:text-xs font-bold transition-all ${viewMode === 'PINS' && pinColorMode === 'DEFAULT' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <MapPin size={12} /> Alfinetes
                        </button>
                        <button 
                            onClick={() => { setViewMode('PINS'); setPinColorMode('SLA'); }}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] md:text-xs font-bold transition-all ${viewMode === 'PINS' && pinColorMode === 'SLA' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            title="Prospecção / Vencimentos SLA"
                        >
                            <AlertTriangle size={12} /> SLA
                        </button>
                        <button 
                            onClick={() => setViewMode('COVERAGE')}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] md:text-xs font-bold transition-all ${viewMode === 'COVERAGE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <MapIcon size={12} /> Cobertura
                        </button>
                    </div>

                    {viewMode === 'COVERAGE' && (
                        <select
                            value={selectedState}
                            onChange={e => setSelectedState(e.target.value)}
                            className="text-[10px] md:text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none shadow-sm hover:border-emerald-500"
                        >
                            <option value="ALL">Todo o Brasil</option>
                            <option value="ARG">Argentina (Províncias)</option>
                            <option value="PER">Peru (Departamentos)</option>
                            <option value="INTL">América Latina / Intl</option>
                            <optgroup label="Estados Brasileiros">
                                {BR_STATES.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                            </optgroup>
                        </select>
                    )}
                </div>
            </div>

            <div className="flex-1 relative z-0">
                {mapItems.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 text-slate-400 backdrop-blur-[1px]">
                        <div className="text-center">
                            <MapPin size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="font-medium">Nenhum local encontrado para estes filtros.</p>
                        </div>
                    </div>
                )}
                <MapContainer center={[-23.5505, -46.6333]} zoom={4} style={{ height: '100%', width: '100%' }}>
                    <ResizeHandler />
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    {viewMode === 'PINS' && (pinColorMode === 'SLA' ? slaMapItems : mapItems).map(item => {
                        const t = item.task;
                        const isSLA = item.type === 'CLIENT_SLA';
                        const sla = item.sla;
                        const isFromTest = !isSLA && !!t.parent_test_id;
                        const isFromFollowup = !isSLA && !!t.parent_followup_id;

                        return (
                            <Marker
                                key={item.id}
                                position={[item.geo.lat, item.geo.lng]}
                                icon={item.icon}
                            >
                                <Popup>
                                    <div className="p-1">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`text-[10px] font-black uppercase tracking-tight ${isSLA ? 'text-slate-500' : (item.status === 'FINALIZADA' ? 'text-emerald-600' : 'text-brand-600')}`}>
                                                    {isSLA ? 'CLIENTE / SLA' : (item.type === 'TRAVEL' ? item.status : StatusLabels[t.status])}
                                                </div>
                                                {isFromTest && <span className="bg-yellow-500 text-slate-800 text-[7px] font-black px-1 py-0.5 rounded tracking-wider uppercase">Teste</span>}
                                                {isFromFollowup && <span className="bg-red-500 text-white text-[7px] font-black px-1 py-0.5 rounded tracking-wider uppercase">Acomp.</span>}
                                            </div>
                                            {!isSLA && t.visibility === 'PRIVATE' && <Lock size={10} className="text-amber-500" title="Privada" />}
                                        </div>
                                        <div className="font-bold text-slate-800 border-b pb-1 mb-1">
                                            {isSLA ? item.client.name : (item.type === 'TRAVEL' ? `[VIAGEM] ${t.client || t.title}` : t.client || t.title)}
                                        </div>

                                        {isSLA && sla && (
                                            <div className={`mt-2 p-1.5 rounded-md border text-xs font-medium ${sla.status === 'OVERDUE' ? 'bg-rose-50 border-rose-200 text-rose-700' : sla.status === 'SCHEDULED' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                                                <div className="font-bold uppercase tracking-wider text-[10px] mb-0.5">SLA ({item.client.visit_frequency_months} meses)</div>
                                                {sla.status === 'OVERDUE' && <span>⚠️ {sla.monthsOverdue === 999 ? 'Nunca visitado' : `Atrasado ${sla.monthsOverdue} meses`}</span>}
                                                {sla.status === 'SCHEDULED' && <span>⏳ Viagem Programada</span>}
                                                {sla.status === 'OK' && <span>✅ Em Dia</span>}
                                            </div>
                                        )}

                                        {!isSLA && <div className="text-xs text-slate-600 flex items-start gap-1"><MapPin size={10} className="mt-0.5 shrink-0" /> {t.location}</div>}
                                        
                                        {!isSLA && item.type === 'TRAVEL' && (
                                            <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-200">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-bold text-slate-500">DATA:</span>
                                                    <span className="text-[10px] font-black text-slate-700">{item.date ? new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'A DEFINIR'}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-600">
                                                    <span className="font-bold">EQUIPE:</span> {item.travel.team?.join(', ') || 'Nenhum'}
                                                </div>
                                                {item.travel.km && <div className="text-[9px] text-slate-500 mt-1">KM: {item.travel.km} | R$ {item.travel.expenses || 0}</div>}
                                            </div>
                                        )}

                                        {item.type === 'TASK' && t.assigned_users && t.assigned_users.length > 0 && (
                                            <div className="flex gap-1 mt-1">
                                                {t.assigned_users.map(uId => {
                                                    const u = (users || []).find(user => user.id === uId);
                                                    if (!u) return null;
                                                    return (
                                                        <div key={uId} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold text-[6px]" style={{ backgroundColor: u.color }} title={u.username}>
                                                            {u.username[0].toUpperCase()}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {viewMode === 'PINS' && highlightedClients.map(client => (
                        <Marker
                            key={`highlight-${client.id || client.name}`}
                            position={[client.geo.lat, client.geo.lng]}
                            icon={purpleIcon}
                        >
                            <Popup>
                                <div className="p-2 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-1 leading-none">Sugestão POLI</div>
                                    <div className="font-bold text-slate-800 mb-2">{client.name}</div>
                                    {!isMobile && (
                                        <button
                                            onClick={() => onNewTask(client.name)}
                                            className="w-full py-1.5 bg-purple-600 text-white text-[10px] font-bold rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <Plus size={12} /> Criar Tarefa
                                        </button>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {viewMode === 'COVERAGE' && geoJsonData && (
                        <>
                            <GeoJSON 
                                key={`geojson-${selectedState}-${geoJsonData.features.length}-${statsVersion}`}
                                data={geoJsonData}
                                style={getRegionStyle}
                                onEachFeature={onEachFeature}
                            />
                            <FitBounds data={geoJsonData} />
                        </>
                    )}
                </MapContainer>
            </div>
        </div>
    );
};

export default MapView;
