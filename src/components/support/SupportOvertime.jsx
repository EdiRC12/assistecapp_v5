import React, { useState, useEffect, useMemo } from 'react';
import { Clock, DollarSign, Calendar, Plus, X, Trash2, Edit2, ShieldAlert, Award, FileSpreadsheet, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import useIsMobile from '../../hooks/useIsMobile';

const SupportOvertime = ({
    supabase,
    currentUser,
    tasks,
    theme,
    notifySuccess,
    notifyError,
    notifyWarning
}) => {
    const isMobile = useIsMobile();

    // Time calculations helpers
    const timeToMinutes = (timeStr) => {
        if (!timeStr) return 0;
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const minutesToHoursStr = (totalMinutes) => {
        if (totalMinutes <= 0) return '0h 00m';
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        return `${hours}h ${mins.toString().padStart(2, '0')}m`;
    };

    const handleTimeInputChange = (value, setter) => {
        let digits = value.replace(/\D/g, '');
        if (digits.length > 4) {
            digits = digits.substring(0, 4);
        }
        if (digits.length <= 2) {
            setter(digits);
        } else {
            const hours = digits.substring(0, 2);
            const minutes = digits.substring(2, 4);
            setter(`${hours}:${minutes}`);
        }
    };

    // Date/Cycle Utilities
    const getPayrollCycle = (dateStr) => {
        // Payroll closes on the 26th of every month.
        // A date from 27/04 to 26/05 belongs to the "Maio" cycle.
        const date = new Date(dateStr + 'T12:00:00');
        const day = date.getDate();
        let month = date.getMonth() + 1; // 1-indexed
        let year = date.getFullYear();

        if (day >= 27) {
            month += 1;
            if (month > 12) {
                month = 1;
                year += 1;
            }
        }
        return { month, year };
    };

    // Core States
    const [logs, setLogs] = useState([]);
    const [preferences, setPreferences] = useState({
        work_start: '07:40',
        work_end: '16:58',
        interval_minutes: 30,
        base_salary: 0,
        contracted_hours: 220
    });
    const [loading, setLoading] = useState(true);
    const [showConfig, setShowConfig] = useState(false);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingLog, setEditingLog] = useState(null);

    // Selected Cycle Filters
    const currentNow = new Date();
    // If today is 27th or later, default to NEXT month cycle
    const initialCycle = getPayrollCycle(
        `${currentNow.getFullYear()}-${(currentNow.getMonth() + 1).toString().padStart(2, '0')}-${currentNow.getDate().toString().padStart(2, '0')}`
    );
    const [selectedMonth, setSelectedMonth] = useState(initialCycle.month);
    const [selectedYear, setSelectedYear] = useState(initialCycle.year);

    // Form inputs state
    const [formDate, setFormDate] = useState('');
    const [formStart, setFormStart] = useState('07:40');
    const [formEnd, setFormEnd] = useState('16:58');
    const [formIntervalStart, setFormIntervalStart] = useState('12:00');
    const [formIntervalEnd, setFormIntervalEnd] = useState('12:30');
    const [formHoliday, setFormHoliday] = useState(false);
    const [formTaskId, setFormTaskId] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Preferences form state
    const [prefStart, setPrefStart] = useState('07:40');
    const [prefEnd, setPrefEnd] = useState('16:58');
    const [prefInterval, setPrefInterval] = useState(30);
    const [prefSalary, setPrefSalary] = useState('');
    const [prefContracted, setPrefContracted] = useState(220);
    const [savingPrefs, setSavingPrefs] = useState(false);

    const months = [
        { v: 1, l: 'Janeiro' }, { v: 2, l: 'Fevereiro' }, { v: 3, l: 'Março' },
        { v: 4, l: 'Abril' }, { v: 5, l: 'Maio' }, { v: 6, l: 'Junho' },
        { v: 7, l: 'Julho' }, { v: 8, l: 'Agosto' }, { v: 9, l: 'Setembro' },
        { v: 10, l: 'Outubro' }, { v: 11, l: 'Novembro' }, { v: 12, l: 'Dezembro' }
    ];

    const years = Array.from({ length: 4 }, (_, i) => currentNow.getFullYear() - 2 + i);

    // Fetch Preferences & Logs
    const loadPreferences = async () => {
        try {
            const { data, error } = await supabase
                .from('support_overtime_preferences')
                .select('*')
                .eq('user_id', currentUser?.id)
                .maybeSingle();

            if (error) throw error;
            if (data) {
                setPreferences({
                    work_start: data.work_start?.substring(0, 5) || '07:40',
                    work_end: data.work_end?.substring(0, 5) || '16:58',
                    interval_minutes: data.interval_minutes ?? 30,
                    base_salary: Number(data.base_salary) || 0,
                    contracted_hours: Number(data.contracted_hours) || 220
                });
                setPrefStart(data.work_start?.substring(0, 5) || '07:40');
                setPrefEnd(data.work_end?.substring(0, 5) || '16:58');
                setPrefInterval(data.interval_minutes ?? 30);
                setPrefSalary(data.base_salary ? String(data.base_salary) : '');
                setPrefContracted(data.contracted_hours || 220);
            }
        } catch (err) {
            console.error('Error fetching preferences:', err);
        }
    };

    const loadLogs = async () => {
        try {
            setLoading(true);
            // Fetch logs for this private user
            const { data, error } = await supabase
                .from('support_overtime_logs')
                .select('*')
                .eq('user_id', currentUser?.id)
                .order('date', { ascending: false });

            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Error loading overtime logs:', err);
            notifyError('Erro ao carregar lançamentos', err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPreferences();
        loadLogs();
    }, []);

    // Save customized journey preferences
    const handleSavePreferences = async (e) => {
        e.preventDefault();
        setSavingPrefs(true);
        try {
            const updates = {
                user_id: currentUser?.id,
                work_start: prefStart,
                work_end: prefEnd,
                interval_minutes: Number(prefInterval),
                base_salary: prefSalary ? Number(prefSalary) : null,
                contracted_hours: Number(prefContracted)
            };

            const { error } = await supabase
                .from('support_overtime_preferences')
                .upsert(updates, { onConflict: 'user_id' });

            if (error) throw error;

            setPreferences({
                work_start: prefStart,
                work_end: prefEnd,
                interval_minutes: Number(prefInterval),
                base_salary: prefSalary ? Number(prefSalary) : 0,
                contracted_hours: Number(prefContracted)
            });

            notifySuccess('Preferências salariais salvas!');
            setShowConfig(false);
        } catch (err) {
            console.error('Error saving preferences:', err);
            notifyError('Erro ao salvar preferências', err.message);
        } finally {
            setSavingPrefs(false);
        }
    };

    // Save or Edit Time Log
    const handleSaveLog = async (e) => {
        e.preventDefault();
        if (!formDate || !formStart || !formEnd || !formIntervalStart || !formIntervalEnd) {
            notifyError('Validação', 'Os campos de Data, Entrada, Saída e Intervalo são obrigatórios.');
            return;
        }

        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(formStart) || !timeRegex.test(formEnd) || !timeRegex.test(formIntervalStart) || !timeRegex.test(formIntervalEnd)) {
            notifyError('Formato Inválido', 'Todos os horários devem estar no formato de 24h correto (Ex: 08:30, 17:15).');
            return;
        }

        const startMin = timeToMinutes(formStart);
        const endMin = timeToMinutes(formEnd);

        if (endMin <= startMin) {
            notifyError('Erro de Horário', 'O horário de saída deve ser posterior ao horário de entrada.');
            return;
        }

        const intStartMin = timeToMinutes(formIntervalStart);
        const intEndMin = timeToMinutes(formIntervalEnd);

        if (intEndMin < intStartMin) {
            notifyError('Erro de Intervalo', 'O horário de término do intervalo deve ser igual ou posterior ao horário de início.');
            return;
        }

        const calculatedInterval = Math.max(0, intEndMin - intStartMin);

        setSubmitting(true);
        try {
            const record = {
                user_id: currentUser?.id,
                date: formDate,
                start_time: formStart,
                end_time: formEnd,
                interval_minutes: calculatedInterval,
                is_holiday_or_weekend: formHoliday,
                associated_task_id: formTaskId || null,
                notes: formNotes.trim() || null
            };

            if (editingLog) {
                // Edit mode
                const { error } = await supabase
                    .from('support_overtime_logs')
                    .update(record)
                    .eq('id', editingLog.id);

                if (error) throw error;
                notifySuccess('Lançamento atualizado!');
            } else {
                // Create mode
                const { error } = await supabase
                    .from('support_overtime_logs')
                    .insert([record]);

                if (error) throw error;
                notifySuccess('Horas lançadas com sucesso!');
            }

            setShowFormModal(false);
            setEditingLog(null);
            setFormNotes('');
            loadLogs();
        } catch (err) {
            console.error('Error saving time log:', err);
            notifyError('Erro ao salvar lançamento', err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (log) => {
        setEditingLog(log);
        setFormDate(log.date);
        setFormStart(log.start_time.substring(0, 5));
        setFormEnd(log.end_time.substring(0, 5));
        
        // Reconstruct start and end times for interval inputs
        setFormIntervalStart('12:00');
        const endMinutes = 12 * 60 + log.interval_minutes;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const formattedEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        setFormIntervalEnd(formattedEndTime);

        setFormHoliday(log.is_holiday_or_weekend);
        setFormTaskId(log.associated_task_id || '');
        setFormNotes(log.notes || '');
        setShowFormModal(true);
    };

    const handleDeleteLog = async (id) => {
        if (!confirm('Deseja realmente apagar este lançamento de ponto?')) return;
        try {
            const { error } = await supabase
                .from('support_overtime_logs')
                .delete()
                .eq('id', id);

            if (error) throw error;
            notifySuccess('Lançamento apagado');
            loadLogs();
        } catch (err) {
            console.error('Error deleting log:', err);
            notifyError('Erro ao deletar', err.message);
        }
    };

    // Cycle Calculations & filtering
    const processedLogs = useMemo(() => {
        return logs.map(log => {
            const cycle = getPayrollCycle(log.date);
            const startMin = timeToMinutes(log.start_time);
            const endMin = timeToMinutes(log.end_time);
            const totalWorked = Math.max(0, endMin - startMin - log.interval_minutes);

            let extra50 = 0;
            let extra100 = 0;

            if (log.is_holiday_or_weekend) {
                // Weekend or Holiday = All worked hours are 100% extra
                extra100 = totalWorked;
            } else {
                // Business day calculation based on customized shift
                const prefStartMin = timeToMinutes(preferences.work_start);
                const prefEndMin = timeToMinutes(preferences.work_end);

                let overtimeBefore = 0;
                let overtimeAfter = 0;

                if (startMin < prefStartMin) {
                    overtimeBefore = prefStartMin - startMin;
                }
                if (endMin > prefEndMin) {
                    overtimeAfter = endMin - prefEndMin;
                }

                extra50 = overtimeBefore + overtimeAfter;
            }

            return {
                ...log,
                cycleMonth: cycle.month,
                cycleYear: cycle.year,
                totalWorked,
                extra50,
                extra100
            };
        });
    }, [logs, preferences]);

    // Filter logs for the selected custom cycle
    const cycleFilteredLogs = useMemo(() => {
        return processedLogs.filter(
            log => log.cycleMonth === selectedMonth && log.cycleYear === selectedYear
        ).sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [processedLogs, selectedMonth, selectedYear]);

    // Financial Metrics Calculations
    const totals = useMemo(() => {
        let totalWorkedMin = 0;
        let totalExtra50Min = 0;
        let totalExtra100Min = 0;

        cycleFilteredLogs.forEach(log => {
            totalWorkedMin += log.totalWorked;
            totalExtra50Min += log.extra50;
            totalExtra100Min += log.extra100;
        });

        // Earnings Estimation
        const hourlyRate = preferences.base_salary > 0 
            ? (preferences.base_salary / preferences.contracted_hours)
            : 0;

        const rate50 = hourlyRate * 1.5;
        const rate100 = hourlyRate * 2.0;

        const estimatedEarnings = 
            ((totalExtra50Min / 60) * rate50) + 
            ((totalExtra100Min / 60) * rate100);

        return {
            workedStr: minutesToHoursStr(totalWorkedMin),
            extra50Str: minutesToHoursStr(totalExtra50Min),
            extra100Str: minutesToHoursStr(totalExtra100Min),
            hourlyRate,
            rate50,
            rate100,
            estimatedEarnings
        };
    }, [cycleFilteredLogs, preferences]);

    // Export raw text file format
    const handleExport = () => {
        if (cycleFilteredLogs.length === 0) {
            notifyWarning('Nenhum dado', 'Não há registros lançados neste ciclo para exportar.');
            return;
        }

        const monthName = months.find(m => m.v === selectedMonth)?.l || 'Ciclo';
        let txt = `====================================================\n`;
        txt += `RELATÓRIO DE HORAS EXTRAS - ASSISTEC\n`;
        txt += `Técnico: ${currentUser?.username || 'N/A'}\n`;
        txt += `Ciclo de Apuração: ${monthName} / ${selectedYear} (Encerramento dia 26)\n`;
        txt += `====================================================\n\n`;

        txt += `RESUMO FINANCEIRO ESTIMADO:\n`;
        txt += `- Salário Base: R$ ${preferences.base_salary.toFixed(2)}\n`;
        txt += `- Horas Normais Trabalhadas: ${totals.workedStr}\n`;
        txt += `- Horas Extras 50% Acumuladas: ${totals.extra50Str}\n`;
        txt += `- Horas Extras 100% Acumuladas: ${totals.extra100Str}\n`;
        txt += `- Adicional Estimado Bruto: R$ ${totals.estimatedEarnings.toFixed(2)}\n\n`;

        txt += `LANÇAMENTOS DETALHADOS:\n`;
        txt += `----------------------------------------------------\n`;
        cycleFilteredLogs.forEach((log) => {
            const dateFmt = new Date(log.date + 'T12:00:00').toLocaleDateString('pt-BR');
            txt += `Data: ${dateFmt}\n`;
            txt += `Jornada: ${log.start_time.substring(0, 5)} - ${log.end_time.substring(0, 5)} (Int: ${log.interval_minutes}m)\n`;
            txt += `Total Trabalhado: ${minutesToHoursStr(log.totalWorked)}\n`;
            txt += `Horas Extras 50%: ${minutesToHoursStr(log.extra50)}\n`;
            txt += `Horas Extras 100%: ${minutesToHoursStr(log.extra100)}\n`;
            if (log.is_holiday_or_weekend) txt += `* Dia Especial / Feriado (100%)\n`;
            if (log.notes) txt += `Observação: ${log.notes}\n`;
            txt += `----------------------------------------------------\n`;
        });

        // Trigger file download
        const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Apuração_Horas_${currentUser?.username || 'Técnico'}_${monthName}_${selectedYear}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        notifySuccess('Relatório exportado!', 'Arquivo TXT baixado com sucesso.');
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 overflow-hidden relative">
            
            {/* Top Toolbar (Filters & Config Toggle) */}
            <div className="p-3 bg-white border-b border-slate-200 shadow-sm shrink-0 flex flex-wrap gap-2 items-center justify-between z-10 relative">
                
                {/* Payroll Month and Year Selectors */}
                <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none"
                    >
                        {months.map(m => (
                            <option key={m.v} value={m.v}>{m.l}</option>
                        ))}
                    </select>

                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                {/* Right toolbar controls */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                    
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className={`flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            showConfig 
                                ? 'bg-slate-100 border-slate-300 text-slate-700' 
                                : 'bg-white border-slate-200 text-slate-500 hover:text-slate-700'
                        }`}
                        title="Configurar jornada e salário"
                    >
                        <Settings size={14} />
                        <span>Configurar</span>
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-600 font-bold px-3 py-1.5 border rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                        title="Exportar dados do ciclo"
                    >
                        <FileSpreadsheet size={14} className="text-emerald-500" />
                        <span>Exportar TXT</span>
                    </button>

                    <button
                        onClick={() => { 
                            setEditingLog(null); 
                            setFormDate('');
                            setFormStart(preferences.work_start || '07:40');
                            setFormEnd(preferences.work_end || '16:58');
                            setFormIntervalStart('12:00');
                            setFormIntervalEnd('12:30');
                            setFormHoliday(false);
                            setFormNotes('');
                            setShowFormModal(true); 
                        }}
                        className="flex items-center gap-1 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-black px-3.5 py-1.5 rounded-lg text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus size={14} />
                        <span>Lançar Horas</span>
                    </button>
                </div>
            </div>

            {/* Config Box Drawer */}
            {showConfig && (
                <div className="p-4 bg-white border-b border-slate-200 shadow-inner shrink-0 z-10 animate-in slide-in-from-top-3 duration-200 relative">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-2 mb-3">
                            <Award size={18} className="text-amber-500" />
                            <h4 className="font-extrabold text-sm text-slate-800">Parâmetros de Jornada & Salário (Confidencial)</h4>
                        </div>
                        
                        <form onSubmit={handleSavePreferences} className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end">
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Entrada Padrão</label>
                                <input
                                    type="time"
                                    value={prefStart}
                                    onChange={(e) => setPrefStart(e.target.value)}
                                    className="w-full px-2 py-1 text-xs border rounded-lg outline-none bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Saída Padrão</label>
                                <input
                                    type="time"
                                    value={prefEnd}
                                    onChange={(e) => setPrefEnd(e.target.value)}
                                    className="w-full px-2 py-1 text-xs border rounded-lg outline-none bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Almoço (Minutos)</label>
                                <input
                                    type="number"
                                    value={prefInterval}
                                    onChange={(e) => setPrefInterval(Number(e.target.value))}
                                    className="w-full px-2 py-1 text-xs border rounded-lg outline-none bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Horas Contratadas</label>
                                <input
                                    type="number"
                                    placeholder="Ex: 220"
                                    value={prefContracted}
                                    onChange={(e) => setPrefContracted(Number(e.target.value))}
                                    className="w-full px-2 py-1 text-xs border rounded-lg outline-none bg-slate-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Salário Base (R$)</label>
                                <input
                                    type="number"
                                    placeholder="Ex: 3500.00"
                                    value={prefSalary}
                                    onChange={(e) => setPrefSalary(e.target.value)}
                                    className="w-full px-2 py-1 text-xs border rounded-lg outline-none bg-slate-50"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={savingPrefs}
                                    className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                                >
                                    {savingPrefs ? 'Salvando...' : 'Salvar'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowConfig(false)}
                                    className="px-2 border rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50"
                                >
                                    Fechar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Financial and Hours Summary Cards */}
            <div className="p-2.5 md:p-6 pb-2 shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 z-0">
                
                {/* Total Worked */}
                <div className="bg-white rounded-xl md:rounded-2xl p-2.5 md:p-4 shadow-sm border border-slate-150 flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2.5 bg-slate-100 text-slate-600 rounded-lg md:rounded-xl shrink-0">
                        <Clock size={isMobile ? 16 : 20} />
                    </div>
                    <div className="min-w-0">
                        <span className="block text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider md:tracking-widest leading-none truncate">
                            {isMobile ? "Horas Trab." : "Horas Trabalhadas"}
                        </span>
                        <span className="text-xs md:text-base font-black text-slate-800 leading-snug mt-0.5 md:mt-1 block truncate">
                            {totals.workedStr}
                        </span>
                    </div>
                </div>

                {/* Overtime 50% */}
                <div className="bg-white rounded-xl md:rounded-2xl p-2.5 md:p-4 shadow-sm border border-slate-150 flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2.5 bg-blue-50 text-blue-600 rounded-lg md:rounded-xl shrink-0">
                        <Clock size={isMobile ? 16 : 20} />
                    </div>
                    <div className="min-w-0">
                        <span className="block text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider md:tracking-widest leading-none truncate">
                            {isMobile ? "Extras 50%" : "Extras Acumuladas 50%"}
                        </span>
                        <span className="text-xs md:text-base font-black text-blue-700 leading-snug mt-0.5 md:mt-1 block truncate">
                            {totals.extra50Str}
                        </span>
                    </div>
                </div>

                {/* Overtime 100% */}
                <div className="bg-white rounded-xl md:rounded-2xl p-2.5 md:p-4 shadow-sm border border-slate-150 flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2.5 bg-amber-50 text-amber-600 rounded-lg md:rounded-xl shrink-0">
                        <Clock size={isMobile ? 16 : 20} />
                    </div>
                    <div className="min-w-0">
                        <span className="block text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-wider md:tracking-widest leading-none truncate">
                            {isMobile ? "Extras 100%" : "Extras Especiais 100%"}
                        </span>
                        <span className="text-xs md:text-base font-black text-amber-600 leading-snug mt-0.5 md:mt-1 block truncate">
                            {totals.extra100Str}
                        </span>
                    </div>
                </div>

                {/* Estimated Earnings Estimation (Currency) */}
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl md:rounded-2xl p-2.5 md:p-4 shadow-sm border border-emerald-500 flex items-center gap-2 md:gap-3">
                    <div className="p-1.5 md:p-2.5 bg-white/20 text-white rounded-lg md:rounded-xl shrink-0">
                        <DollarSign size={isMobile ? 16 : 20} />
                    </div>
                    <div className="min-w-0">
                        <span className="block text-[8px] md:text-[9px] font-black text-white/80 uppercase tracking-wider md:tracking-widest leading-none truncate">
                            {isMobile ? "Adicional (Est.)" : "Adicional Adquirido (Est.)"}
                        </span>
                        <span className="text-xs md:text-lg font-black leading-snug mt-0.5 block truncate font-mono">
                            R$ {totals.estimatedEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>
            </div>

            {/* Time log table display */}
            <div className="flex-1 min-h-0 overflow-y-auto px-2.5 md:px-6 pb-6 custom-scrollbar">
                <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b flex justify-between items-center px-4">
                        <h4 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">
                            Ciclo de Apuração: {months.find(m => m.v === selectedMonth)?.l} / {selectedYear}
                        </h4>
                        <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">
                            Encerramento dia 26
                        </span>
                    </div>

                    {loading ? (
                        <div className="py-12 flex justify-center">
                            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : cycleFilteredLogs.length === 0 ? (
                        <div className="py-16 text-center text-xs text-slate-400">
                            Nenhum lançamento no ciclo atual de {months.find(m => m.v === selectedMonth)?.l}/{selectedYear}.
                            <br />
                            Use o botão <strong>"Lançar Horas"</strong> acima para registrar o seu ponto!
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100 font-black">
                                        <th className="p-3.5 pl-4 uppercase tracking-wider text-[10px]">Data</th>
                                        <th className="p-3.5 uppercase tracking-wider text-[10px]">Entrada</th>
                                        <th className="p-3.5 uppercase tracking-wider text-[10px]">Saída</th>
                                        <th className="p-3.5 uppercase tracking-wider text-[10px]">Intervalo</th>
                                        <th className="p-3.5 uppercase tracking-wider text-[10px]">Total Líquido</th>
                                        <th className="p-3.5 uppercase tracking-wider text-[10px] text-blue-600">Extra 50%</th>
                                        <th className="p-3.5 uppercase tracking-wider text-[10px] text-amber-600">Extra 100%</th>
                                        <th className="p-3.5 uppercase tracking-wider text-[10px]">Descrição / Motivo</th>
                                        <th className="p-3.5 uppercase tracking-wider text-[10px] text-right pr-4">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cycleFilteredLogs.map((log) => {
                                        const dateObj = new Date(log.date + 'T12:00:00');
                                        const weekDay = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
                                        const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

                                        // Try to find referenced task title
                                        const matchedTask = tasks.find(t => t.id === log.associated_task_id);
                                        const referenceText = matchedTask 
                                            ? `Tarefa: ${matchedTask.client || 'N/A'}`
                                            : (log.associated_travel_id ? `Viagem: ${log.associated_travel_id}` : '-');

                                        return (
                                            <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/65 transition-colors">
                                                <td className="p-3.5 pl-4 font-bold text-slate-700">
                                                    <span className="capitalize">{weekDay}</span>, {formattedDate}
                                                </td>
                                                <td className="p-3.5 font-bold text-slate-500">{log.start_time.substring(0, 5)}</td>
                                                <td className="p-3.5 font-bold text-slate-500">{log.end_time.substring(0, 5)}</td>
                                                <td className="p-3.5 text-slate-400">{log.interval_minutes} min</td>
                                                <td className="p-3.5 font-black text-slate-700">
                                                    {minutesToHoursStr(log.totalWorked)}
                                                </td>
                                                <td className="p-3.5 font-black text-blue-600">
                                                    {log.extra50 > 0 ? minutesToHoursStr(log.extra50) : '-'}
                                                </td>
                                                <td className="p-3.5 font-black text-amber-600">
                                                    {log.extra100 > 0 ? minutesToHoursStr(log.extra100) : '-'}
                                                    {log.is_holiday_or_weekend && (
                                                        <span className="ml-1.5 bg-amber-100 text-amber-700 font-extrabold text-[8px] px-1 rounded uppercase tracking-wider">
                                                            100%
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-3.5 text-slate-500 font-bold truncate max-w-[200px]" title={log.notes || ''}>
                                                    {log.notes || '-'}
                                                </td>
                                                <td className="p-3.5 text-right pr-4 shrink-0 whitespace-nowrap">
                                                    <div className="flex gap-2 justify-end">
                                                        <button
                                                            onClick={() => handleEditClick(log)}
                                                            className="text-slate-400 hover:text-brand-600 p-1 hover:bg-brand-50 rounded transition-all"
                                                            title="Editar lançamento"
                                                        >
                                                            <Edit2 size={12} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteLog(log.id)}
                                                            className="text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded transition-all"
                                                            title="Apagar lançamento"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for Time log form (Add/Edit) */}
            {showFormModal && (
                <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                        
                        {/* Header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-brand-600 to-indigo-700 text-white flex items-center justify-between">
                            <h3 className="font-black text-base">
                                {editingLog ? 'Editar Lançamento' : 'Lançar Horas Trabalhadas'}
                            </h3>
                            <button
                                onClick={() => { setShowFormModal(false); setEditingLog(null); }}
                                className="text-white/70 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSaveLog} className="p-6 space-y-4">
                            
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Data do Ponto *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 bg-slate-50/50 font-bold"
                                />
                            </div>

                            {/* Início da Jornada */}
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Início da Jornada *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: 07:40"
                                    maxLength={5}
                                    value={formStart}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => handleTimeInputChange(e.target.value, setFormStart)}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-bold"
                                />
                            </div>

                            {/* Saída para o Intervalo */}
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Saída para o Intervalo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: 12:00"
                                    maxLength={5}
                                    value={formIntervalStart}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => handleTimeInputChange(e.target.value, setFormIntervalStart)}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-bold"
                                />
                            </div>

                            {/* Retorno do Intervalo */}
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Retorno do Intervalo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: 12:30"
                                    maxLength={5}
                                    value={formIntervalEnd}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => handleTimeInputChange(e.target.value, setFormIntervalEnd)}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-bold"
                                />
                            </div>

                            {/* Final da Jornada */}
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Final da Jornada *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: 16:58"
                                    maxLength={5}
                                    value={formEnd}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) => handleTimeInputChange(e.target.value, setFormEnd)}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 font-bold"
                                />
                            </div>

                            {/* Holiday Toggle */}
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-150 rounded-xl p-3.5">
                                <div className="pr-3">
                                    <span className="block text-xs font-black text-slate-700 uppercase tracking-wide leading-none">Feriado ou Final de Semana?</span>
                                    <span className="text-[10px] text-slate-400 mt-1 block">Aplica o multiplicador de 100% sobre toda a jornada.</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formHoliday}
                                        onChange={(e) => setFormHoliday(e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                                    Descrição da Atividade / Motivo das Horas Extras
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="Ex: Startup da injetora atrasou devido à falta de resina, aguardando suporte..."
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-brand-500 resize-none"
                                />
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => { setShowFormModal(false); setEditingLog(null); }}
                                    className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-black rounded-lg text-xs shadow transition-all active:scale-95 cursor-pointer"
                                >
                                    {submitting ? 'Salvando...' : 'Confirmar Lançamento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportOvertime;
