
import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CustomTooltip = ({ active, payload, label, unit }: { active?: boolean, payload?: any[], label?: string, unit: string }) => {
    if (active && payload && payload.length) {
        const daily = payload.find((p) => p.dataKey === 'weight' || p.dataKey === 'bodyFat');
        const avg = payload.find((p) => p.dataKey === 'weightAvg' || p.dataKey === 'bodyFatAvg');

        // Determine label color based on unit (lbs = weight = purple, % = fat = green)
        const labelColor = unit === ' lbs' ? 'text-purple-400' : 'text-emerald-400';

        return (
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl backdrop-blur-lg z-50">
                <p className="text-zinc-400 text-[10px] font-mono mb-2 uppercase tracking-wider">{label}</p>
                {avg && (
                    <div className="flex justify-between gap-4 text-xs mb-1">
                        <span className={`${labelColor} font-bold`}>7d Avg:</span>
                        <span className="text-white font-mono">{Number(avg.value).toFixed(1)}{unit}</span>
                    </div>
                )}
                {daily && (
                    <div className="flex justify-between gap-4 text-xs">
                        <span className="text-zinc-400 font-medium">Daily:</span>
                        <span className="text-white font-mono">{Number(daily.value).toFixed(1)}{unit}</span>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

// Notes Tooltip Component
// index is passed to determine if we should flip the tooltip direction (for top rows)
export const NoteTooltip = ({ text, index, widthClass }: { text: string, index: number, widthClass?: string }) => {
    if (!text) return null;
    const isTopRow = index < 3;

    return (
        <div className="relative group/note flex justify-start w-full">
            <div className={`text-left text-[11px] text-zinc-600 italic truncate cursor-help hover:text-zinc-400 transition-colors ${widthClass || 'max-w-[150px]'}`}>
                {text}
            </div>

            {/* Tooltip Popup */}
            {/* If top row, show below (top-full). Else show above (bottom-full) */}
            {/* Anchored right-0 to avoid overflow on right edge of screen */}
            <div className={`absolute ${isTopRow ? 'top-full mt-1' : 'bottom-full mb-1'} right-0 w-auto max-w-[350px] hidden group-hover/note:block z-50`}>
                <div className="bg-black/95 backdrop-blur-md border border-zinc-700 p-3 rounded-xl shadow-2xl text-xs text-zinc-200 leading-snug whitespace-normal break-words relative text-left">
                    {text}
                </div>
            </div>
        </div>
    );
};
