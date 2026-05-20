import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fxhhjyyjwhlnqcystbqf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4aGhqeXlqd2hsbnFjeXN0YnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2ODE4NjAsImV4cCI6MjA4OTI1Nzg2MH0.Tp07Pg9CMZrOUglInBJ8Ir6G2Z16fgw6HyQxVrq7U-Q';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase.from('tech_tests').select('produced_quantity, quantity_produced');
  if (error) {
    console.error("Error:", error);
  } else {
    let producedQtyCount = 0;
    let qtyProducedCount = 0;
    data.forEach(d => {
      if (d.produced_quantity !== null && d.produced_quantity !== 0) producedQtyCount++;
      if (d.quantity_produced !== null && d.quantity_produced !== 0) qtyProducedCount++;
    });
    console.log("Total tests count:", data.length);
    console.log("Tests with produced_quantity non-zero:", producedQtyCount);
    console.log("Tests with quantity_produced non-zero:", qtyProducedCount);
  }
}

check();
