import React from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContainer = ({ notifications, onRemove }) => {
    if (notifications.length === 0) return null;

    const icons = {
        success: <CheckCircle className="text-emerald-500" size={20} />,
        error: <AlertCircle className="text-red-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />,
        warning: <AlertTriangle className="text-amber-500" size={20} />
    };

    const borders = {
        success: 'border-emerald-500',
        error: 'border-red-500',
        info: 'border-blue-500',
        warning: 'border-amber-500'
    };

    return (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
            {notifications.map((n) => (
                <div
                    key={n.id}
                    className={`
                        w-80 bg-white shadow-2xl rounded-xl border-l-4 ${borders[n.type]} p-4 
                        flex items-start gap-4 pointer-events-auto
                        animate-in slide-in-from-right-10 duration-300
                    `}
                >
                    <div className="shrink-0 mt-0.5">
                        {icons[n.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 leading-tight mb-1">{n.title}</h4>
                        <p className="text-xs text-slate-500 leading-snug break-words">{n.message}</p>
                        
                        {n.actions && n.actions.length > 0 && (
                            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                                {n.actions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            action.onClick();
                                            onRemove(n.id);
                                        }}
                                        className={`
                                            px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all
                                            ${action.primary 
                                                ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm border border-brand-700' 
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'}
                                        `}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => onRemove(n.id)}
                        className="text-slate-300 hover:text-slate-500 transition-colors shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ToastContainer;
