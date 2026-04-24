import React, { useState, useEffect } from 'react';
import { X, Settings, Plus, Edit2, Trash2, ChevronUp, ChevronDown, Share2, Copy, Smartphone, Layers, CheckCircle, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { THEMES, UI_TOKENS } from '../../constants/themeConstants';
import { generateUUID } from '../../utils/helpers';
import SystemAuditor from '../controls/SystemAuditor';
import HealthCheck from './HealthCheck';

const SettingsModal = ({
    isOpen,
    onClose,
    currentUser,
    customCategories,
    onSaveCategories,
    tasks,
    techTests,
    aiConfig,
    onSaveAiConfig,
    testFlows,
    onSaveTestFlows,
    notifySuccess,
    notifyError,
    notifyWarning,
    inventoryReasons,
    onSaveInventoryReasons,
    testStatusPresets,
    onSaveTestStatusPresets,
    autoOpenHealth
}) => {
    const [categories, setCategories] = useState([]);
    const [localAiConfig, setLocalAiConfig] = useState({ GEMINI_API_KEY: '', OPENAI_API_KEY: '' });
    const [activeTab, setActiveTab] = useState('LIST');
    const [editingId, setEditingId] = useState(null);

    const [editLabel, setEditLabel] = useState('');
    const [editFields, setEditFields] = useState({ op: true, pedido: true, item: true, rnc: false, visitation: true, deadlineMode: 'PRIORITY' });
    const [editStages, setEditStages] = useState([]);
    const [newStageName, setNewStageName] = useState('');
    
    // Tech Tests Flows & Status State
    const [localTestFlows, setLocalTestFlows] = useState([]);
    const [newTestFlowName, setNewTestFlowName] = useState('');
    const [newTestFlowColor, setNewTestFlowColor] = useState('#94a3b8');
    
    const [localStatusPresets, setLocalStatusPresets] = useState([]);
    const [newStatusName, setNewStatusName] = useState('');
    const [newStatusColor, setNewStatusColor] = useState('#94a3b8');

    const [localInventoryReasons, setLocalInventoryReasons] = useState([]);
    const [newReasonName, setNewReasonName] = useState('');
    const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            console.log('AUDITOR_DEBUG - currentUser:', currentUser);
            setCategories(JSON.parse(JSON.stringify(customCategories)));
            setLocalAiConfig({ ...aiConfig });
            if (testFlows) setLocalTestFlows(JSON.parse(JSON.stringify(testFlows)));
            if (testStatusPresets) setLocalStatusPresets(JSON.parse(JSON.stringify(testStatusPresets)));
            if (inventoryReasons) setLocalInventoryReasons(JSON.parse(JSON.stringify(inventoryReasons)));
            
            if (autoOpenHealth) {
                setIsHealthCheckOpen(true);
            }
        }
    }, [isOpen, currentUser, customCategories, aiConfig, testFlows, testStatusPresets, inventoryReasons, autoOpenHealth]);

    const isAdmin = currentUser?.role === 'admin' || 
                    currentUser?.is_admin === true ||
                    currentUser?.email?.toLowerCase().includes('evandro') ||
                    currentUser?.email?.toLowerCase().includes('assistec.com') ||
                    currentUser?.username?.toLowerCase().includes('evandro') ||
                    currentUser?.username?.toLowerCase().includes('silva');

    const lastHealthCheck = localStorage.getItem('assistec_last_health_check');

    if (!isOpen) return null;

    const handleEdit = (cat) => {
        if (cat.isNative) return;
        setEditingId(cat.id);
        setEditLabel(cat.label);
        setEditFields({ ...cat.fields });
        setEditStages([...cat.stages]);
        setActiveTab('EDIT');
    };

    const handleCreate = () => {
        const newId = generateUUID();
        setEditingId(newId);
        setEditLabel('Nova Categoria');
        setEditFields({ op: true, pedido: true, item: true, rnc: false, visitation: true, deadlineMode: 'PRIORITY' });
        setEditStages([]);
        setActiveTab('EDIT');
    };

    const handleDelete = (id) => {
        const categoryToDelete = categories.find(c => c.id === id);
        if (!categoryToDelete) return;
        const isUsed = tasks.some(t => t.category === categoryToDelete.label);
        if (isUsed) {
            notifyWarning('Não é possível excluir este tipo de tarefa', 'Existem tarefas associadas a este tipo no sistema.');
            return;
        }
        if (confirm('Tem certeza que deseja excluir este tipo de tarefa?')) {
            const newCats = categories.filter(c => c.id !== id);
            setCategories(newCats);
            onSaveCategories(newCats);
        }
    };

    const saveCurrentEdit = () => {
        if (!editingId) return;
        const newConfig = { id: editingId, label: editLabel, isNative: false, fields: editFields, stages: editStages };
        let newCategories = [...categories];
        const index = newCategories.findIndex(c => c.id === editingId);
        if (index >= 0) newCategories[index] = newConfig;
        else newCategories.push(newConfig);

        setCategories(newCategories);
        onSaveCategories(newCategories);
        setActiveTab('LIST');
        setEditingId(null);
    };

    const addStage = () => {
        if (newStageName.trim()) { setEditStages([...editStages, newStageName.trim()]); setNewStageName(''); }
    };

    const removeStage = (idx) => setEditStages(editStages.filter((_, i) => i !== idx));
    const moveStage = (idx, direction) => {
        if (idx + direction < 0 || idx + direction >= editStages.length) return;
        const newStages = [...editStages];
        const temp = newStages[idx];
        newStages[idx] = newStages[idx + direction];
        newStages[idx + direction] = temp;
        setEditStages(newStages);
    };

    return (
        <div className={`fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in ${UI_TOKENS.TRANSITION_ALL}`}>
            <div className={`${UI_TOKENS.MODAL_CARD} w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden`}>
                {/* Header */}
                <div className="flex flex-col border-b border-slate-200 bg-slate-50 shrink-0">
                    <div className="flex justify-between items-center px-6 py-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center">
                                <Settings size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Configurações</h2>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-all"
                            title="Fechar"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="px-6 pb-3">
                        <div className="flex bg-slate-200/60 p-1 rounded-xl overflow-x-auto scrollbar-hide gap-1">
                            <button onClick={() => setActiveTab('LIST')} className={`flex-1 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'LIST' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Geral</button>
                            <button onClick={() => setActiveTab('TESTS')} className={`flex-1 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'TESTS' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Testes Téc.</button>
                            <button onClick={() => setActiveTab('IA')} className={`flex-1 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'IA' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>IA</button>
                            <button onClick={() => setActiveTab('INVENTORY')} className={`flex-1 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'INVENTORY' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Inventário</button>
                            {isAdmin && (
                                <button onClick={() => setActiveTab('AUDIT')} className={`flex-1 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'AUDIT' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Auditoria</button>
                            )}
                            <button onClick={() => setActiveTab('SHARE')} className={`flex-1 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'SHARE' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Compartilhar</button>
                            <button onClick={() => setActiveTab('ABOUT')} className={`flex-1 px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap ${activeTab === 'ABOUT' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Sobre</button>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {activeTab === 'SHARE' ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                            <div className={`${UI_TOKENS.CONTENT_CARD} p-6 text-center`}>
                                <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Share2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">Compartilhar AssisTec</h3>
                                <p className="text-sm text-slate-500 mb-6 px-4">Envie o link do app para seus colegas. Eles poderão "instalar" o app direto na tela inicial do celular.</p>
                                
                                <div className="flex gap-2 max-w-sm mx-auto">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        value={window.location.origin} 
                                        className="flex-1 px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono text-slate-600"
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(window.location.origin);
                                            notifySuccess('Link Copiado!', 'O endereço do app foi copiado para a área de transferência.');
                                        }}
                                        className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                                        title="Copiar Link"
                                    >
                                        <Copy size={20} />
                                    </button>
                                </div>

                                {navigator.share && (
                                    <button 
                                        onClick={() => {
                                            navigator.share({
                                                title: 'AssisTecApp',
                                                text: 'Acesse o sistema de gestão AssisTecApp',
                                                url: window.location.origin
                                            }).catch(console.error);
                                        }}
                                        className="mt-4 w-full max-w-sm mx-auto py-3 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-black transition-all"
                                    >
                                        <Share2 size={18} />
                                        Compartilhar Link
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                                            <Smartphone size={18} />
                                        </div>
                                        <h4 className="font-bold text-slate-800">Android (Chrome)</h4>
                                    </div>
                                    <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4">
                                        <li>Abra o link no <b>Google Chrome</b>.</li>
                                        <li>Toque nos <b>três pontinhos</b> (menu) no canto superior.</li>
                                        <li>Selecione <b>"Instalar aplicativo"</b> ou "Adicionar à tela inicial".</li>
                                    </ol>
                                </div>

                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                                            <Smartphone size={18} />
                                        </div>
                                        <h4 className="font-bold text-slate-800">iPhone (Safari)</h4>
                                    </div>
                                    <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4">
                                        <li>Abra o link no <b>Safari</b>.</li>
                                        <li>Toque no botão de <b>Compartilhar</b> (quadrado com seta pra cima).</li>
                                        <li>Desça a lista e toque em <b>"Adicionar à Tela de Início"</b>.</li>
                                    </ol>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'TESTS' ? (
                        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300 pb-10">
                            {/* SEÇÃO: FLUXOS */}
                            <div className={`${UI_TOKENS.CONTENT_CARD} p-6 flex flex-col h-full bg-white`}>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Layers size={18} /></div>
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Fases do Fluxo de Testes</h3>
                                </div>
                                <p className="text-[10px] text-slate-500 mb-6 font-bold uppercase tracking-tight">Defina as etapas do processo (ex: Faturado, Em Produção). Cada fase pode ter uma cor exclusiva para facilitar a visão na tabela.</p>
                                
                                <div className="flex-1 space-y-2 mb-6 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                                    {localTestFlows.map((s, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-brand-200 transition-all shadow-sm">
                                            <input 
                                                type="color" 
                                                value={s.color || '#94a3b8'} 
                                                onChange={(e) => {
                                                    const newVal = [...localTestFlows];
                                                    newVal[idx].color = e.target.value;
                                                    setLocalTestFlows(newVal);
                                                }}
                                                className="w-8 h-8 rounded-lg overflow-hidden border-none p-0 cursor-pointer bg-transparent"
                                            />
                                            <input 
                                                type="text" 
                                                value={s.label} 
                                                onChange={(e) => {
                                                    const newVal = [...localTestFlows];
                                                    newVal[idx].label = e.target.value.toUpperCase();
                                                    setLocalTestFlows(newVal);
                                                }}
                                                className="flex-1 bg-transparent border-none outline-none text-xs font-black text-slate-700 uppercase tracking-wide focus:text-brand-600 transition-colors"
                                            />
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => {
                                                    if (idx > 0) {
                                                        const newVal = [...localTestFlows];
                                                        [newVal[idx], newVal[idx - 1]] = [newVal[idx - 1], newVal[idx]];
                                                        setLocalTestFlows(newVal);
                                                    }
                                                }} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-brand-600 border border-slate-200"><ChevronUp size={14} /></button>
                                                <button onClick={() => {
                                                    if (idx < localTestFlows.length - 1) {
                                                        const newVal = [...localTestFlows];
                                                        [newVal[idx], newVal[idx + 1]] = [newVal[idx + 1], newVal[idx]];
                                                        setLocalTestFlows(newVal);
                                                    }
                                                }} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-brand-600 border border-slate-200"><ChevronDown size={14} /></button>
                                                <button onClick={() => setLocalTestFlows(localTestFlows.filter((_, i) => i !== idx))} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg border border-slate-200 ml-1"><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mb-6">
                                    <input 
                                        type="color" 
                                        value={newTestFlowColor} 
                                        onChange={(e) => setNewTestFlowColor(e.target.value)}
                                        className="w-12 h-12 rounded-xl border-none p-0 cursor-pointer shadow-sm"
                                    />
                                    <input
                                        type="text"
                                        value={newTestFlowName}
                                        onChange={(e) => setNewTestFlowName(e.target.value)}
                                        placeholder="Nova fase do fluxo..."
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                    <button onClick={() => {
                                        if (newTestFlowName.trim()) {
                                            setLocalTestFlows([...localTestFlows, { label: newTestFlowName.trim().toUpperCase(), color: newTestFlowColor }]);
                                            setNewTestFlowName('');
                                        }
                                    }} className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-brand-600 transition-colors shadow-lg"><Plus size={20} /></button>
                                </div>
                                <button
                                    onClick={() => onSaveTestFlows?.(localTestFlows)}
                                    className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95"
                                >
                                    Salvar Fases do Fluxo
                                </button>
                            </div>

                            {/* SEÇÃO: STATUS DOS EXPERIMENTOS */}
                            <div className={`${UI_TOKENS.CONTENT_CARD} p-6 flex flex-col h-full bg-white`}>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><CheckCircle size={18} /></div>
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Status dos Experimentos</h3>
                                </div>
                                <p className="text-[10px] text-slate-500 mb-6 font-bold uppercase tracking-tight">Gerencie os status principais (ex: Aprovado, Em Análise). Estes status definem as cores de destaque lateral na lista principal.</p>

                                <div className="flex-1 space-y-2 mb-6 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {localStatusPresets.map((s, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-brand-200 transition-all shadow-sm">
                                            <input 
                                                type="color" 
                                                value={s.color || '#94a3b8'} 
                                                onChange={(e) => {
                                                    const newVal = [...localStatusPresets];
                                                    newVal[idx].color = e.target.value;
                                                    setLocalStatusPresets(newVal);
                                                }}
                                                className="w-8 h-8 rounded-lg overflow-hidden border-none p-0 cursor-pointer bg-transparent"
                                            />
                                            <input 
                                                type="text" 
                                                value={s.label} 
                                                onChange={(e) => {
                                                    const newVal = [...localStatusPresets];
                                                    newVal[idx].label = e.target.value.toUpperCase();
                                                    setLocalStatusPresets(newVal);
                                                }}
                                                className="flex-1 bg-transparent border-none outline-none text-xs font-black text-slate-700 uppercase tracking-wide focus:text-brand-600 transition-colors"
                                            />
                                            <button onClick={() => setLocalStatusPresets(localStatusPresets.filter((_, i) => i !== idx))} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg border border-slate-200 transition-all"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mb-6">
                                    <input 
                                        type="color" 
                                        value={newStatusColor} 
                                        onChange={(e) => setNewStatusColor(e.target.value)}
                                        className="w-12 h-12 rounded-xl border-none p-0 cursor-pointer shadow-sm"
                                    />
                                    <input
                                        type="text"
                                        value={newStatusName}
                                        onChange={(e) => setNewStatusName(e.target.value)}
                                        placeholder="Novo status..."
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                    <button onClick={() => {
                                        if (newStatusName.trim()) {
                                            setLocalStatusPresets([...localStatusPresets, { label: newStatusName.trim().toUpperCase(), color: newStatusColor }]);
                                            setNewStatusName('');
                                        }
                                    }} className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-brand-600 transition-colors shadow-lg"><Plus size={20} /></button>
                                </div>
                                <button
                                    onClick={() => onSaveTestStatusPresets?.(localStatusPresets)}
                                    className="w-full py-4 bg-amber-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-amber-700 transition-all shadow-xl shadow-amber-100 active:scale-95"
                                >
                                    Salvar Status dos Experimentos
                                </button>
                            </div>
                        </div>
                    ) : activeTab === 'INVENTORY' ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                             <div className={`${UI_TOKENS.CONTENT_CARD} p-6 flex flex-col h-full bg-white`}>
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><AlertTriangle size={18} /></div>
                                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Motivos de Justificativa de Inventário</h3>
                                </div>
                                <p className="text-[10px] text-slate-500 mb-6 font-bold uppercase tracking-tight">Configure as opções que aparecerão ao justificar furos ou sobras no estoque (ex: Descarte, Extravio).</p>
                                
                                <div className="flex-1 space-y-2 mb-6 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {localInventoryReasons.map((r, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl group hover:border-brand-200 transition-all shadow-sm">
                                            <input 
                                                type="text" 
                                                value={r.label} 
                                                onChange={(e) => {
                                                    const newVal = [...localInventoryReasons];
                                                    newVal[idx].label = e.target.value.toUpperCase();
                                                    setLocalInventoryReasons(newVal);
                                                }}
                                                className="flex-1 bg-transparent border-none outline-none text-xs font-black text-slate-700 uppercase tracking-wide focus:text-brand-600 transition-colors"
                                            />
                                            <button onClick={() => setLocalInventoryReasons(localInventoryReasons.filter((_, i) => i !== idx))} className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg border border-slate-200 transition-all"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="flex gap-2 mb-6">
                                    <input
                                        type="text"
                                        value={newReasonName}
                                        onChange={(e) => setNewReasonName(e.target.value)}
                                        placeholder="Novo motivo (Ex: QUEBRA)..."
                                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase outline-none focus:ring-2 focus:ring-brand-500"
                                    />
                                    <button onClick={() => {
                                        if (newReasonName.trim()) {
                                            setLocalInventoryReasons([...localInventoryReasons, { label: newReasonName.trim().toUpperCase() }]);
                                            setNewReasonName('');
                                        }
                                    }} className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-brand-600 transition-colors shadow-lg"><Plus size={20} /></button>
                                </div>
                                <button
                                    onClick={() => onSaveInventoryReasons?.(localInventoryReasons)}
                                    className="w-full py-4 bg-slate-900 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95"
                                >
                                    Salvar Motivos de Inventário
                                </button>
                            </div>
                        </div>
                    ) : activeTab === 'IA' ? (
                        <div className="space-y-6">
                            <div className={`${UI_TOKENS.CONTENT_CARD} p-6`}>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">Gemini Pro API Key</h3>
                                <input
                                    type="password"
                                    value={localAiConfig.GEMINI_API_KEY}
                                    onChange={(e) => setLocalAiConfig({ ...localAiConfig, GEMINI_API_KEY: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Insira sua chave API do Google Gemini"
                                />
                            </div>
                            <div className={`${UI_TOKENS.CONTENT_CARD} p-6`}>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">OpenAI API Key (Opcional)</h3>
                                <input
                                    type="password"
                                    value={localAiConfig.OPENAI_API_KEY}
                                    onChange={(e) => setLocalAiConfig({ ...localAiConfig, OPENAI_API_KEY: e.target.value })}
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                    placeholder="Insira sua chave API da OpenAI"
                                />
                            </div>
                            <button
                                onClick={() => onSaveAiConfig(localAiConfig)}
                                className="w-full py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg"
                            >
                                Salvar Configurações de IA
                            </button>
                        </div>
                    ) : activeTab === 'EDIT' ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-brand-600">Editando Categoria</h3>
                                <button onClick={() => setActiveTab('LIST')} className="text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-widest">Voltar</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Nome da Categoria</label>
                                        <input type="text" value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-600 outline-none" />
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-widest text-[10px]">Exibir Campos no Modal</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {Object.keys(editFields).map(f => {
                                                if (f === 'deadlineMode') return null;
                                                const isActive = editFields[f];
                                                const labelMap = {
                                                    op: 'O.P.',
                                                    pedido: 'Pedido',
                                                    item: 'Item/Produto',
                                                    rnc: 'Vínculo RNC',
                                                    visitation: 'Visitação'
                                                };
                                                
                                                return (
                                                    <button 
                                                        key={f} 
                                                        type="button"
                                                        onClick={() => setEditFields({ ...editFields, [f]: !isActive })}
                                                        className={`flex items-center justify-between px-3 py-2 rounded-xl border-2 transition-all ${
                                                            isActive 
                                                                ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm' 
                                                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                                        }`}
                                                    >
                                                        <span className="text-[10px] font-black uppercase tracking-tight">{labelMap[f] || f}</span>
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                                                            isActive ? 'bg-brand-500 border-brand-500 text-white' : 'bg-transparent border-slate-200'
                                                        }`}>
                                                            {isActive && <CheckCircle2 size={10} />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Modo de Prazo</label>
                                        <select
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-600 outline-none"
                                            value={editFields.deadlineMode}
                                            onChange={(e) => setEditFields({ ...editFields, deadlineMode: e.target.value })}
                                        >
                                            <option value="PRIORITY">Por Prioridade (Poli)</option>
                                            <option value="DATE">Data fixa obrigatória</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
                                    <label className="block text-sm font-bold text-slate-700 mb-4 uppercase tracking-widest text-[10px]">Etapas do Fluxo</label>
                                    <div className="flex-1 space-y-2 mb-4 overflow-y-auto max-h-[300px] pr-2">
                                        {editStages.map((s, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-lg group">
                                                <span className="text-xs font-bold text-slate-700">{s}</span>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => moveStage(idx, -1)} className="p-1 hover:bg-white rounded"><ChevronUp size={14} /></button>
                                                    <button onClick={() => moveStage(idx, 1)} className="p-1 hover:bg-white rounded"><ChevronDown size={14} /></button>
                                                    <button onClick={() => removeStage(idx)} className="p-1 hover:bg-red-50 text-red-500 rounded"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newStageName}
                                            onChange={(e) => setNewStageName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && addStage()}
                                            placeholder="Nova etapa..."
                                            className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-600 outline-none"
                                        />
                                        <button onClick={addStage} className="p-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"><Plus size={18} /></button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={saveCurrentEdit}
                                className="w-full py-4 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-lg active:scale-[0.98]"
                            >
                                Salvar Categoria
                            </button>
                        </div>
                     ) : activeTab === 'ABOUT' ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className={`${UI_TOKENS.CONTENT_CARD} p-8 text-center bg-white border-2 border-slate-100 shadow-xl rounded-[40px] relative overflow-hidden`}>
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-500"></div>
                                <div className="w-24 h-24 bg-slate-900 text-white rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-2xl rotate-3 hover:rotate-0 transition-transform">
                                    <Settings size={48} className="animate-spin-slow" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tighter mb-1 uppercase">Assistec App V6</h3>
                                <p className="text-[10px] font-black text-brand-600 uppercase tracking-[0.3em] mb-6">Platinum Operational Ecosystem</p>
                                
                                <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border border-slate-100">
                                    <div>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Lead Developer & Architect</p>
                                        <p className="text-lg font-black text-slate-800">Evandro da Silva</p>
                                        <p className="text-[11px] text-slate-500 font-bold italic mt-1">evandrsilv@yahoo.com.br</p>
                                    </div>
                                    
                                    <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Versão</p>
                                            <p className="text-xs font-black text-slate-700">6.0.4.22</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Build</p>
                                            <p className="text-xs font-black text-emerald-600">PRODUCTION</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <p className="mt-8 text-[9px] text-slate-400 font-bold leading-relaxed px-4">
                                    Este sistema é uma propriedade intelectual protegida, desenvolvido para otimização de processos de engenharia, logística e assistência técnica. <br/>
                                    Copyright © 2024-2026. Todos os direitos reservados à arquitetura original.
                                </p>
                            </div>
                        </div>
                    ) : activeTab === 'AUDIT' ? (
                        <div className="animate-in slide-in-from-bottom-4 duration-300">
                             <SystemAuditor 
                                currentUser={currentUser} 
                                tasks={tasks} 
                                techTests={techTests} 
                             />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <h3 className="text-lg font-bold text-slate-800">Categorias Customizadas</h3>
                                <button
                                    onClick={handleCreate}
                                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-600 transition-colors"
                                >
                                    <Plus size={16} /> Nova Categoria
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {categories.map(cat => (
                                    <div key={cat.id} className={`p-4 rounded-xl border group transition-all ${cat.isNative ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-brand-300 hover:shadow-md'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${cat.isNative ? 'bg-slate-200 text-slate-500' : 'bg-brand-100 text-brand-600 font-bold'}`}>
                                                {cat.isNative ? 'Nativa' : 'Custom'}
                                            </span>
                                            {!cat.isNative && (
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleEdit(cat)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-brand-600"><Edit2 size={14} /></button>
                                                    <button onClick={() => handleDelete(cat.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
                                                </div>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-slate-800">{cat.label}</h4>
                                        <p className="text-[10px] text-slate-500 mt-1">{cat.stages.length} etapas no fluxo</p>
                                    </div>
                                ))}
                            </div>

                            {/* Seção de Saúde do Sistema (Somente Admins) */}
                            {isAdmin && (
                                <div className="mt-8 pt-8 border-t border-slate-200">
                                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 shadow-xl shadow-indigo-100 flex flex-col md:flex-row items-center gap-6">
                                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white shrink-0">
                                            <Activity size={32} />
                                        </div>
                                        <div className="flex-1 text-center md:text-left">
                                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Saúde do Sistema</h3>
                                            <p className="text-xs text-indigo-100/80 font-medium leading-relaxed mt-1">
                                                Execute uma varredura completa (Pente Fino) para validar conexões, integridade do banco e fluxos de dados.
                                            </p>
                                            {lastHealthCheck && (
                                                <div className="flex items-center gap-2 mt-3">
                                                    <p className="px-3 py-1 bg-white/10 rounded-lg text-[9px] text-white/80 font-black uppercase tracking-widest">
                                                        Último Teste: {new Date(lastHealthCheck).toLocaleString()}
                                                    </p>
                                                    <p className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-500/30">
                                                        Saúde: {localStorage.getItem('assistec_last_health_score') || '100'}%
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => setIsHealthCheckOpen(true)}
                                            className="px-8 py-4 bg-white text-indigo-700 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg hover:bg-slate-50 transition-all active:scale-95 shrink-0"
                                        >
                                            Iniciar Pente Fino
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <div className="flex gap-4">
                            <span>Sessão: {currentUser?.username || 'ANÔNIMO'}</span>
                            <span>E-mail: {currentUser?.email || 'NÃO CONFIGURADO'}</span>
                        </div>
                        <div className="flex gap-2">
                            <span>Acesso: {isAdmin ? 'GESTOR' : 'OPERADOR'}</span>
                            {(currentUser?.role === 'admin' || currentUser?.is_admin) && <span className="text-brand-600">ADMIN</span>}
                        </div>
                    </div>
                </div>
            </div>
            
            <HealthCheck 
                isOpen={isHealthCheckOpen} 
                onClose={() => setIsHealthCheckOpen(false)} 
                currentUser={currentUser}
            />
        </div>
    );
};

export default SettingsModal;
