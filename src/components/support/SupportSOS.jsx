import React, { useState, useEffect } from 'react';
import { AlertOctagon, AlertTriangle, Shield, Phone, MessageSquare, Mail, Plus, Trash2, CheckCircle2, Navigation, Compass, X } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const SupportSOS = ({
    supabase,
    currentUser,
    theme,
    notifySuccess,
    notifyError
}) => {
    const isMobile = useIsMobile();

    // Core States
    const [sosContacts, setSosContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [gpsCoords, setGpsCoords] = useState(null);
    const [gpsError, setGpsError] = useState(null);
    const [fetchingGps, setFetchingGps] = useState(false);

    // Form State for SOS Contacts
    const [showContactForm, setShowContactForm] = useState(false);
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [contactRelationship, setContactRelationship] = useState('supervisor');
    const [savingContact, setSavingContact] = useState(false);

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState('Pane Veicular / Carro');
    const [customNotes, setCustomNotes] = useState('');

    const incidents = [
        'Pane Veicular / Problema com Carro',
        'Acidente de Trânsito',
        'Problema de Saúde / Emergência Médica',
        'Insegurança / Perigo na Estrada',
        'Sem combustível / Pane Seca',
        'Outro Incidente / Atraso Crítico'
    ];

    // Fetch user's custom SOS contacts
    const fetchSosContacts = async () => {
        try {
            setLoadingContacts(true);
            const { data, error } = await supabase
                .from('support_sos_contacts')
                .select('*')
                .eq('user_id', currentUser?.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setSosContacts(data || []);
        } catch (err) {
            console.error('Error fetching SOS contacts:', err);
            notifyError('Erro ao buscar contatos SOS', err.message);
        } finally {
            setLoadingContacts(false);
        }
    };

    // Capture satellite GPS coordinates offline
    const fetchGpsCoordinates = () => {
        if (!navigator.geolocation) {
            setGpsError('GPS não suportado pelo aparelho');
            return;
        }

        setFetchingGps(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGpsCoords({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                });
                setGpsError(null);
                setFetchingGps(false);
            },
            (err) => {
                console.warn('GPS signal error:', err);
                setGpsError('Sinal de GPS indisponível no momento.');
                setFetchingGps(false);
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    useEffect(() => {
        fetchSosContacts();
        fetchGpsCoordinates();

        // Auto update GPS location every 30 seconds while on SOS tab
        const interval = setInterval(fetchGpsCoordinates, 30000);
        return () => clearInterval(interval);
    }, []);

    // Add new emergency contact (Limit to 3)
    const handleAddContact = async (e) => {
        e.preventDefault();
        if (sosContacts.length >= 3) {
            notifyError('Limite Excedido', 'Você pode cadastrar no máximo 3 contatos de emergência.');
            return;
        }
        if (!contactName.trim() || !contactPhone.trim()) {
            notifyError('Validação', 'Por favor, informe Nome e Telefone.');
            return;
        }

        setSavingContact(true);
        try {
            const record = {
                user_id: currentUser?.id,
                name: contactName.trim(),
                phone: contactPhone.trim(),
                relationship: contactRelationship
            };

            const { error } = await supabase
                .from('support_sos_contacts')
                .insert([record]);

            if (error) throw error;

            notifySuccess('Contato SOS adicionado!');
            setContactName('');
            setContactPhone('');
            setShowContactForm(false);
            fetchSosContacts();
        } catch (err) {
            console.error('Error adding SOS contact:', err);
            notifyError('Erro ao salvar contato', err.message);
        } finally {
            setSavingContact(false);
        }
    };

    // Delete SOS contact
    const handleDeleteContact = async (id) => {
        if (!confirm('Remover este contato de emergência?')) return;
        try {
            const { error } = await supabase
                .from('support_sos_contacts')
                .delete()
                .eq('id', id);

            if (error) throw error;
            notifySuccess('Contato removido');
            fetchSosContacts();
        } catch (err) {
            console.error('Error deleting SOS contact:', err);
            notifyError('Erro ao deletar', err.message);
        }
    };

    // Construct standard emergency message body
    const buildEmergencyMessage = () => {
        const dateStr = new Date().toLocaleString('pt-BR');
        const mapsLink = gpsCoords 
            ? `https://maps.google.com/?q=${gpsCoords.lat},${gpsCoords.lng}`
            : 'Coordenadas Indisponíveis (Sem sinal de GPS)';
        
        return `🚨 *[EMERGÊNCIA SOS ASSISTEC]*
👤 *Técnico:* ${currentUser?.username || 'Desconhecido'}
⚠️ *Incidente:* ${selectedIncident}
📅 *Data/Hora:* ${dateStr}
🗺️ *Localização exata:* ${mapsLink}
📝 *Obs:* ${customNotes.trim() || 'Nenhuma observação informada.'}

*Por favor, entre em contato imediatamente!*`;
    };

    // Dispatch via WhatsApp (Online)
    const triggerWhatsAppSOS = (contact) => {
        const phoneClean = contact.phone.replace(/\D/g, '');
        const message = buildEmergencyMessage();
        window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(message)}`, '_blank');
        setShowConfirmModal(false);
        setCustomNotes('');
    };

    // Dispatch via native SMS (Offline / Satellite)
    const triggerSMSSOS = (contact) => {
        const phoneClean = contact.phone.replace(/\D/g, '');
        const message = buildEmergencyMessage();
        
        // Detect OS to use the correct SMS prefix/separator
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const separator = isIOS ? '&' : '?';
        
        window.open(`sms:${phoneClean}${separator}body=${encodeURIComponent(message)}`, '_blank');
        setShowConfirmModal(false);
        setCustomNotes('');
    };

    return (
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto p-4 md:p-6 gap-6 bg-slate-50 custom-scrollbar">
            
            {/* Left Column: Panic Red Center & Real-Time Coordinates */}
            <div className="flex-1 flex flex-col gap-5">
                
                {/* Premium Pulser Panic Button Card */}
                <div className="bg-gradient-to-br from-red-600 via-rose-600 to-red-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col items-center justify-center text-center py-10 md:py-14 border border-red-500">
                    
                    {/* Pulsing light rings for wow effect */}
                    <div className="absolute inset-0 bg-red-500/10 rounded-full animate-ping scale-75 opacity-20 pointer-events-none"></div>
                    <div className="absolute inset-0 bg-red-400/20 rounded-full animate-pulse scale-90 opacity-10 pointer-events-none"></div>
                    
                    <AlertOctagon size={48} className="text-white mb-4 animate-bounce-slow shrink-0" />
                    
                    <h3 className="text-xl md:text-2xl font-black uppercase tracking-wider mb-2">
                        Painel de Pânico SOS
                    </h3>
                    <p className="text-xs text-white/80 max-w-sm leading-relaxed mb-6">
                        Está com alguma emergência ou problema crítico na estrada? Dispare alertas imediatos com sua localização GPS via internet ou celular básico.
                    </p>

                    {sosContacts.length === 0 ? (
                        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 text-xs font-bold border border-white/10 max-w-xs">
                            ⚠️ Cadastre pelo menos um contato de emergência à direita antes de disparar o SOS.
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowConfirmModal(true)}
                            className="bg-white text-red-600 hover:bg-slate-50 font-black px-8 py-3 rounded-full text-sm uppercase tracking-widest shadow-2xl transition-transform active:scale-95 animate-pulse-purple cursor-pointer"
                        >
                            Disparar Alerta SOS
                        </button>
                    )}
                </div>

                {/* Real-time satellite GPS coordinates display (Offline Safety) */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between border-b pb-2 mb-3">
                        <div className="flex items-center gap-2">
                            <Compass size={18} className="text-emerald-500" />
                            <h4 className="font-extrabold text-sm text-slate-800">Geolocalização Satélite (Offline)</h4>
                        </div>
                        <button
                            onClick={fetchGpsCoordinates}
                            disabled={fetchingGps}
                            className="text-[10px] bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 font-bold transition-all"
                        >
                            {fetchingGps ? 'Atualizando...' : 'Forçar Atualização'}
                        </button>
                    </div>

                    {gpsCoords ? (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-500 leading-tight">
                                Seu aparelho está conectado diretamente com os satélites de GPS. As coordenadas abaixo estão prontas mesmo se não houver internet:
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Latitude</span>
                                    <span className="text-sm font-black text-slate-700 font-mono select-all">
                                        {gpsCoords.lat.toFixed(6)}
                                    </span>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                                    <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Longitude</span>
                                    <span className="text-sm font-black text-slate-700 font-mono select-all">
                                        {gpsCoords.lng.toFixed(6)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50/50 p-2 rounded border border-emerald-100/50">
                                <CheckCircle2 size={13} className="shrink-0" />
                                <span>Sinal de GPS Ativo e Preciso (Margem de erro: {gpsCoords.accuracy.toFixed(1)} metros)</span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-800">
                            <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                            <div>
                                <h5 className="font-bold">Aguardando coordenadas GPS</h5>
                                <p className="text-[10px] text-amber-700 mt-0.5 leading-tight">
                                    {gpsError || 'Capturando sinal dos satélites... Certifique-se de que a localização do celular está ligada.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: Emergency Contacts Setup (Limit 3) */}
            <div className="w-full md:w-80 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 shrink-0">
                <div className="flex items-center justify-between border-b pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <Shield size={18} className="text-brand-500" />
                        <h4 className="font-black text-sm text-slate-800">Contatos de Emergência</h4>
                    </div>
                    {sosContacts.length < 3 && !showContactForm && (
                        <button
                            onClick={() => setShowContactForm(true)}
                            className="bg-brand-50 hover:bg-brand-100 text-brand-700 p-1.5 rounded-lg transition-colors"
                            title="Adicionar Contato"
                        >
                            <Plus size={16} />
                        </button>
                    )}
                </div>

                {/* Form to insert emergency contact */}
                {showContactForm && (
                    <form onSubmit={handleAddContact} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 space-y-3 animate-in slide-in-from-top-3 duration-200">
                        <div className="flex items-center justify-between border-b pb-1 border-slate-200">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Novo Contato SOS</span>
                            <button type="button" onClick={() => setShowContactForm(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        </div>
                        <div>
                            <input
                                type="text"
                                required
                                placeholder="Nome do Contato"
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border rounded bg-white outline-none focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <input
                                type="text"
                                required
                                placeholder="Telefone (DDD + Número)"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border rounded bg-white outline-none focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <select
                                value={contactRelationship}
                                onChange={(e) => setContactRelationship(e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border rounded bg-white outline-none focus:border-brand-500"
                            >
                                <option value="supervisor">🏢 Supervisor / Assistec</option>
                                <option value="spouse">❤️ Cônjuge / Parceiro(a)</option>
                                <option value="parent">🏡 Familiar / Pai ou Mãe</option>
                                <option value="other">👤 Outro Contato Útil</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={savingContact}
                            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-1.5 rounded text-xs transition-colors cursor-pointer"
                        >
                            {savingContact ? 'Salvando...' : 'Adicionar Contato'}
                        </button>
                    </form>
                )}

                {/* Contacts List */}
                {loadingContacts ? (
                    <div className="flex items-center justify-center py-6">
                        <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : sosContacts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                        <Phone size={24} className="mx-auto mb-2 text-slate-300 opacity-60" />
                        Nenhum contato cadastrado.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sosContacts.map((contact) => {
                            const relationLabel = {
                                supervisor: 'Supervisor / Assistec',
                                spouse: 'Cônjuge / Esposo(a)',
                                parent: 'Familiar / Parente',
                                other: 'Contato SOS'
                            }[contact.relationship] || 'Emergência';

                            return (
                                <div
                                    key={contact.id}
                                    className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between gap-2"
                                >
                                    <div className="overflow-hidden">
                                        <h5 className="font-extrabold text-slate-700 text-xs truncate leading-snug">
                                            {contact.name}
                                        </h5>
                                        <p className="text-[10px] text-slate-400 leading-none mt-0.5 font-semibold">
                                            {relationLabel}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-bold mt-1 font-mono">
                                            {contact.phone}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteContact(contact.id)}
                                        className="text-slate-300 hover:text-red-500 p-1 hover:bg-red-50 rounded transition-all shrink-0"
                                        title="Remover contato"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Cautious Confirmation Modal with Compact SIM Button */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
                        
                        {/* Header */}
                        <div className="px-6 py-4 bg-red-600 text-white flex items-center gap-2.5">
                            <AlertTriangle size={20} className="animate-pulse" />
                            <h3 className="font-black text-sm uppercase tracking-wider">Confirmar Envio de SOS</h3>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                Por favor, selecione o tipo de incidente e adicione alguma observação se julgar útil. O sistema anexará automaticamente suas coordenadas satélite ao alerta.
                            </p>

                            {/* Select emergency type */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">
                                    Tipo de Emergência
                                </label>
                                <select
                                    value={selectedIncident}
                                    onChange={(e) => setSelectedIncident(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-red-500 bg-slate-50/50 font-bold"
                                >
                                    {incidents.map((inc, i) => (
                                        <option key={i} value={inc}>{inc}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Additional notes */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">
                                    Mensagem Adicional (Opcional)
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Ex: Pneu estourou na BR-101 km 45, carro sem força na subida..."
                                    value={customNotes}
                                    onChange={(e) => setCustomNotes(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border rounded-lg outline-none focus:border-red-500 resize-none"
                                />
                            </div>

                            {/* Destinies listing */}
                            <div className="bg-slate-50 border border-slate-150 rounded-xl p-3">
                                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                    Destinatários do Alerta
                                </span>
                                <div className="space-y-1.5">
                                    {sosContacts.map((c, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600 font-bold">
                                            <Phone size={10} className="text-slate-400" />
                                            <span>{c.name} ({c.phone})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Warning notification */}
                            <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 text-[10px] text-red-700 leading-tight">
                                <Shield size={14} className="shrink-0 text-red-500 mt-0.5" />
                                <span className="font-semibold">
                                    O botão de confirmação "SIM" foi intencionalmente reduzido para evitar cliques por esbarrões na tela. Selecione um canal de envio abaixo.
                                </span>
                            </div>

                            {/* Actions Group with SMALL SIM buttons to avoid accidents */}
                            <div className="flex flex-col gap-2 pt-3 border-t border-slate-150">
                                
                                {sosContacts.map((contact, idx) => (
                                    <div key={idx} className="bg-slate-50 rounded-xl p-2 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-xs font-black text-slate-700">{contact.name}</span>
                                        
                                        <div className="flex gap-1.5">
                                            {/* Small WhatsApp button */}
                                            <button
                                                onClick={() => triggerWhatsAppSOS(contact)}
                                                className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold px-3 py-1.5 rounded text-[9px] uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1 scale-95"
                                            >
                                                <MessageSquare size={10} />
                                                <span>WhatsApp (Online)</span>
                                            </button>

                                            {/* Small SMS offline button */}
                                            <button
                                                onClick={() => triggerSMSSOS(contact)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-3 py-1.5 rounded text-[9px] uppercase tracking-wide transition-all cursor-pointer flex items-center gap-1 scale-95"
                                            >
                                                <Compass size={10} />
                                                <span>SMS (Offline)</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => { setShowConfirmModal(false); setCustomNotes(''); }}
                                    className="w-full text-center py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors border mt-2"
                                >
                                    Cancelar Disparo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportSOS;
