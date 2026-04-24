import React from 'react';

const RncStatusGrid = ({ newRnc, setNewRnc, RNC_STATUS }) => {
    return (
        <div className="space-y-4 pt-8 border-t border-slate-100">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Status do Processo</label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Object.entries(RNC_STATUS).map(([key, value]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setNewRnc({ ...newRnc, status: key })}
                        className={`py-3 px-2 rounded-2xl text-[9px] font-black uppercase transition-all border flex flex-col items-center gap-2 ${newRnc.status === key
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xl'
                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        <value.icon size={14} />
                        {value.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default RncStatusGrid;
