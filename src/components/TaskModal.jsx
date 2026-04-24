import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    X, History, Layers, Building2, Building, Search, Loader2, Check,
    AlertCircle, Sparkles, Unlock, Eye, Users, MapPin, Printer,
    Trash2, Paperclip, Download, Plus, Map as MapIcon, ClipboardList, MessageSquare,
    Calendar, FileText, Send, Ban, Save
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { supabase } from '../supabaseClient';
import ReportEditor from './ReportEditor';
import { convertFileToBase64, generateId } from '../utils/helpers';
import {
    TaskStatus, Priority, Category, StatusLabels, StageStatusLabels
} from '../constants/taskConstants';
import { getProactiveSuggestion } from '../services/aiService';
import { UI_TOKENS } from '../constants/themeConstants';
import useIsMobile from '../hooks/useIsMobile';

const MapClickHandler = ({ onLocationSelect }) => {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng);
        }
    });
    return null;
};

/**
 * TaskModal Component
 * Full featured modal for creating and editing tasks.
 */
const TaskModal = ({
    isOpen, onClose, onSave, initialData, customCategories,
    currentUser, onDelete, users, allClients = [], onOpenReport,
    tasks, // Tasks list for POLI proactivity
    techTests = [], // Dados de testes técnicos para vínculos
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo
}) => {
    // State management for task fields
    const [category, setCategory] = useState(Category.DEVELOPMENT);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState(TaskStatus.TO_START);
    const [priority, setPriority] = useState(Priority.MEDIUM);
    const [client, setClient] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [op, setOp] = useState('');
    const [pedido, setPedido] = useState('');
    const [item, setItem] = useState('');
    const [rnc, setRnc] = useState('');
    const [location, setLocation] = useState('');
    const [geo, setGeo] = useState(null);
    const [visitationRequired, setVisitationRequired] = useState(false);
    const [stages, setStages] = useState({});
    const [attachments, setAttachments] = useState([]);
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
    const [mapPickerGeo, setMapPickerGeo] = useState(null);
    const [newCustomStageName, setNewCustomStageName] = useState('');
    const isMobile = useIsMobile();

    // Additional state for features added in V5
    const [travels, setTravels] = useState([]);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [searchLocation, setSearchLocation] = useState('');
    const [locationSearching, setLocationSearching] = useState(false);
    const [locationError, setLocationError] = useState('');

    // Client Autocomplete States
    const [showClientSuggestions, setShowClientSuggestions] = useState(false);
    const [filteredClientSuggestions, setFilteredClientSuggestions] = useState([]);

    // Protocol States
    const [isCanceling, setIsCanceling] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [isReopening, setIsReopening] = useState(false);
    const [reopenReason, setReopenReason] = useState('');
    const [pendingStatus, setPendingStatus] = useState(null);
    const [showCancelProtocol, setShowCancelProtocol] = useState(false);

    // Business Logic States
    const [assignedUsers, setAssignedUsers] = useState([]);
    const [visibility, setVisibility] = useState('PUBLIC');
    const [report, setReport] = useState(null);
    const [poliSuggestion, setPoliSuggestion] = useState(null);
    const [isPoliAnalyzing, setIsPoliAnalyzing] = useState(false);
    const [outcome, setOutcome] = useState(null);
    const [currentReport, setCurrentReport] = useState(null);
    const [isEditingReport, setIsEditingReport] = useState(false);
    const [reportRequired, setReportRequired] = useState(false);
    const [meetingActionId, setMeetingActionId] = useState(null);

    const [clientsRegistry, setClientsRegistry] = useState([]);

    const fileInputRef = useRef(null);

    // Initial config for the selected category
    const currentConfig = useMemo(() =>
        customCategories.find(c => c.id === category) || customCategories[0],
        [category, customCategories]
    );

    // Memoize the last activity for the task from logs
    // Memoize the last activity for the task from tracking fields
    const lastActivity = useMemo(() => {
        if (!initialData || !users) return null;

        const modifiedBy = initialData.last_modified_by;
        const modifiedAt = initialData.last_modified_at || initialData.updated_at;

        if (!modifiedBy || !modifiedAt) return null;

        const user = users.find(u => u.id === modifiedBy);
        return {
            action: 'Última modificação',
            details: '',
            timestamp: modifiedAt,
            userName: user ? user.username : 'Sistema'
        };
    }, [initialData, users]);

    // Check if user has permission to edit the task
    const canEdit = useMemo(() => {
        const isNewTask = !initialData || !initialData.id;
        
        // Mobile view: Can only edit if it is a BRAND NEW task.
        if (isMobile && !isNewTask) return false;
        
        if (!currentUser) return false;
        if (isNewTask) return true;

        if (initialData.visibility === 'PUBLIC') return true;
        if (initialData.user_id === currentUser.id) return true;
        if (initialData.assigned_users && initialData.assigned_users.length > 0) {
            return initialData.assigned_users.includes(currentUser.id);
        }
        return false;
    }, [initialData, currentUser, isMobile]);

    // Initialize stages based on category config
    const initializeStages = (config) => {
        const newStages = {};
        config.stages.forEach(s => {
            newStages[s] = { active: false, description: '', status: 'NOT_STARTED' };
        });
        return newStages;
    };

    // Reset transient states only when the modal opens or the specific task being edited changes
    useEffect(() => {
        if (isOpen) {
            setIsReopening(false);
            setReopenReason('');
            setPendingStatus(null);
            setIsCanceling(false);
            setCancellationReason('');
            setIsEditingReport(false);
        } else {
            // CRÍTICO: Limpar TODOS os estados de relatório quando o modal fecha
            setReportRequired(false);
            setCurrentReport(null);
            setIsEditingReport(false);
        }
    }, [isOpen]);

    // Limpar estados de relatório quando a tarefa muda
    useEffect(() => {
        // Sempre limpar ao trocar de tarefa
        setReportRequired(false);
        setCurrentReport(null);
        setIsEditingReport(false);
    }, [initialData?.id]);

    // Main loading effect
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                const catId = initialData.category || Category.DEVELOPMENT;
                const config = customCategories.find(c => c.id === catId);
                setCategory(catId);
                setTitle(initialData.title);
                setDescription(initialData.description);
                setStatus(initialData.status || TaskStatus.TO_START);
                setPriority(initialData.priority || Priority.MEDIUM);
                setClient(initialData.client || '');
                
                // Tratar string de data para o input date (precisa ser formato YYYY-MM-DD estrito)
                let parsedDueDate = '';
                if (initialData.due_date) {
                    parsedDueDate = initialData.due_date.includes('T') ? initialData.due_date.split('T')[0] : initialData.due_date;
                }
                setDueDate(parsedDueDate);
                setOp(initialData.op || '');
                setPedido(initialData.pedido || '');
                setItem(initialData.item || '');
                setRnc(initialData.rnc || '');
                setLocation(initialData.location || '');
                setGeo(initialData.geo || null);
                setVisitationRequired(initialData.visitation?.required || false);
                setAttachments(initialData.attachments || []);
                setOutcome(initialData.outcome || null);
                setMeetingActionId(initialData.meeting_action_id || null);

                // Fetch existing reports (both types)
                const fetchReports = async () => {
                    if (!initialData.id || initialData.id.toString().startsWith('test-')) {
                        console.warn('TaskModal: Busca de relatórios ignorada (ID de teste ou inválido):', initialData.id);
                        return;
                    }

                    console.log('TaskModal: Buscando relatórios para task_id:', initialData.id);
                    const { data: reports } = await supabase
                        .from('task_reports')
                        .select('*')
                        .eq('task_id', initialData.id);

                    console.log('TaskModal: Relatórios encontrados:', reports);

                    if (reports && reports.length > 0) {
                        // Prioritize FINAL, then PARCIAL, or just the latest one
                        const final = reports.find(r => r.status === 'FINALIZADO');
                        const anyReport = reports[0];
                        const activeReport = final || anyReport;

                        setCurrentReport(activeReport || null);
                        setReportRequired(!!activeReport);
                        console.log('TaskModal: Relatório carregado:', activeReport?.id);
                    } else {
                        console.log('TaskModal: Nenhum relatório encontrado para esta tarefa');
                        setCurrentReport(null);
                        setReportRequired(false);
                    }
                };
                if (initialData.id) fetchReports();

                // Load extended data
                setTravels(initialData.travels ? initialData.travels.map(t => ({ // Migration for old data
                    ...t,
                    team: Array.isArray(t.team) ? t.team : [t.team || '']
                })) : []);
                setComments(initialData.comments || []);
                setAssignedUsers(initialData.assigned_users || []);
                setVisibility(initialData.visibility || 'PUBLIC');

                if (config && initialData.stages) {
                    const merged = {};
                    config.stages.forEach(s => {
                        const ex = initialData.stages[s];
                        merged[s] = ex ? { ...ex, status: ex.status || 'NOT_STARTED' } : { active: false, description: '', status: 'NOT_STARTED' };
                    });
                    Object.keys(initialData.stages).forEach(k => {
                        if (!config.stages.includes(k)) {
                            merged[k] = initialData.stages[k];
                        }
                    });
                    setStages(merged);
                } else if (config) setStages(initializeStages(config));
            } else {
                const defCat = Category.DEVELOPMENT;
                const defConf = customCategories.find(c => c.id === defCat);
                setCategory(defCat); setTitle(''); setClient(''); setDescription(''); setStatus(TaskStatus.TO_START); setPriority(Priority.MEDIUM);
                setDueDate(''); setOp(''); setPedido(''); setItem(''); setRnc(''); setLocation(''); setGeo(null);
                setVisitationRequired(false); setTravels([]);
                setAttachments([]); setComments([]);
                setAssignedUsers([]); setVisibility('PUBLIC');
                setIsCanceling(false); setCancellationReason('');
                setIsReopening(false); setReopenReason(''); setPendingStatus(null);

                // Limpar estados de relatório
                setCurrentReport(null);

                if (defConf) {
                    setStages(initializeStages(defConf));
                    setVisitationRequired(false);
                    setTravels([]);
                } else {
                    setTravels([]);
                }
            }
        }
    }, [isOpen, initialData]);

    // Fetch clients and vehicles for auto-complete
    useEffect(() => {
        if (isOpen && currentUser) {
            const fetchInitialData = async () => {
                const [clientsRes] = await Promise.all([
                    supabase.from('clients').select('*')
                ]);
                setClientsRegistry(clientsRes.data || []);
            };
            fetchInitialData();
        }
    }, [isOpen, currentUser]);

    // POLI PROACTIVE SUGGESTIONS TRIGGER
    // POLI PROACTIVE SUGGESTIONS TRIGGER (Focus: Address/Location)
    useEffect(() => {
        if (!isOpen || !location || isPoliAnalyzing || initialData) return;
        if (!currentUser || currentUser.poli_interaction === 'DISABLED') return;

        const timer = setTimeout(async () => {
            setIsPoliAnalyzing(true);
            try {
                const taskContext = {
                    title: client,
                    client,
                    due_date: dueDate,
                    category,
                    location
                };

                const suggestion = await getProactiveSuggestion(
                    taskContext,
                    tasks || [],
                    clientsRegistry || []
                );

                if (suggestion && suggestion.hasSuggestion) {
                    setPoliSuggestion(suggestion);
                } else {
                    setPoliSuggestion(null);
                }
            } catch (err) {
                console.error("POLI Suggestion Error:", err);
            } finally {
                setIsPoliAnalyzing(false);
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [location, isOpen, currentUser?.poli_interaction, tasks, clientsRegistry]);

    const handleCategoryChange = (newCat) => {
        if (category === newCat) return;
        setCategory(newCat);
        const conf = customCategories.find(c => c.id === newCat);
        if (conf) {
            setStages(initializeStages(conf));
            if (!initialData) {
                setVisitationRequired(!!conf.fields?.visitation);
                if (conf.fields?.visitation && travels.length === 0) handleAddTravel();
            }
        }
    };

    const handleFileChange = async (e) => {
        if (e.target.files) {
            const newFiles = [];
            for (const file of Array.from(e.target.files)) {
                const b64 = await convertFileToBase64(file);
                newFiles.push({
                    id: generateId(),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content: b64,
                    createdAt: Date.now()
                });
            }
            setAttachments(prev => [...prev, ...newFiles]);
        }
    };

    const handleFileView = (url, filename = 'arquivo') => {
        if (!url) return;

        // Se for uma URL remota simples, abre em nova aba
        if (!url.startsWith('data:')) {
            window.open(url, '_blank');
            return;
        }

        try {
            const parts = url.split(';base64,');
            const contentType = parts[0].split(':')[1];
            const byteCharacters = atob(parts[1]);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: contentType });
            const blobUrl = URL.createObjectURL(blob);

            if (contentType.startsWith('image/') || contentType === 'application/pdf') {
                const newWindow = window.open();
                if (newWindow) {
                    newWindow.location.href = blobUrl;
                } else {
                    const link = document.createElement('a');
                    link.href = blobUrl;
                    link.download = filename;
                    link.click();
                }
            } else {
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                link.click();
            }
        } catch (error) {
            console.error("Erro ao processar arquivo:", error);
            notifyError("Não foi possível abrir este arquivo.");
        }
    };

    const handleAddCustomStage = () => {
        if (!newCustomStageName.trim()) return;
        const name = newCustomStageName.trim();
        setStages(prev => ({
            ...prev,
            [name]: { active: true, description: '', status: 'NOT_STARTED', date: '' }
        }));
        setNewCustomStageName('');
    };

    const handleDeleteCustomStage = (stageName) => {
        setStages(prev => {
            const next = { ...prev };
            delete next[stageName];
            return next;
        });
    };

    const handleSearchLocation = async () => {
        if (!searchLocation.trim()) return;
        setLocationSearching(true);
        setLocationError('');

        try {
            const stateMatch = searchLocation.match(/[,\/\s]([A-Z]{2})(?:\s|$)/);
            const expectedState = stateMatch ? stateMatch[1] : null;
            const stateNames = {
                'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
                'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
                'GO': 'Goiás', 'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul',
                'MG': 'Minas Gerais', 'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná',
                'PE': 'Pernambuco', 'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
                'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima',
                'SC': 'Santa Catarina', 'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
            };
            const expectedStateName = expectedState ? stateNames[expectedState] : null;

            const searchStrategies = [];
            searchStrategies.push({ query: searchLocation, priority: 1 });
            const addressParts = searchLocation.split('-');
            if (addressParts.length >= 2) {
                const neighborhoodAndCity = addressParts.slice(1).join('-').trim();
                searchStrategies.push({ query: neighborhoodAndCity, priority: 2 });
            }
            const cityStateMatch = searchLocation.match(/([^,\-]+)[,\/]\s*([A-Z]{2})/);
            if (cityStateMatch) {
                const cityQuery = `${cityStateMatch[1].trim()}, ${cityStateMatch[2]}, Brasil`;
                searchStrategies.push({ query: cityQuery, priority: 3 });
            }
            const commaParts = searchLocation.split(',');
            if (commaParts.length > 1) {
                const lastPart = commaParts[commaParts.length - 1].trim();
                searchStrategies.push({ query: lastPart, priority: 2 });
            }

            searchStrategies.sort((a, b) => b.priority - a.priority);
            let allResults = [];

            for (const strategy of searchStrategies) {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(strategy.query)}&countrycodes=br,ar,cl,co,mx,pe,uy,py,bo,ec,ve&limit=5`);
                    const data = await response.json();
                    if (data && data.length > 0) {
                        data.forEach(result => {
                            result.strategyPriority = strategy.priority;
                            result.strategyQuery = strategy.query;
                        });
                        allResults.push(...data);
                    }
                } catch (err) { console.error(err); }
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            if (allResults.length > 0) {
                let filteredResults = allResults;
                let stateMatchFound = false;

                if (expectedState) {
                    filteredResults = allResults.filter(result => {
                        const displayName = result.display_name.toUpperCase();
                        const normalizedDisplay = displayName.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                        const matches = displayName.includes(expectedState) ||
                            displayName.includes(expectedState.toLowerCase()) ||
                            (expectedStateName && (displayName.includes(expectedStateName.toUpperCase()) ||
                                normalizedDisplay.includes(expectedStateName.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))));
                        if (matches) stateMatchFound = true;
                        return matches;
                    });
                }

                if (expectedState && !stateMatchFound) {
                    setLocationError(`Endereço não encontrado`);
                    setLocationSearching(false);
                    return;
                }

                if (filteredResults.length === 0 && !expectedState) {
                    filteredResults = allResults;
                }

                filteredResults.sort((a, b) => b.strategyPriority - a.strategyPriority);
                const bestResult = filteredResults[0];

                if (bestResult.importance && bestResult.importance < 0.3) {
                    setLocationError(`Resultado com baixa confiança. Confirme se está correto.`);
                }

                const lat = parseFloat(bestResult.lat);
                const lon = parseFloat(bestResult.lon);
                setGeo({ lat, lng: lon });

                const correctedAddress = searchLocation;
                if (client && location && correctedAddress !== location && bestResult.importance >= 0.4) {
                    const shouldUpdate = window.confirm(
                        `✨ IA detectou correção de endereço!\n\n` +
                        `Cliente: ${client}\n` +
                        `Endereço antigo: ${location}\n` +
                        `Endereço corrigido: ${correctedAddress}\n\n` +
                        `Deseja atualizar o cadastro do cliente com o endereço corrigido?`
                    );

                    if (shouldUpdate) {
                        (async () => {
                            const { error } = await supabase.from('clients').update({
                                address: correctedAddress,
                                street: null, number: null, neighborhood: null, city: null, state: null,
                                address_verified: true, address_verified_at: new Date().toISOString()
                            }).eq('name', client);

                            if (!error) {
                                notifySuccess('Endereço do cliente atualizado!');
                                const { data } = await supabase.from('clients').select('*');
                                setClientsRegistry(data || []);
                            }
                        })();
                    }
                }
                setLocation(correctedAddress);
                if (!bestResult.importance || bestResult.importance >= 0.3) {
                    setLocationError('');
                    setSearchLocation('');
                }
            } else {
                setLocationError(`Endereço não encontrado`);
            }
        } catch (err) {
            console.error('Geocoding error:', err);
            setLocationError('Erro na busca. Tente novamente.');
        } finally {
            setLocationSearching(false);
        }
    };

    const handleConfirmMapPosition = async () => {
        if (!geo) return;
        setLocationSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${geo.lat}&lon=${geo.lng}&zoom=18&addressdetails=1`);
            const data = await response.json();

            if (data && data.display_name) {
                // Formatar endereço mais bonito (Rua, Número - Bairro, Cidade/Estado)
                const addr = data.address;
                const street = addr.road || addr.pedestrian || addr.suburb || '';
                const number = addr.house_number || '';
                const neighborhood = addr.neighbourhood || addr.suburb || '';
                const city = addr.city || addr.town || addr.village || '';
                const state = addr.state_code || addr.state || '';

                let formatted = street;
                if (number) formatted += `, ${number}`;
                if (neighborhood) formatted += ` - ${neighborhood}`;
                if (city || state) {
                    formatted += `, ${city}${city && state ? '/' : ''}${state}`;
                }

                const finalAddress = formatted || data.display_name;

                // Se o cliente já estiver preenchido, perguntar sobre a atualização do cadastro
                if (client && finalAddress !== location) {
                    const foundClient = clientsRegistry.find(c => c.name.toLowerCase() === client.toLowerCase());

                    const shouldUpdate = window.confirm(
                        `📍 Localização exata capturada no mapa!\n\n` +
                        `Endereço sugerido: ${finalAddress}\n\n` +
                        `Deseja atualizar o endereço no cadastro do cliente '${client}'?`
                    );

                    if (shouldUpdate && foundClient) {
                        const { error } = await supabase.from('clients').update({
                            address: finalAddress,
                            street: street || null,
                            number: number || null,
                            neighborhood: neighborhood || null,
                            city: city || null,
                            state: state || null,
                            address_verified: true,
                            address_verified_at: new Date().toISOString()
                        }).eq('id', foundClient.id);

                        if (!error) {
                            const { data: newClients } = await supabase.from('clients').select('*');
                            setClientsRegistry(newClients || []);
                        }
                    }
                }

                setLocation(finalAddress);
                setSearchLocation(finalAddress);
            }
        } catch (err) {
            console.error("Reverse geocoding error:", err);
        } finally {
            setLocationSearching(false);
            setIsMapPickerOpen(false);
        }
    };

    const handleAddTravel = () => {
        setTravels([...travels, { id: generateId(), date: '', isDateDefined: false, team: [''], contacts: '', role: '' }]);
    };

    const updateTravel = (id, field, value) => {
        setTravels(travels.map(t => t.id === id ? { ...t, [field]: value } : t));
    };

    const handleTeamMemberChange = (travelId, index, value) => {
        setTravels(prev => prev.map(t => {
            if (t.id === travelId) {
                const newTeam = [...t.team];
                newTeam[index] = value;
                return { ...t, team: newTeam };
            }
            return t;
        }));
    };

    const addTeamMember = (travelId) => {
        setTravels(prev => prev.map(t => {
            if (t.id === travelId) {
                return { ...t, team: [...t.team, ''] };
            }
            return t;
        }));
    };

    const removeTeamMember = (travelId, index) => {
        setTravels(prev => prev.map(t => {
            if (t.id === travelId) {
                const newTeam = t.team.filter((_, i) => i !== index);
                return { ...t, team: newTeam };
            }
            return t;
        }));
    };

    const removeTravel = (id) => {
        setTravels(travels.filter(t => t.id !== id));
    };

    const handlePostComment = () => {
        if (!newComment.trim()) return;
        const comment = {
            id: generateId(),
            text: newComment,
            createdAt: Date.now(),
            user: currentUser?.username || 'Usuário'
        };
        setComments([...comments, comment]);
        setNewComment('');
    };

    const handleCancelTask = () => {
        if (!cancellationReason.trim()) return;

        const cancelComment = {
            id: Date.now(),
            text: `🔴 TAREFA CANCELADA: ${cancellationReason}`,
            user: currentUser?.username || 'Usuário',
            createdAt: new Date().toISOString()
        };

        const updatedComments = [...comments, cancelComment];

        onSave({
            ...initialData,
            status: TaskStatus.CANCELED,
            comments: updatedComments
        });
        onClose();
    };

    const handleStatusChange = (newStatus) => {
        const restrictedStatuses = [TaskStatus.DONE];
        if (initialData && restrictedStatuses.includes(initialData.status)) {
            setPendingStatus(newStatus);
            setIsReopening(true);
            return;
        }
        setStatus(newStatus);
    };

    const confirmReopen = () => {
        if (!reopenReason.trim()) return;

        const reopenComment = {
            id: Date.now(),
            text: `📝 ALTERAÇÃO DE STATUS: ${reopenReason} (De ${StatusLabels[initialData.status]} para ${StatusLabels[pendingStatus]})`,
            user: currentUser?.username || 'Usuário',
            createdAt: new Date().toISOString()
        };

        setComments([...comments, reopenComment]);
        setStatus(pendingStatus);
        setIsReopening(false);
        setReopenReason('');
        setPendingStatus(null);
    };

    const cancelReopen = () => {
        setIsReopening(false);
        setReopenReason('');
        setPendingStatus(null);
    };

    const handleClientChange = (e) => {
        const val = e.target.value;
        setClient(val);

        if (val.trim().length > 0) {
            const filtered = clientsRegistry.filter(c =>
                c.name.toLowerCase().includes(val.toLowerCase())
            );
            setFilteredClientSuggestions(filtered);
            setShowClientSuggestions(true);
        } else {
            setFilteredClientSuggestions([]);
            setShowClientSuggestions(false);
        }

        const found = clientsRegistry.find(c => c.name.toLowerCase() === val.toLowerCase());
        if (found) {
            const fullAddress = found.street
                ? `${found.street}, ${found.number || ''} - ${found.neighborhood || ''}, ${found.city || ''}/${found.state || ''}`
                : found.address;

            if ((!location || location === '') && fullAddress) {
                setLocation(fullAddress);
                setSearchLocation(fullAddress);
            }
        }
    };

    const handleSelectClient = (clientName) => {
        setClient(clientName);
        setShowClientSuggestions(false);

        const found = clientsRegistry.find(c => c.name.toLowerCase() === clientName.toLowerCase());
        if (found) {
            const fullAddress = found.street
                ? `${found.street}, ${found.number || ''} - ${found.neighborhood || ''}, ${found.city || ''}/${found.state || ''}`
                : found.address;

            if ((!location || location === '') && fullAddress) {
                setLocation(fullAddress);
                setSearchLocation(fullAddress);
            }
        }
    };

    // Trigger finding client address and coordinates when enabling visitation if client is already filled
    useEffect(() => {
        if (visitationRequired && client) {
            const foundClient = clientsRegistry.find(c => c.name.toLowerCase() === client.toLowerCase());
            
            // 1. Tentar endereço e geo do cadastro do cliente
            let clientAddress = '';
            let clientGeo = null;

            if (foundClient) {
                clientAddress = foundClient.street
                    ? `${foundClient.street}, ${foundClient.number || ''} - ${foundClient.neighborhood || ''}, ${foundClient.city || ''}/${foundClient.state || ''}`
                    : foundClient.address;
                
                // Se a tabela clients tivesse lat/lng nativos, pegaríamos aqui
                if (foundClient.lat && foundClient.lng) {
                    clientGeo = { lat: foundClient.lat, lng: foundClient.lng };
                }
            }

            // 2. Se não encontrou geo no cliente, procurar na tarefa mais recente desse cliente que tenha geo
            if (!clientGeo && tasks) {
                const lastTaskWithGeo = tasks
                    .filter(t => t.client?.toLowerCase() === client.toLowerCase() && t.geo)
                    .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))[0];
                
                if (lastTaskWithGeo) {
                    clientGeo = lastTaskWithGeo.geo;
                }
            }

            if (clientAddress && (!location || location === '')) {
                setLocation(clientAddress);
                setSearchLocation(clientAddress);
            }

            if (clientGeo && !geo) {
                setGeo(clientGeo);
            }
        }
    }, [visitationRequired, client, clientsRegistry, tasks]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...initialData,
            category,
            title: title || client, // Usa o título preenchido (que já contém o número)
            description,
            status,
            priority,
            client,
            due_date: dueDate,
            op,
            pedido,
            item,
            rnc,
            parent_followup_id: initialData?.parent_followup_id,
            parent_sac_id: initialData?.parent_sac_id,
            parent_test_id: initialData?.parent_test_id,
            parent_rnc_id: initialData?.parent_rnc_id,
            meeting_action_id: meetingActionId,
            location,
            geo,
            visitation: { required: visitationRequired },
            stages: (() => {
                if (status === TaskStatus.DONE) {
                    const openStages = Object.entries(stages).filter(([_, s]) =>
                        !['COMPLETED', 'FINALIZADO', 'SOLUCIONADO', 'DEVOLVIDO'].includes(s.status)
                    );
                    if (openStages.length > 0) {
                        const confirmFinish = window.confirm(
                            `⚠️ ATENÇÃO: Existem ${openStages.length} etapas que ainda não foram finalizadas.\n\n` +
                            `Deseja marcar todas as etapas como FINALIZADAS automaticamente?`
                        );
                        if (confirmFinish) {
                            const updatedStages = { ...stages };
                            Object.keys(updatedStages).forEach(key => {
                                updatedStages[key] = { ...updatedStages[key], status: 'FINALIZADO' };
                            });
                            return updatedStages;
                        }
                    }
                }
                return stages;
            })(),
            attachments,
            travels,
            comments,
            assigned_users: assignedUsers,
            visibility,
            outcome: status === TaskStatus.DONE ? outcome : null
        });
        onClose();
    };

    if (!isOpen || !currentConfig) return null;

    if (isEditingReport && initialData) {
        return (
            <div className={`fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 md:p-4 animate-in fade-in ${UI_TOKENS.TRANSITION_ALL}`}>
                <div className={`${UI_TOKENS.MODAL_CARD} w-full max-w-5xl max-h-[95vh] md:max-h-[90vh] flex flex-col my-auto overflow-hidden`}>
                    <div className="flex justify-between px-6 py-4 border-b border-slate-700 bg-slate-950 rounded-t-xl shrink-0">
                        <h2 className="text-xl font-semibold text-white">
                            {currentReport ? 'Editar' : 'Gerar'} Relatório Técnico
                        </h2>
                        <button type="button" onClick={() => setIsEditingReport(false)} className="text-slate-400 hover:text-white font-bold bg-slate-800 px-3 py-1 rounded">Voltar</button>
                    </div>
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar bg-[#003399]">
                        <ReportEditor
                            task={initialData}
                            report={currentReport}
                            currentUser={currentUser}
                            onSave={(savedReport) => {
                                setCurrentReport(savedReport);
                                setReportRequired(true);
                            }}
                            onFinalize={(finalizedReport) => {
                                setCurrentReport(finalizedReport);
                                setReportRequired(true);
                                setIsEditingReport(false);
                            }}
                            onOpenPrint={() => {
                                setIsEditingReport(false);
                                onOpenReport(initialData);
                            }}
                            onClose={() => setIsEditingReport(false)}
                            notifySuccess={notifySuccess}
                            notifyError={notifyError}
                            notifyWarning={notifyWarning}
                            notifyInfo={notifyInfo}
                        />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 md:p-4 animate-in fade-in ${UI_TOKENS.TRANSITION_ALL}`}>
            <div className="bg-slate-800 w-full max-w-6xl h-full md:h-[92vh] flex flex-col relative overflow-hidden border border-slate-700 shadow-2xl rounded-xl">
                {/* Status bar */}
                <form id="taskForm" onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
                    {/* Header */}
                    <div className="flex justify-between px-6 py-4 border-b border-slate-700 bg-slate-800 rounded-t-xl shrink-0">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-semibold text-white">{initialData ? 'Editar' : 'Nova'} Tarefa</h2>
                            {lastActivity && (
                                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                                    <History size={10} className="text-brand-400" />
                                    <span>Última alteração por <span className="font-bold text-slate-300">{lastActivity.userName}</span> em {new Date(lastActivity.timestamp).toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {initialData && onOpenReport && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onOpenReport(initialData);
                                        onClose();
                                    }}
                                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                                    title="Imprimir Relatório"
                                >
                                    <Printer size={16} />
                                    IMPRIMIR TAREFA
                                </button>
                            )}
                            <button type="button" onClick={onClose}><X size={20} className="text-slate-400 hover:text-white" /></button>
                        </div>
                    </div>

                    {/* War Room Banner */}
                    {meetingActionId && (
                        <div className="bg-purple-600/20 border-b border-purple-500/30 px-6 py-2 flex items-center justify-between animate-in slide-in-from-top-2 duration-500">
                            <div className="flex items-center gap-2">
                                <div className="p-1 bg-purple-600 rounded text-white shadow-lg">
                                    <Users size={12} />
                                </div>
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">Tarefa Vinculada à Reunião (War Room)</span>
                            </div>
                            <div className="text-[9px] text-purple-300/60 font-medium italic">As alterações refletirão no status do apontamento da reunião</div>
                        </div>
                    )}

                    <div className="overflow-y-auto custom-scrollbar p-6 flex-1 min-h-0 bg-[#1c2e6e]">
                        <datalist id="userSuggestions">
                            {users.map((u) => <option key={u.id} value={u.username} />)}
                        </datalist>

                        <div className="space-y-6">
                            {/* Category Selection */}
                            <div className="p-0">
                                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Layers size={14} />Tipo de Tarefa
                                </label>
                                <select
                                    value={category}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                    disabled={status === TaskStatus.DONE || !canEdit}
                                    className="w-full bg-white text-black border border-slate-300 rounded-lg p-2.5 font-bold focus:ring-2 focus:ring-brand-500 outline-none disabled:bg-gray-200 disabled:cursor-not-allowed"
                                >
                                    {(customCategories || []).map(c => (
                                        <option key={c.id} value={c.id}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Client & Description Section */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-200">Cliente (Identificador Principal)</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-2.5 text-slate-500 z-10" size={16} />
                                        <input
                                            type="text"
                                            required
                                            value={client}
                                            onChange={handleClientChange}
                                            disabled={status === TaskStatus.DONE || !canEdit}
                                            onFocus={(e) => {
                                                const val = e.target.value;
                                                if (val.trim().length > 0) {
                                                    const filtered = clientsRegistry.filter(c =>
                                                        c.name.toLowerCase().includes(val.toLowerCase())
                                                    );
                                                    setFilteredClientSuggestions(filtered);
                                                    setShowClientSuggestions(true);
                                                }
                                            }}
                                            onBlur={() => {
                                                setTimeout(() => setShowClientSuggestions(false), 200);
                                            }}
                                            className="w-full pl-10 pr-3 py-2 bg-white text-black border border-slate-300 rounded-lg outline-none font-bold disabled:bg-gray-200 disabled:cursor-not-allowed"
                                            placeholder="Digite para buscar cliente..."
                                            autoComplete="off"
                                        />

                                        {showClientSuggestions && filteredClientSuggestions.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                                {filteredClientSuggestions.map((c) => (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => handleSelectClient(c.name)}
                                                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-200 last:border-b-0 transition-colors"
                                                    >
                                                        <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                                                        {(c.city || c.state) && (
                                                            <div className="text-xs text-slate-500">
                                                                {c.city}{c.city && c.state ? '/' : ''}{c.state}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Custom Fields based on category */}
                                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                                    {currentConfig.fields.op && <div><label className="text-xs font-bold text-slate-200 mb-1 block">OP</label><input type="text" value={op} onChange={(e) => setOp(e.target.value)} disabled={status === TaskStatus.DONE || !canEdit} className="w-full px-3 py-2 bg-white text-black rounded-lg text-sm border border-slate-300 outline-none font-bold focus:ring-2 focus:ring-brand-500 disabled:bg-gray-200 disabled:cursor-not-allowed" /></div>}
                                    {currentConfig.fields.pedido && <div><label className="text-xs font-bold text-slate-200 mb-1 block">Pedido</label><input type="text" value={pedido} onChange={(e) => setPedido(e.target.value)} disabled={status === TaskStatus.DONE || !canEdit} className="w-full px-3 py-2 bg-white text-black rounded-lg text-sm border border-slate-300 outline-none font-bold focus:ring-2 focus:ring-brand-500 disabled:bg-gray-200 disabled:cursor-not-allowed" /></div>}
                                    {currentConfig.fields.item && <div><label className="text-xs font-bold text-slate-200 mb-1 block">Item</label><input type="text" value={item} onChange={(e) => setItem(e.target.value)} disabled={status === TaskStatus.DONE || !canEdit} className="w-full px-3 py-2 bg-white text-black rounded-lg text-sm border border-slate-300 outline-none font-bold focus:ring-2 focus:ring-brand-500 disabled:bg-gray-200 disabled:cursor-not-allowed" /></div>}
                                    {currentConfig.fields.rnc && <div><label className="text-xs font-bold text-slate-200 mb-1 block">RNC</label><input type="text" value={rnc} onChange={(e) => setRnc(e.target.value)} disabled={status === TaskStatus.DONE || !canEdit} className="w-full px-3 py-2 bg-white text-black rounded-lg text-sm border border-slate-300 outline-none font-bold focus:ring-2 focus:ring-brand-500 disabled:bg-gray-200 disabled:cursor-not-allowed" /></div>}
                                </div>

                                <div>
                                    <label className="text-sm font-bold text-slate-200 mb-1 block">Descrição</label>
                                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={status === TaskStatus.DONE || !canEdit} rows={3} className="w-full px-3 py-2 bg-white text-black border border-slate-300 rounded-lg resize-none text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-200 disabled:cursor-not-allowed" />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                                    <div><label className="text-sm font-bold text-slate-200 mb-1 block">Status</label><select value={status} onChange={(e) => handleStatusChange(e.target.value)} disabled={!canEdit} className="w-full px-3 py-2 bg-white text-black border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 transition-all font-bold disabled:bg-gray-200 disabled:cursor-not-allowed"><option value={TaskStatus.TO_START}>A Iniciar</option><option value={TaskStatus.IN_PROGRESS}>Em Andamento</option><option value={TaskStatus.WAITING_CLIENT}>Aguardando Cliente</option><option value={TaskStatus.DONE}>Finalizada</option><option value={TaskStatus.CANCELED}>Cancelada</option></select></div>
                                    <div><label className="text-sm font-bold text-slate-200 mb-1 block">Prioridade</label><select value={priority} onChange={(e) => setPriority(e.target.value)} disabled={!canEdit} className="w-full px-3 py-2 bg-white text-black border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 transition-all font-bold disabled:bg-gray-200 disabled:cursor-not-allowed"><option value={Priority.LOW}>Baixa</option><option value={Priority.MEDIUM}>Média</option><option value={Priority.HIGH}>Alta</option></select></div>
                                    <div>
                                        <label className="text-sm font-bold text-slate-200 mb-1 block">Prazo de Entrega</label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            disabled={!canEdit}
                                            className="w-full px-3 py-2 bg-white text-black border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-brand-500 transition-all font-bold disabled:bg-gray-200 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {status === TaskStatus.DONE && (
                                    <div className="bg-emerald-900/10 border border-emerald-500/30 p-4 rounded-xl animate-in slide-in-from-left-2 duration-300">
                                        <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Check size={14} /> Resultado da Tarefa
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'SUCCESS', label: 'Sucesso', icon: Check, color: 'bg-emerald-600' },
                                                { id: 'FAILURE', label: 'Falha', icon: X, color: 'bg-rose-600' },
                                                { id: 'PARTIAL', label: 'Parcial', icon: AlertCircle, color: 'bg-amber-600' }
                                            ].map(opt => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setOutcome(opt.id)}
                                                    disabled={status === TaskStatus.DONE || !canEdit}
                                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all border-2 disabled:opacity-50 disabled:cursor-not-allowed ${outcome === opt.id
                                                        ? `${opt.color} border-white/20 text-white shadow-lg scale-105`
                                                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                                                        }`}
                                                >
                                                    <opt.icon size={14} /> {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* POLI PROACTIVE SUGGESTION */}
                                {(poliSuggestion || isPoliAnalyzing) && (
                                    <div className={`p-4 rounded-xl border-2 animate-in fade-in slide-in-from-top-2 duration-300 ${isPoliAnalyzing
                                        ? 'bg-slate-800/50 border-slate-700 border-dashed'
                                        : poliSuggestion.type === 'warning'
                                            ? 'bg-amber-900/20 border-amber-600/50'
                                            : poliSuggestion.type === 'success'
                                                ? 'bg-emerald-900/20 border-emerald-600/50'
                                                : 'bg-brand-900/20 border-brand-600/50'
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-lg ${isPoliAnalyzing ? 'bg-slate-700 animate-pulse' : 'bg-brand-600'
                                                } text-white`}>
                                                <Sparkles size={18} className={isPoliAnalyzing ? 'animate-spin' : ''} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-brand-400">
                                                        Dica da POLI {isPoliAnalyzing && '... analisando'}
                                                    </h4>
                                                    {!isPoliAnalyzing && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPoliSuggestion(null)}
                                                            className="text-slate-500 hover:text-white"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                {!isPoliAnalyzing && (
                                                    <>
                                                        <div className="text-sm font-bold text-white mt-1">{poliSuggestion.title}</div>
                                                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                                                            {poliSuggestion.message}
                                                        </p>
                                                    </>
                                                )}
                                                {isPoliAnalyzing && (
                                                    <div className="space-y-2 mt-2">
                                                        <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse"></div>
                                                        <div className="h-3 bg-slate-700 rounded w-1/2 animate-pulse"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {isReopening && (
                                    <div className="bg-amber-950 border-2 border-amber-500 p-5 rounded-xl my-4 relative shadow-2xl">
                                        <div className="absolute top-0 right-0 p-4 opacity-10"><Unlock size={120} className="text-amber-500" /></div>
                                        <div className="relative z-10">
                                            <h4 className="text-amber-400 font-black text-base flex items-center gap-2 mb-3 uppercase tracking-wide">
                                                <Unlock size={20} /> Alteração Restrita
                                            </h4>
                                            <p className="text-sm text-amber-100/90 mb-4 font-medium leading-relaxed max-w-md">
                                                Esta tarefa já foi concluída. Para alterar seu status, é <strong>obrigatório</strong> informar o motivo da reabertura.
                                            </p>
                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-amber-500 uppercase tracking-wider">Motivo / Justificativa</label>
                                                <textarea
                                                    value={reopenReason}
                                                    onChange={(e) => setReopenReason(e.target.value)}
                                                    placeholder="Digite aqui o motivo pelo qual esta tarefa precisa ser reaberta..."
                                                    className="w-full bg-slate-950/80 border border-amber-500/50 rounded-lg p-3 text-sm text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-500/50 outline-none resize-none placeholder-slate-500"
                                                    rows={3}
                                                    autoFocus
                                                />
                                            </div>
                                            <div className="flex gap-3 justify-end mt-4">
                                                <button type="button" onClick={cancelReopen} className="px-4 py-2 rounded-lg text-sm text-amber-200 hover:bg-amber-900/50 font-bold transition-colors">Cancelar</button>
                                                <button type="button" onClick={confirmReopen} disabled={!reopenReason.trim()} className="px-6 py-2 rounded-lg text-sm bg-amber-500 text-slate-900 hover:bg-amber-400 font-black shadow-lg shadow-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2">
                                                    <Unlock size={16} /> Confirmar e Reabrir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-white/15 rounded-xl p-4">
                                {/* Visibility Toggle */}
                                <div>
                                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Eye size={12} /> Visibilidade</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setVisibility('PUBLIC')}
                                            disabled={!canEdit}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${visibility === 'PUBLIC' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                        >
                                            Público
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVisibility('PRIVATE')}
                                            disabled={!canEdit}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${visibility === 'PRIVATE' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                        >
                                            Privado
                                        </button>
                                    </div>
                                </div>

                                {/* Assignment Selector */}
                                <div className="p-0">
                                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Users size={12} /> Responsáveis</label>
                                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
                                        {users.filter(u => u.id !== currentUser?.id).map(u => {

                                            const isAssigned = assignedUsers.includes(u.id);
                                            return (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    disabled={!canEdit}
                                                    onClick={() => {
                                                        if (isAssigned) setAssignedUsers(assignedUsers.filter(id => id !== u.id));
                                                        else setAssignedUsers([...assignedUsers, u.id]);
                                                    }}
                                                    className={`w-9 h-9 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center text-xs font-black text-white ${isAssigned ? 'border-white scale-105 shadow-lg' : 'border-white/30 opacity-60'} disabled:cursor-not-allowed`}
                                                    style={{ backgroundColor: u.color, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
                                                    title={u.username}
                                                >
                                                    {u.username.substring(0, 1).toUpperCase()}
                                                </button>
                                            );
                                        })}
                                        {users.filter(u => u.id !== currentUser?.id).length === 0 && <span className="text-[10px] text-slate-500 italic">Nenhum outro usuário disponível</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Combined Location & Travel Section */}
                            <div className="border border-white/15 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (status === TaskStatus.DONE || !canEdit) return;
                                            const isRequired = !visitationRequired;
                                            setVisitationRequired(isRequired);
                                            if (isRequired) {
                                                if (travels.length === 0) handleAddTravel();
                                            } else {
                                                setTravels([]);
                                                setLocation('');
                                                setGeo(null);
                                                setSearchLocation('');
                                            }
                                        }}
                                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${visitationRequired ? 'bg-brand-500 border-brand-500' : 'bg-transparent border-white/40 hover:border-white/80'} ${(status === TaskStatus.DONE || !canEdit) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                    >
                                        {visitationRequired && <Check size={12} className="text-white" strokeWidth={3} />}
                                    </button>
                                    <label onClick={() => (status !== TaskStatus.DONE && canEdit) && setVisitationRequired(!visitationRequired)} className={`font-bold text-sm select-none ${status === TaskStatus.DONE ? 'cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-200'}`}>Necessidade de Viagem</label>
                                </div>

                                {visitationRequired && (
                                    <div className="space-y-4 pl-0 md:pl-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {/* Location Search */}
                                        <div className="p-3 border border-slate-800 rounded-lg relative">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xs font-bold text-slate-300 uppercase">Local da Visita</h4>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleSearchLocation}
                                                        disabled={locationSearching}
                                                        className="text-[10px] bg-brand-600 text-white px-3 py-1 rounded hover:bg-brand-700 flex items-center gap-1 disabled:opacity-50"
                                                    >
                                                        {locationSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                                                        Validar Endereço
                                                    </button>
                                                    <button type="button" onClick={() => setIsMapPickerOpen(true)} className="text-[10px] bg-slate-700 text-white px-2 py-1 rounded hover:bg-slate-600 flex items-center gap-1"><MapPin size={12} /> Mapa</button>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mb-2">
                                                <input type="text" value={searchLocation} onChange={(e) => setSearchLocation(e.target.value)} placeholder="Pesquisar endereço..." className="flex-1 bg-white border border-slate-300 rounded text-xs px-3 py-2 text-black font-bold outline-none focus:border-brand-500" />
                                            </div>
                                            {locationError && <div className="text-[10px] text-rose-400 font-bold mb-2">{locationError}</div>}
                                            {geo && <div className="text-[10px] text-emerald-500 font-mono mt-1 flex items-center gap-1"><Check size={10} /> Localização Fixada</div>}
                                        </div>

                                        {/* Travels List */}
                                        <div className="pt-2">
                                            <div className="flex justify-between items-center mb-2 mt-4">
                                                <h4 className="text-xs font-bold text-slate-200 uppercase">Viagens Agendadas</h4>
                                                <button type="button" onClick={() => setTravels([...travels, { id: Date.now().toString(), date: '', team: [''], isDateDefined: true }])} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded hover:bg-brand-700 font-extrabold shadow-lg transition-all">+ Nova Viagem</button>
                                            </div>
                                            <div className="space-y-3">
                                                {travels.map((travel, idx) => (
                                                    <div key={travel.id} className="border border-slate-800 rounded p-4 relative">
                                                        <button type="button" onClick={() => setTravels(travels.filter(t => t.id !== travel.id))} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-lg"><X size={12} /></button>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="text-[10px] text-slate-400 uppercase font-bold mb-1 block">Quando?</label>
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                const newTravels = [...travels];
                                                                                newTravels[idx].isDateDefined = travel.isDateDefined;
                                                                                newTravels[idx].isDateDefined = !travel.isDateDefined;
                                                                                setTravels(newTravels);
                                                                            }}
                                                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${!travel.isDateDefined ? 'bg-amber-500' : 'bg-slate-500/50'}`}
                                                                        >
                                                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${!travel.isDateDefined ? 'translate-x-5' : 'translate-x-1'}`} />
                                                                        </button>
                                                                        <span className={`text-[10px] font-bold ${!travel.isDateDefined ? 'text-amber-400' : 'text-slate-400'}`}>A Definir Data</span>
                                                                    </div>
                                                                    {travel.isDateDefined && <input type="date" value={travel.date} onChange={(e) => {
                                                                        const newTravels = [...travels];
                                                                        newTravels[idx].date = e.target.value;
                                                                        setTravels(newTravels);
                                                                    }} className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 text-black font-bold focus:border-brand-500 outline-none" />}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <label className="text-[10px] text-slate-200 uppercase font-bold">Equipe (Quem vai?)</label>
                                                                    <button type="button" onClick={() => addTeamMember(travel.id)} className="text-[10px] text-brand-400 font-bold hover:text-brand-300 flex items-center gap-1">+ Técnico</button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    {travel.team.map((member, tIdx) => (
                                                                        <div key={tIdx} className="flex gap-2">
                                                                            <input
                                                                                type="text"
                                                                                value={member}
                                                                                onChange={(e) => handleTeamMemberChange(travel.id, tIdx, e.target.value)}
                                                                                list="userSuggestions"
                                                                                className="flex-1 bg-white border border-slate-300 rounded text-xs px-2 py-1.5 text-black font-bold outline-none focus:border-brand-500"
                                                                                placeholder="Nome do técnico..."
                                                                            />
                                                                            {travel.team.length > 1 && (
                                                                                <button type="button" onClick={() => removeTeamMember(travel.id, tIdx)} className="bg-white border border-slate-300 px-2 rounded text-slate-600 hover:bg-red-500 hover:text-white transition-colors"><X size={14} /></button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-700">
                                                                <div>
                                                                    <label className="text-[10px] text-slate-300 uppercase font-bold mb-1 block">Contato no Cliente</label>
                                                                    <input
                                                                        type="text"
                                                                        value={travel.contacts || ''}
                                                                        onChange={(e) => updateTravel(travel.id, 'contacts', e.target.value)}
                                                                        placeholder="Nome do contato..."
                                                                        className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 text-black font-bold outline-none focus:border-brand-500"
                                                                    />
                                                                </div>
                                                                <div>
                                                                    <label className="text-[10px] text-slate-300 uppercase font-bold mb-1 block">Cargo / Função</label>
                                                                    <input
                                                                        type="text"
                                                                        value={travel.role || ''}
                                                                        onChange={(e) => updateTravel(travel.id, 'role', e.target.value)}
                                                                        placeholder="Ex: Gerente, Manutenção..."
                                                                        className="w-full bg-white border border-slate-300 rounded text-xs px-2 py-1.5 text-black font-bold outline-none focus:border-brand-500"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Reports Section - Independent */}
                            <div className="border border-white/15 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (status === TaskStatus.DONE || !canEdit) return;
                                            const isNowRequired = !reportRequired;
                                            setReportRequired(isNowRequired);
                                            if (!isNowRequired) {
                                                setCurrentReport(null);
                                            }
                                        }}
                                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${reportRequired ? 'bg-brand-500 border-brand-500' : 'bg-transparent border-white/40 hover:border-white/80'} ${(status === TaskStatus.DONE || !canEdit) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                    >
                                        {reportRequired && <Check size={12} className="text-white" strokeWidth={3} />}
                                    </button>
                                    <label onClick={() => (status !== TaskStatus.DONE && canEdit) && setReportRequired(!reportRequired)} className={`text-xs font-bold uppercase tracking-wider select-none flex items-center gap-1.5 ${status === TaskStatus.DONE ? 'text-slate-500 cursor-not-allowed' : 'text-slate-200 cursor-pointer'}`}>
                                        <FileText size={12} /> Necessita Relatório
                                    </label>
                                </div>

                                {reportRequired && initialData?.id && (
                                    <div className="space-y-3 pl-0 md:pl-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {/* Botão de Ação Único - Gerenciar Relatório */}
                                        <div className="mt-4">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditingReport(true)}
                                                disabled={status === TaskStatus.DONE || !canEdit}
                                                className="w-full bg-gradient-to-r from-brand-600 to-brand-500 text-white py-3 rounded-lg font-bold text-sm hover:from-brand-700 hover:to-brand-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Printer size={16} />
                                                {currentReport ? 'GERENCIAR RELATÓRIO TÉCNICO' : 'GERAR RELATÓRIO TÉCNICO'}
                                            </button>

                                            {currentReport && (
                                                <div className="mt-2 text-center">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${currentReport.status === 'FINALIZADO'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                                        }`}>
                                                        Status Atual: {currentReport.status === 'FINALIZADO' ? 'FINALIZADO' : 'EM ANDAMENTO (PARCIAL)'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                            <p className="text-[10px] text-slate-400 leading-relaxed text-center">
                                                <span className="text-brand-400 font-bold">Nota:</span> Use este editor único para criar rascunhos, relatórios parciais ou finais. Você pode alterar o status do relatório a qualquer momento dentro do editor.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {reportRequired && !initialData?.id && (
                                    <p className="text-xs text-slate-400 italic text-center py-3 pl-0 md:pl-2">
                                        Salve a tarefa para gerar relatórios
                                    </p>
                                )}
                            </div>

                            {/* Custom Stages Section */}
                            <div className="border border-white/15 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5"><ClipboardList size={12} /> Etapas Customizadas</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newCustomStageName}
                                            onChange={(e) => setNewCustomStageName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomStage())}
                                            disabled={status === TaskStatus.DONE || !canEdit}
                                            placeholder="Nome da etapa..."
                                            className="bg-white border border-slate-300 rounded px-2 py-1 text-[10px] text-black font-bold outline-none focus:border-brand-500 w-40 disabled:bg-gray-200 disabled:cursor-not-allowed"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCustomStage}
                                            disabled={status === TaskStatus.DONE || !canEdit || !newCustomStageName.trim()}
                                            className="bg-brand-600 text-white hover:bg-brand-500 px-3 py-1 rounded text-[10px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >+ Nova Etapa</button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {Object.entries(stages).length > 0 ? (
                                        Object.entries(stages).map(([stageName, stageData]) => {
                                            const isFinished = ['COMPLETED', 'FINALIZADO', 'SOLUCIONADO'].includes(stageData.status);
                                            const isNative = currentConfig.stages.includes(stageName);

                                            return (
                                                <div key={stageName} className={`p-3 rounded-lg border transition-all space-y-2 bg-blue-950/60 ${stageData.active ? 'border-brand-500/70 shadow-md' : 'border-white/10'}`}>
                                                    <div className="flex gap-2 items-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (status === TaskStatus.DONE || !canEdit) return;
                                                                setStages(prev => ({
                                                                    ...prev,
                                                                    [stageName]: { ...prev[stageName], active: !stageData.active }
                                                                }));
                                                            }}
                                                            className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${stageData.active ? 'bg-brand-500 border-brand-500' : 'bg-transparent border-white/40 hover:border-white/80'} ${(status === TaskStatus.DONE || !canEdit) ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                        >
                                                            {stageData.active && <Check size={12} className="text-white" strokeWidth={3} />}
                                                        </button>
                                                        <select
                                                            value={stageData.status || 'NOT_STARTED'}
                                                            onChange={(e) => {
                                                                if (!stageData.active || status === TaskStatus.DONE || !canEdit) return;
                                                                setStages(prev => ({
                                                                    ...prev,
                                                                    [stageName]: { ...prev[stageName], status: e.target.value }
                                                                }));
                                                            }}
                                                            disabled={!stageData.active || status === TaskStatus.DONE || !canEdit}
                                                            className={`text-[10px] font-bold rounded border bg-white px-1 py-0.5 ${isFinished ? 'text-emerald-700 border-emerald-500/50' :
                                                                stageData.status === 'IN_PROGRESS' ? 'text-blue-700 border-blue-500/50' :
                                                                    'text-black border-slate-300'
                                                                } ${!stageData.active ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <option value="NOT_STARTED">A INICIAR</option>
                                                            <option value="IN_PROGRESS">EM ANDAMENTO</option>
                                                            <option value="FINALIZADO">FINALIZADA</option>
                                                            <option value="DEVOLVIDO">DEVOLVIDO</option>
                                                        </select>
                                                        <span className={`flex-1 text-xs font-bold ${!stageData.active ? 'text-white/60' : isFinished ? 'line-through text-white/40' : 'text-white'}`}>
                                                            {stageName}
                                                            {isNative && <span className="ml-2 text-[8px] bg-blue-900 text-white/60 px-1 py-0.5 rounded border border-white/20 uppercase tracking-tighter">Nativo</span>}
                                                        </span>
                                                        {!isNative && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteCustomStage(stageName)}
                                                                className="text-slate-600 hover:text-red-500 opacity-60 hover:opacity-100 transition-all p-1"
                                                                title="Remover etapa"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6 ${!stageData.active ? 'pointer-events-none opacity-30' : ''}`}>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">Descrição / Resultado</label>
                                                            <input
                                                                type="text"
                                                                value={stageData.description || ''}
                                                                onChange={(e) => setStages(prev => ({
                                                                    ...prev,
                                                                    [stageName]: { ...prev[stageName], description: e.target.value }
                                                                }))}
                                                                disabled={status === TaskStatus.DONE || !canEdit}
                                                                placeholder="O que foi feito..."
                                                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[10px] text-black font-bold outline-none focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-bold text-slate-300 uppercase block mb-1">Data da Etapa</label>
                                                            <input
                                                                type="date"
                                                                value={stageData.date || ''}
                                                                onChange={(e) => setStages(prev => ({
                                                                    ...prev,
                                                                    [stageName]: { ...prev[stageName], date: e.target.value }
                                                                }))}
                                                                disabled={status === TaskStatus.DONE || !canEdit}
                                                                className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-[10px] text-black font-bold outline-none focus:border-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-xs text-slate-500 italic p-2 text-center">Nenhuma etapa definida para esta tarefa.</div>
                                    )}
                                </div>
                            </div>

                            {/* Attachments Section */}
                            <div className="border border-white/15 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5"><Paperclip size={12} /> Anexos</label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                            disabled={status === TaskStatus.DONE || !canEdit}
                                            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                            title="Adicionar arquivos"
                                        />
                                        <button type="button" disabled={status === TaskStatus.DONE || !canEdit} className="bg-brand-600/20 text-brand-500 hover:bg-brand-600/40 px-3 py-1 rounded text-[10px] font-bold disabled:opacity-50">Upload</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                    {attachments.map((file, idx) => {
                                        const fileSource = file.content || file.url;
                                        const isImage = file.type?.startsWith('image/');

                                        return (
                                            <div key={idx} className="bg-slate-900 border border-slate-700 p-2 rounded group relative overflow-hidden aspect-video flex flex-col items-center justify-center gap-1">
                                                {isImage ? (
                                                    <img
                                                        src={fileSource}
                                                        alt={file.name}
                                                        onClick={() => handleFileView(fileSource, file.name)}
                                                        className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all cursor-pointer"
                                                    />
                                                ) : (
                                                    <div
                                                        className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors"
                                                        onClick={() => handleFileView(fileSource, file.name)}
                                                    >
                                                        <FileText size={24} className="text-brand-500/50" />
                                                    </div>
                                                )}

                                                {/* Overlay de Nome */}
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1.5 backdrop-blur-sm transform translate-y-full group-hover:translate-y-0 transition-transform">
                                                    <span className="text-[10px] text-white font-medium truncate block text-center">{file.name}</span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                                                    disabled={status === TaskStatus.DONE || !canEdit}
                                                    className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-600 text-white p-1 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20 disabled:hidden"
                                                    title="Remover anexo"
                                                >
                                                    <X size={10} />
                                                </button>
                                                <a
                                                    href={fileSource}
                                                    download={file.name}
                                                    className="absolute top-1 left-1 bg-brand-600/80 hover:bg-brand-500 text-white p-1 rounded backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-20"
                                                    title="Baixar arquivo"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Download size={10} />
                                                </a>
                                            </div>
                                        );
                                    })}
                                    {attachments.length === 0 && <div className="col-span-full text-center py-6 border-2 border-dashed border-slate-700 rounded-lg text-slate-500 text-[10px] uppercase font-bold tracking-widest">Sem arquivos anexados</div>}
                                </div>
                            </div>

                            {/* Comments Section */}
                            <div className="border border-white/15 rounded-xl p-4">
                                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4 block flex items-center gap-1.5"><MessageSquare size={12} /> Comentários e Histórico</label>
                                <div className="space-y-4 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                    {comments.map((comment, idx) => (
                                        <div key={idx} className="bg-slate-800 p-3 rounded-lg border-l-4 border-brand-500 shadow-md animate-in slide-in-from-left-2 duration-300">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black text-brand-600 uppercase tracking-tighter">{comment.user}</span>
                                                <span className="text-[9px] text-slate-400 font-medium italic">{new Date(comment.createdAt).toLocaleString()}</span>
                                            </div>
                                            <p className="text-xs text-white font-medium leading-relaxed break-words">{comment.text}</p>
                                        </div>
                                    ))}
                                    {comments.length === 0 && <p className="text-[10px] text-slate-500 italic text-center py-4">Nenhum comentário registrado</p>}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handlePostComment())}
                                        disabled={status === TaskStatus.DONE}
                                        placeholder={status === TaskStatus.DONE ? "Reabra a tarefa para comentar..." : "Digite um comentário..."}
                                        className="flex-1 px-3 py-2 bg-white border border-slate-300 text-black font-bold rounded-lg text-sm placeholder:text-slate-400 outline-none focus:border-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <button type="button" onClick={handlePostComment} disabled={status === TaskStatus.DONE || !newComment.trim()} className="bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-500 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed">
                                        <Send size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div >
                    {/* Footer */}
                    < div className="px-6 py-4 bg-slate-800 border-t border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0" >
                        <div className="flex items-center gap-4">
                            {initialData && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('Tem certeza que deseja excluir esta tarefa?')) {
                                            onDelete(initialData.id);
                                            onClose();
                                        }
                                    }}
                                    disabled={status === TaskStatus.DONE}
                                    className="text-red-400 hover:text-red-300 text-sm font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Trash2 size={16} /> Excluir Tarefa
                                </button>
                            )}
                            {initialData && initialData.status !== TaskStatus.CANCELED && (
                                <button
                                    type="button"
                                    onClick={() => setShowCancelProtocol(true)}
                                    disabled={status === TaskStatus.DONE}
                                    className="text-slate-400 hover:text-rose-400 text-sm font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-rose-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                    <Ban size={16} /> Cancelar Tarefa
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button type="button" onClick={onClose} className="flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-700 transition-all">Descartar</button>
                            <button type="submit" className="flex-1 md:flex-none px-8 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-black shadow-lg shadow-brand-900/40 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                <Save size={18} /> {initialData ? 'Salvar Alterações' : 'Criar Tarefa'}
                            </button>
                        </div>
                    </div >
                </form >
            </div >

            {/* Map Picker Overlay */}
            {
                isMapPickerOpen && (
                    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[60] flex flex-col animate-in fade-in duration-300">
                        <div className="flex justify-between items-center p-6 bg-slate-900 border-b border-slate-800">
                            <div>
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <div className="p-2 bg-brand-600 rounded-lg"><MapPin size={24} /></div>
                                    Selecionar Localização no Mapa
                                </h3>
                                <p className="text-slate-400 text-sm mt-1 font-medium">Clique no mapa para posicionar o alfinete de destino</p>
                            </div>
                            <button onClick={() => setIsMapPickerOpen(false)} className="p-2 bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white rounded-full transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 relative">
                            <MapContainer
                                center={geo ? [geo.lat, geo.lng] : [-23.5505, -46.6333]}
                                zoom={13}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
                                {geo && <Marker position={[geo.lat, geo.lng]} />}
                                <MapClickHandler onLocationSelect={(latlng) => {
                                    setGeo({ lat: latlng.lat, lng: latlng.lng });
                                }} />
                            </MapContainer>
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4">
                                <div className="bg-slate-900/90 backdrop-blur-xl border-2 border-brand-500/50 p-6 rounded-3xl shadow-2xl">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className={`p-4 rounded-2xl ${geo ? 'bg-emerald-500' : 'bg-slate-700 animate-pulse'} text-white`}>
                                            <MapPin size={32} />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-400 mb-1">Coordenadas Atuais</div>
                                            <div className="text-white font-mono font-bold text-lg">
                                                {geo ? `${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}` : 'Aguardando seleção...'}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleConfirmMapPosition}
                                        className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl text-base font-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-brand-900/40"
                                        disabled={!geo || locationSearching}
                                    >
                                        {locationSearching ? <Loader2 size={24} className="animate-spin mx-auto" /> : 'Confirmar Posição'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Cancellation Protocol Overlay */}
            {
                showCancelProtocol && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                        <div className="bg-slate-900 border-2 border-rose-500/50 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-rose-900/20">
                            <div className="bg-rose-500 p-6 text-white flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl"><Ban size={32} /></div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight">Protocolo de Cancelamento</h3>
                                    <p className="text-rose-100 text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Ação Irreversível</p>
                                </div>
                            </div>
                            <div className="p-8">
                                <p className="text-slate-300 text-sm font-medium mb-6 leading-relaxed">
                                    Você está prestes a cancelar esta tarefa. Por favor, detalhe o <strong>motivo técnico ou comercial</strong> para manter o histórico íntegro.
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 block">Justificativa do Cancelamento</label>
                                        <textarea
                                            value={cancellationReason}
                                            onChange={(e) => setCancellationReason(e.target.value)}
                                            placeholder="Ex: Cliente desistiu da visita / Erro de duplicação..."
                                            className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-white placeholder:text-slate-600 focus:border-rose-500 outline-none transition-all resize-none font-medium h-32"
                                            autoFocus
                                        />
                                    </div>
                                    <div className="flex gap-3 pt-4 font-black">
                                        <button onClick={() => setShowCancelProtocol(false)} className="flex-1 py-4 text-slate-400 hover:text-white transition-colors uppercase text-xs tracking-widest">Manter Ativa</button>
                                        <button
                                            onClick={handleCancelTask}
                                            disabled={!cancellationReason.trim()}
                                            className="flex-1 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-900/40 uppercase text-xs tracking-widest"
                                        >
                                            Confirmar Cancelamento
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default TaskModal;
