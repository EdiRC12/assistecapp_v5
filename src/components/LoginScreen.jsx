import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import {
    CheckSquare, AlertCircle, User, Mail, Lock, Loader2, UserPlus, LogIn
} from 'lucide-react';

const LoginScreen = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAction = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        if (!email.trim() || !password.trim() || (isRegistering && !username.trim())) {
            setError('Por favor, preencha todos os campos.');
            setLoading(false);
            return;
        }

        try {
            if (isRegistering) {
                // 1. Check if user already exists
                let { data: existingUser, error: selectError } = await supabase
                    .from('users')
                    .select('email')
                    .eq('email', email)
                    .single();

                if (selectError && selectError.code !== 'PGRST116') throw selectError;
                if (existingUser) throw new Error('Este e-mail já está em uso.');

                // 2. Insert new user
                const { data: newUser, error: insertError } = await supabase
                    .from('users')
                    .insert({
                        username,
                        email,
                        password_hash: password 
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                setSuccessMsg('Conta criada com sucesso! Faça o login.');
                setIsRegistering(false);
                setPassword('');

            } else { // Logging in
                // 1. Fetch user by email
                let { data: user, error: selectError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .single();

                if (selectError || !user) throw new Error('E-mail ou senha inválidos.');

                // 2. Compare password
                if (user.password_hash !== password) throw new Error('E-mail ou senha inválidos.');

                // 3. Save to localStorage for device persistence (1 month)
                const sessionData = {
                    user,
                    expiry: new Date().getTime() + (30 * 24 * 60 * 60 * 1000) // 30 days
                };
                localStorage.setItem('assistec_device_session', JSON.stringify(sessionData));

                onLogin(user);
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
                <div className="bg-brand-600 p-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-white/10 opacity-50 transform rotate-12 scale-150 pointer-events-none"></div>
                    <div className="relative z-10"><div className="mx-auto bg-white/20 w-16 h-16 rounded-xl flex items-center justify-center text-white mb-4 backdrop-blur-sm shadow-lg"><CheckSquare size={32} strokeWidth={3} /></div><h1 className="text-2xl font-bold text-white mb-2">AssisTecApp</h1><p className="text-brand-100 text-sm">{isRegistering ? 'Crie sua conta' : 'Entre para gerenciar tarefas'}</p></div>
                </div>
                <div className="p-8">
                    <form onSubmit={handleAction} className="space-y-5">
                        {error && (<div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-medium flex items-center gap-2"><AlertCircle size={14} />{error}</div>)}
                        {successMsg && (<div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-xs font-medium flex items-center gap-2"><CheckSquare size={14} />{successMsg}</div>)}

                        {isRegistering && (
                            <div><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Usuário</label><div className="relative"><User className="absolute left-3 top-2.5 text-slate-400" size={18} /><input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Seu nome de usuário" /></div></div>
                        )}

                        <div><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">E-mail</label><div className="relative"><Mail className="absolute left-3 top-2.5 text-slate-400" size={18} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="seu@email.com" autoFocus /></div></div>
                        <div><label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5">Senha</label><div className="relative"><Lock className="absolute left-3 top-2.5 text-slate-400" size={18} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" placeholder="Sua senha" /></div></div>
                        <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-lg shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 mt-2 disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin" /> : (isRegistering ? <><UserPlus size={20} /><span>Criar Conta</span></> : <><LogIn size={20} /><span>Entrar</span></>)}
                        </button>
                    </form>
                    <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-3 text-center">
                        <button 
                            onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccessMsg(''); setPassword(''); }} 
                            className={`py-2 px-4 rounded-xl transition-all font-bold ${error && error.includes('Registre-se') ? 'bg-brand-50 text-brand-700 border-2 border-brand-200 animate-pulse' : 'text-slate-500 hover:text-brand-600'}`}
                        >
                            {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem conta? Clique aqui para Registrar/Ativar'}
                        </button>
                        <button
                            onClick={() => {
                                if (confirm('Isso limpará as preferências salvas no seu navegador (filtros, larguras de coluna, etc). Deseja continuar?')) {
                                    localStorage.clear();
                                    window.location.reload();
                                }
                            }}
                            className="text-[10px] text-slate-400 hover:text-red-500 transition-colors uppercase font-bold tracking-widest mt-2"
                        >
                            Limpar Dados do Navegador
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginScreen;
