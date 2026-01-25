
import React from 'react';

export function StatCard({ label, value, subtext }: { label: string, value: string, subtext?: string }) {
    return (
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-6 rounded-2xl flex flex-col justify-between hover:bg-zinc-800/40 transition-all duration-300 group">
            <div className="flex justify-between items-start mb-3">
                <div className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest group-hover:text-zinc-400 transition-colors">{label}</div>
            </div>
            <div>
                <div className="text-3xl font-bold text-white tracking-tight tabular-nums">{value}</div>
                {subtext && <div className="text-zinc-500 text-xs mt-2 font-medium flex items-center gap-1">{subtext}</div>}
            </div>
        </div>
    );
}
