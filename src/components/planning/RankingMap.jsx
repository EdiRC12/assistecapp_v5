import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet icons in some bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle auto-centering the map based on data bounds
const RecenterMap = ({ rankingData }) => {
    const map = useMap();
    useEffect(() => {
        if (!rankingData || rankingData.length === 0) return;
        
        const bounds = [];
        rankingData.forEach(client => {
            if (client.geo && client.geo.lat && client.geo.lng) {
                bounds.push([client.geo.lat, client.geo.lng]);
            }
        });

        if (bounds.length > 0) {
            try {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
            } catch (e) {
                console.warn("Could not fit map bounds:", e);
            }
        }
    }, [rankingData, map]);
    
    // Invalidate size in case tab switching messes up map dimensions
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);

    return null;
};

const RankingMap = ({ rankingData }) => {
    const [filters, setFilters] = useState({ high: true, medium: true, low: true });
    
    // Filter out clients without geo coordinates
    const baseGeoClients = rankingData.filter(c => c.geo && c.geo.lat && c.geo.lng);
    const maxVisits = Math.max(...rankingData.map(c => c.count), 1);
    
    // Apply user selected tier filters
    const geoClients = baseGeoClients.filter(client => {
        const proportion = client.count / maxVisits;
        if (proportion > 0.6) return filters.high;
        if (proportion > 0.3) return filters.medium;
        return filters.low;
    });

    if (baseGeoClients.length === 0) {
        return (
            <div className="w-full h-96 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                <p className="font-bold">Sem dados geográficos</p>
                <p className="text-xs mt-1">Nenhum dos clientes desse período possui coordenadas GPS salvas nas ordens de serviço.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[500px] rounded-3xl overflow-hidden border border-slate-200 shadow-inner relative z-0">
            <MapContainer 
                center={[-14.235, -51.925]} 
                zoom={4} 
                className="w-full h-full"
                scrollWheelZoom={true}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                />
                
                <RecenterMap rankingData={geoClients} />

                {/* Legenda Flutuante e Filtros */}
                <div className="absolute bottom-6 right-6 z-[1000] bg-white/95 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-slate-200">
                    <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Legenda e Filtros</h4>
                    <div className="space-y-1">
                        <button 
                            onClick={() => setFilters(f => ({ ...f, high: !f.high }))}
                            className={`w-full flex items-center gap-3 p-1.5 rounded-lg transition-all text-left ${filters.high ? 'hover:bg-slate-50' : 'opacity-40 grayscale hover:bg-slate-50 hover:grayscale-0'}`}
                        >
                            <div className="w-4 h-4 rounded-full bg-red-500 opacity-60 border-2 border-red-500 shrink-0"></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-700 leading-none">Alto Volume</p>
                                <p className="text-[8px] font-semibold text-slate-400 mt-0.5">&gt; 60% relativo ao líder</p>
                            </div>
                        </button>
                        <button 
                            onClick={() => setFilters(f => ({ ...f, medium: !f.medium }))}
                            className={`w-full flex items-center gap-3 p-1.5 rounded-lg transition-all text-left ${filters.medium ? 'hover:bg-slate-50' : 'opacity-40 grayscale hover:bg-slate-50 hover:grayscale-0'}`}
                        >
                            <div className="w-4 h-4 rounded-full bg-amber-500 opacity-60 border-2 border-amber-500 shrink-0"></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-700 leading-none">Médio Volume</p>
                                <p className="text-[8px] font-semibold text-slate-400 mt-0.5">30% a 60%</p>
                            </div>
                        </button>
                        <button 
                            onClick={() => setFilters(f => ({ ...f, low: !f.low }))}
                            className={`w-full flex items-center gap-3 p-1.5 rounded-lg transition-all text-left ${filters.low ? 'hover:bg-slate-50' : 'opacity-40 grayscale hover:bg-slate-50 hover:grayscale-0'}`}
                        >
                            <div className="w-3 h-3 rounded-full bg-blue-500 opacity-60 border-2 border-blue-500 ml-0.5 shrink-0"></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-700 leading-none">Baixo Volume</p>
                                <p className="text-[8px] font-semibold text-slate-400 mt-0.5">&lt; 30%</p>
                            </div>
                        </button>
                    </div>
                </div>

                {geoClients.map((client, idx) => {
                    // Calculate relative size (min 8px, max 30px)
                    const proportion = client.count / maxVisits;
                    const radius = 8 + (proportion * 22);
                    
                    // The more visits, the redder the bubble
                    const color = proportion > 0.6 ? '#ef4444' : proportion > 0.3 ? '#f59e0b' : '#3b82f6';

                    return (
                        <CircleMarker
                            key={`${client.name}-${idx}`}
                            center={[client.geo.lat, client.geo.lng]}
                            pathOptions={{
                                color: color,
                                fillColor: color,
                                fillOpacity: 0.6,
                                weight: 2
                            }}
                            radius={radius}
                        >
                            <Tooltip direction="top" offset={[0, -radius]} opacity={0.9} className="custom-ranking-tooltip">
                                <div className="text-center font-sans">
                                    <div className="font-black text-slate-800 text-xs mb-1 border-b border-slate-100 pb-1">{client.name}</div>
                                    <div className="text-[10px] text-slate-500 font-medium mb-1">{client.location}</div>
                                    <div className="text-brand-600 font-black text-sm flex items-center justify-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                        {client.count} Visitas
                                    </div>
                                    <div className="text-[9px] text-slate-400 font-bold">
                                        KM: {client.km.toLocaleString()} | {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(client.cost)}
                                    </div>
                                </div>
                            </Tooltip>
                        </CircleMarker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default RankingMap;
