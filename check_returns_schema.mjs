import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fxhhjyyjwhlnqcystbqf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4aGhqeXlqd2hsbnFjeXN0YnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2ODE4NjAsImV4cCI6MjA4OTI1Nzg2MH0.Tp07Pg9CMZrOUglInBJ8Ir6G2Z16fgw6HyQxVrq7U-Q'
);

async function checkSchema() {
  console.log('--- product_returns Columns ---');
  const { data: returns } = await supabase.from('product_returns').select('*').limit(1);
  if (returns && returns.length > 0) {
    console.log(Object.keys(returns[0]));
  } else {
    // Try to get headers even without data if possible, or check if it's empty
    console.log('No data found in product_returns');
  }

  console.log('\n--- rnc_records Columns ---');
  const { data: rnc } = await supabase.from('rnc_records').select('*').limit(1);
  if (rnc && rnc.length > 0) {
    console.log(Object.keys(rnc[0]));
  }

  console.log('\n--- sac_tickets Columns ---');
  const { data: sac } = await supabase.from('sac_tickets').select('*').limit(1);
  if (sac && sac.length > 0) {
    console.log(Object.keys(sac[0]));
  }
}

checkSchema().catch(console.error);
