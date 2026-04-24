import { TaskStatus } from './taskConstants';

export const StatusBgColors = {
    [TaskStatus.TO_START]: 'bg-slate-100 border-slate-300',
    [TaskStatus.IN_PROGRESS]: 'bg-blue-100 border-blue-300',
    [TaskStatus.WAITING_CLIENT]: 'bg-amber-100 border-amber-300',
    [TaskStatus.CANCELED]: 'bg-red-100 border-red-300',
    [TaskStatus.DONE]: 'bg-emerald-100 border-emerald-300',
};

export const THEMES = {
    DEFAULT: {
        name: 'Clássico',
        bg: '#dae2ed',
        sidebar: 'bg-white',
        card: 'bg-white border-slate-200',
        header: 'bg-white/60 backdrop-blur-md border-slate-200',
        text: 'text-slate-700',
        subtext: 'text-slate-400',
        border: 'border-slate-200'
    },
    MIDNIGHT: {
        name: 'Midnight',
        bg: '#0f172a',
        sidebar: 'bg-slate-900 border-r border-white/10 text-white',
        card: 'bg-slate-800/80 border-white/10 text-slate-100',
        header: 'bg-slate-900/80 backdrop-blur-xl border-white/10',
        text: 'text-white',
        subtext: 'text-slate-400',
        border: 'border-white/10'
    },
    CUSTOM: {
        name: 'Personalizado',
        bg: 'var(--app-bg)',
        sidebar: 'bg-white/40 backdrop-blur-2xl border-white/30',
        card: 'bg-white/60 backdrop-blur-lg border-white/40 shadow-xl shadow-black/5',
        header: 'bg-white/30 backdrop-blur-3xl border-white/40',
        text: 'text-slate-800',
        subtext: 'text-slate-500',
        border: 'border-white/30'
    }
};
export const UI_TOKENS = {
    SHADOW_SM: 'shadow-sm',
    SHADOW_MD: 'shadow-md',
    SHADOW_LG: 'shadow-lg',
    SHADOW_XL: 'shadow-xl',
    SHADOW_2XL: 'shadow-2xl',

    // Standard Card & Modal Styling
    MODAL_CARD: 'bg-white rounded-3xl border border-slate-200 shadow-2xl',
    CONTENT_CARD: 'bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300',

    // Borders
    RADIUS_LG: 'rounded-xl',
    RADIUS_XL: 'rounded-2xl',
    RADIUS_XXL: 'rounded-3xl',

    // Animations
    TRANSITION_ALL: 'transition-all duration-300 ease-in-out',
    TRANSITION_FAST: 'transition-all duration-200 ease-in-out',

    // Glassmorphism (Premium)
    GLASS_HEADER: 'bg-white/70 backdrop-blur-xl border-b border-white/20',
    GLASS_CARD: 'bg-white/60 backdrop-blur-lg border border-white/40 shadow-xl'
};
