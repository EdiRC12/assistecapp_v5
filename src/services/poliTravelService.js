import { supabase } from '../supabaseClient';

/**
 * POLI Travel Analysis Service
 * Provides intelligent suggestions for travel optimization
 */

/**
 * Calculate distance between two geographic points (Haversine formula)
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Distance in kilometers
 */

/**
 * Check for trips without cost, km or vehicle filled (deep search)
 * @param {Array} tasks - All tasks
 * @returns {Array} Array of trip cost reminder suggestions
 */
export const analyzeTripCosts = (tasks) => {
    const suggestions = [];
    const processedTaskIds = new Set();

    tasks.forEach(task => {
        // Skip if already finalized globally or already processed
        if (!task.visitation?.required || task.status !== 'DONE' || task.trip_info_finalized || processedTaskIds.has(task.id)) return;

        let hasPending = false;
        let details = '';

        // Check if it has specific travels array
        if (task.travels && task.travels.length > 0) {
            // Find entries missing info AND not marked as finalized
            const pendingEntries = task.travels.filter(t =>
                !t.is_finalized && (
                    (!t.cost || t.cost === 0) ||
                    (!t.km_end || t.km_end === 0) ||
                    (!t.vehicle || !t.vehicle.trim())
                )
            );

            if (pendingEntries.length > 0) {
                hasPending = true;
                details = `${pendingEntries.length} registro(s) incompleto(s) na lista de viagens.`;
            }
        } else {
            // Check task-level fields (Legacy or Single trip)
            const hasNoCost = !task.trip_cost || task.trip_cost === 0;
            const hasNoKm = !task.trip_km_end || task.trip_km_end === 0;
            const hasNoVehicle = !task.vehicle_id && (!task.vehicle_info || !task.vehicle_info.trim());

            if (hasNoCost || hasNoKm || hasNoVehicle) {
                hasPending = true;
                details = 'Campos de custo, KM ou veículo não preenchidos.';
            }
        }

        if (hasPending) {
            processedTaskIds.add(task.id);
            suggestions.push({
                type: 'trip_cost_reminder',
                task_id: task.id,
                title: `Custos/KMs Pendentes - ${task.client || task.title}`,
                description: `A viagem para ${task.client || task.title} foi finalizada mas faltam informações. ${details}`,
                priority: 'low',
                data: {
                    trip_date: task.visitation?.date || task.due_date,
                    client: task.client || task.title
                }
            });
        }
    });

    return suggestions;
};

/**
 * Run all POLI travel analyses and save suggestions to database
 * @param {Array} tasks - All tasks
 * @param {Array} clients - All clients
 * @returns {Promise<Object>} Summary of suggestions created
 */
export const runTravelAnalysis = async (tasks, clients) => {
    try {
        // Run only trip costs analysis
        const costSuggestions = analyzeTripCosts(tasks);

        const allSuggestions = [...costSuggestions];

        // 1. DELETE PREVIOUS PENDING SUGGESTIONS FOR TRAVEL TOPICS
        // We keep the old types in the list for a final cleanup in case some are left in DB
        await supabase
            .from('poli_suggestions')
            .delete()
            .eq('status', 'pending')
            .in('type', ['route_optimization', 'holiday_alert', 'trip_cost_reminder']);

        // 2. Insert fresh suggestions only if any exist
        if (allSuggestions.length > 0) {
            const { error: insertError } = await supabase.from('poli_suggestions').insert(
                allSuggestions.map(s => ({
                    ...s,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }))
            );
            if (insertError) console.error('Error inserting suggestions:', insertError);
        }

        // 3. Return only the fresh pending travel suggestions (Now only trip_cost_reminder)
        const { data: freshSuggestions, error: fetchError } = await supabase
            .from('poli_suggestions')
            .select('*')
            .eq('status', 'pending')
            .eq('type', 'trip_cost_reminder');

        if (fetchError) throw fetchError;
        return freshSuggestions || [];
    } catch (error) {
        console.error('Error running travel analysis:', error);
        throw error;
    }
};
