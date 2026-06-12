import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://fxhhjyyjwhlnqcystbqf.supabase.co'
// IMPORTANT: Replace with your anon key. DO NOT use the service_role key.
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4aGhqeXlqd2hsbnFjeXN0YnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2ODE4NjAsImV4cCI6MjA4OTI1Nzg2MH0.Tp07Pg9CMZrOUglInBJ8Ir6G2Z16fgw6HyQxVrq7U-Q'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Auto-refresh session when the window/tab is focused, preventing 'JWT expired' errors
if (typeof window !== 'undefined') {
  window.addEventListener('focus', async () => {
    try {
      const { data } = await supabase.auth.getSession()
      if (data?.session) {
        console.log('Sessão do Supabase verificada/atualizada via foco da janela.')
      }
    } catch (err) {
      console.warn('Erro ao atualizar sessão ao focar janela:', err)
    }
  })
}
