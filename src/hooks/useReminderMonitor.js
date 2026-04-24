import { useEffect, useRef } from 'react';

/**
 * Hook para monitorar lembretes com horário e emitir notificações 
 * alguns minutos antes do compromisso.
 */
export const useReminderMonitor = (notes, { notifyWarning, notifyInfo, handleSaveNote }) => {
    // Armazena os IDs das notas que já notificamos para não repetir o aviso
    const notifiedIds = useRef(new Set());
    // Armazena o timestamp de até quando cada nota está em modo "Soneca"
    const snoozedUntil = useRef(new Map());

    useEffect(() => {
        const checkReminders = () => {
            const now = new Date();
            const nowMs = now.getTime();

            // Filtramos apenas notas de hoje que tenham horário e ainda não foram confirmadas
            const upcomingNotes = notes.filter(note => {
                if (!note.note_time || !note.note_date) return false;
                if (note.is_confirmed) return false; // Ignora se o usuário já confirmou
                if (notifiedIds.current.has(note.id)) return false;
                
                // Se estiver em soneca, verifica se o tempo já passou
                if (snoozedUntil.current.has(note.id)) {
                    if (nowMs < snoozedUntil.current.get(note.id)) return false;
                }
                
                const nDate = new Date(note.note_date + 'T12:00:00');
                if (nDate.getFullYear() !== now.getFullYear() ||
                    nDate.getMonth() !== now.getMonth() ||
                    nDate.getDate() !== now.getDate()) {
                    return false;
                }

                return true;
            });

            upcomingNotes.forEach(note => {
                try {
                    const [hours, minutes] = note.note_time.split(':');
                    const targetTime = new Date();
                    targetTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

                    const diffMs = targetTime.getTime() - nowMs;
                    const diffMins = Math.floor(diffMs / (1000 * 60));

                    // Notificar se faltarem entre -5 e 10 minutos (incluindo se já passou um pouco)
                    if (diffMins >= -5 && diffMins <= 10) {
                        const timeStr = note.note_time.substring(0, 5);
                        
                        notifyWarning(
                            `Compromisso às ${timeStr}`,
                            `Lembrete: "${note.content.substring(0, 80)}"`,
                            {
                                duration: 0, // Persistente até confirmar ou soneca
                                actions: [
                                    {
                                        label: 'Vou fazer (Confirmar)',
                                        primary: true,
                                        onClick: () => {
                                            handleSaveNote({ ...note, is_confirmed: true });
                                            notifiedIds.current.add(note.id);
                                        }
                                    },
                                    {
                                        label: 'Soneca (5 min)',
                                        primary: false,
                                        onClick: () => {
                                            const snoozeTime = Date.now() + (5 * 60 * 1000);
                                            snoozedUntil.current.set(note.id, snoozeTime);
                                            // Não adicionamos ao notifiedIds para que ele possa disparar novamente depois
                                        }
                                    }
                                ]
                            }
                        );
                        
                        // Marca como "notificado" nesta volta do loop
                        notifiedIds.current.add(note.id);
                    }
                } catch (err) {
                    console.error('[ReminderMonitor] Erro:', err);
                }
            });
        };

        // Executa a primeira vez e depois a cada 30 segundos
        checkReminders();
        const interval = setInterval(checkReminders, 30000);

        return () => clearInterval(interval);
    }, [notes, notifyWarning, notifyInfo]);

    return null;
};
