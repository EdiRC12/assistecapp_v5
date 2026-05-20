import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fxhhjyyjwhlnqcystbqf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4aGhqeXlqd2hsbnFjeXN0YnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2ODE4NjAsImV4cCI6MjA4OTI1Nzg2MH0.Tp07Pg9CMZrOUglInBJ8Ir6G2Z16fgw6HyQxVrq7U-Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log("=== INSPECTING TECH_TESTS ===");
    const { data, error } = await supabase
        .from('tech_tests')
        .select('*')
        .limit(3);

    if (error) {
        console.error("Error fetching tech_tests:", error);
    } else {
        console.log("tech_tests columns:", Object.keys(data[0] || {}));
        console.log("Sample records:", JSON.stringify(data, null, 2));
    }

    console.log("\n=== INSPECTING TASKS ===");
    const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .limit(3);

    if (taskError) {
        console.error("Error fetching tasks:", taskError);
    } else {
        console.log("tasks columns:", Object.keys(taskData[0] || {}));
        console.log("Sample records (item / client / op):", taskData.map(t => ({
            id: t.id,
            title: t.title,
            client: t.client,
            item: t.item,
            op: t.op
        })));
    }
}

check();
