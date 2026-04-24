import React from 'react';

const DashboardCard = ({ title, icon: Icon, children, className = "", onClick, isCompact = false }) => (
    <div
        onClick={onClick}
        className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-brand-300' : ''} ${className}`}
    >
        <div className={`bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2 ${isCompact ? 'justify-center py-6' : ''}`}>
            <Icon size={isCompact ? 24 : 18} className="text-brand-600" />
            <h3 className={`font-bold text-slate-700 uppercase tracking-wider ${isCompact ? 'text-[10px]' : 'text-sm'}`}>{title}</h3>
        </div>
        {!isCompact && (
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                {children}
            </div>
        )}
    </div>
);

export default DashboardCard;
