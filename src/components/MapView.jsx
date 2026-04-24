import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Filter, Users, MapPin, Lock, Plus } from 'lucide-react';
import { TaskStatus, StatusLabels } from '../constants/taskConstants';
import useIsMobile from '../hooks/useIsMobile';

const MapView = ({ tasks, mapFilter, setMapFilter, users, highlightedClients = [], onNewTask }) => {
    const isMobile = useIsMobile();
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

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (!t.geo || !t.geo.lat) return false;

            // Status Filter
            if (mapFilter.status === 'ACTIVE') {
                if (t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELED) return false;
            } else if (mapFilter.status === 'FINISHED') {
                if (t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED) return false;
            }

            // Date Filter
            if (mapFilter.month !== 'ALL' || mapFilter.year !== 'ALL') {
                let matchDate = false;
                const datesToCheck = [];
                if (t.due_date) datesToCheck.push(t.due_date);
                if (t.created_at) datesToCheck.push(t.created_at);
                if (t.createdAt) datesToCheck.push(t.createdAt);
                if (t.travels) t.travels.forEach(tr => { if (tr.date) datesToCheck.push(tr.date); });

                if (datesToCheck.length === 0) return false;

                matchDate = datesToCheck.some(d => {
                    const dateObj = new Date(d);
                    const mMatch = mapFilter.month === 'ALL' || (dateObj.getUTCMonth() + 1).toString() === mapFilter.month;
                    const yMatch = mapFilter.year === 'ALL' || dateObj.getUTCFullYear().toString() === mapFilter.year;
                    return mMatch && yMatch;
                });
                if (!matchDate) return false;
            }

            // Technician Filter
            if (mapFilter.userId !== 'ALL') {
                if (!t.travels) return false;
                const hasTech = t.travels.some(tr => {
                    const team = Array.isArray(tr.team) ? tr.team : [tr.team];
                    return team.some(m => m === mapFilter.userId);
                });
                if (!hasTech) return false;
            }

            // Visitation Requirement Check
            const hasTravelEntries = t.travels && t.travels.length > 0;
            if (!t.visitation?.required && !hasTravelEntries) return false;

            return true;
        });
    }, [tasks, mapFilter]);

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
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
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
                    <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" /> <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Tarefas</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" /> <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Finalizadas</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" /> <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Testes</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" /> <span className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-wider">Acomp.</span></div>
                </div>
            </div>

            <div className="flex-1 relative z-0">
                {filteredTasks.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 z-10 text-slate-400 backdrop-blur-[1px]">
                        <div className="text-center">
                            <MapPin size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="font-medium">Nenhum local encontrado para estes filtros.</p>
                        </div>
                    </div>
                )}
                <MapContainer center={[-23.5505, -46.6333]} zoom={4} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    {filteredTasks.map(t => {
                        const isFinished = t.status === TaskStatus.DONE || t.status === TaskStatus.CANCELED;
                        const isFromTest = !!t.parent_test_id;
                        const isFromFollowup = !!t.parent_followup_id;

                        let markerIcon = blueIcon;
                        if (isFinished) markerIcon = greenIcon;
                        else if (isFromTest) markerIcon = yellowIcon;
                        else if (isFromFollowup) markerIcon = redIcon;

                        return (
                            <Marker
                                key={t.id}
                                position={[t.geo.lat, t.geo.lng]}
                                icon={markerIcon}
                            >
                                <Popup>
                                    <div className="p-1">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className="text-[10px] font-black uppercase tracking-tight text-brand-600">{StatusLabels[t.status]}</div>
                                                {isFromTest && <span className="bg-yellow-500 text-slate-800 text-[7px] font-black px-1 py-0.5 rounded tracking-wider uppercase">Teste</span>}
                                                {isFromFollowup && <span className="bg-red-500 text-white text-[7px] font-black px-1 py-0.5 rounded tracking-wider uppercase">Acomp.</span>}
                                            </div>
                                            {t.visibility === 'PRIVATE' && <Lock size={10} className="text-amber-500" title="Privada" />}
                                        </div>
                                        <div className="font-bold text-slate-800 border-b pb-1 mb-1">{t.client || t.title}</div>
                                        <div className="text-xs text-slate-600 flex items-start gap-1"><MapPin size={10} className="mt-0.5 shrink-0" /> {t.location}</div>
                                        {t.assigned_users && t.assigned_users.length > 0 && (
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
                                        {t.travels && t.travels.length > 0 && (
                                            <div className="mt-2 text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                                                Última equipe: {t.travels[t.travels.length - 1].team?.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {highlightedClients.map(client => (
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
                </MapContainer>
            </div>
        </div>
    );
};

export default MapView;
