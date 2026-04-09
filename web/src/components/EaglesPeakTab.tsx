import React from 'react';
import { Mountain, Plus } from 'lucide-react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, CartesianGrid } from 'recharts';
import { EaglesPeakLog } from '@/lib/types';
import { processEaglesPeakData } from '@/lib/analytics';

interface EaglesPeakTabProps {
    eaglesPeakLogs: EaglesPeakLog[];
    onOpenLogModal: (type: 'weigh-in' | 'lift' | 'cardio' | 'nutrition' | 'eagles-peak') => void;
}

export function EaglesPeakTab({ eaglesPeakLogs, onOpenLogModal }: EaglesPeakTabProps) {
    const { processedEaglesPeakData, eaglesPeakTicks } = React.useMemo(() => {
        return processEaglesPeakData(eaglesPeakLogs);
    }, [eaglesPeakLogs]);

    return (
        <>
            <div className="mb-4">
                <div className="space-y-6 mb-6">
                    <button
                        onClick={() => onOpenLogModal('eagles-peak')}
                        className="w-full bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-600/30 p-4 rounded-2xl flex items-center justify-between group transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Mountain size={20} className="text-amber-600" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-sm font-bold text-white">Log Ascent</h3>
                                <p className="text-[10px] text-zinc-500">Log Eagles Peak climb</p>
                            </div>
                        </div>
                        <Plus size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </button>
                </div>
            </div>
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 h-64 relative animate-in fade-in zoom-in-95 flex flex-col">
                <div className="absolute top-4 left-6 text-xs font-bold text-zinc-500 uppercase">Eagles Peak Climb</div>
                <div className="flex-1 min-h-0 mt-6">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <ComposedChart data={processedEaglesPeakData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="#3f3f46" strokeWidth={1} />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#52525b', fontSize: 10 }}
                                tickFormatter={(val) => {
                                    const parts = val.split('/');
                                    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
                                    return val;
                                }}
                                tickLine={false}
                                axisLine={false}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                domain={[eaglesPeakTicks[0], eaglesPeakTicks[eaglesPeakTicks.length - 1]]}
                                ticks={eaglesPeakTicks}
                                interval={0}
                                minTickGap={1}
                                type="number"
                                allowDecimals={false}
                                orientation="left"
                                tick={{ fill: '#71717a', fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                            />

                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-black/90 border border-zinc-800 p-3 rounded-lg shadow-xl backdrop-blur-sm">
                                                <p className="text-[10px] font-bold text-zinc-500 mb-2">{label}</p>

                                                <div className="space-y-2">
                                                    {data.roundTrip && (
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-zinc-400 text-xs">Round Trip</span>
                                                            <span className="text-zinc-300 font-bold font-mono">
                                                                {Math.floor(data.roundTrip)}m {Math.round((data.roundTrip % 1) * 60)}s
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-zinc-400 text-xs">Ascent</span>
                                                        <span className="text-amber-500 font-bold font-mono">
                                                            {Math.floor(data.ascent)}m {Math.round((data.ascent % 1) * 60)}s
                                                        </span>
                                                    </div>
                                                    {data.hr && (
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-zinc-400 text-xs">Avg HR</span>
                                                            <span className="text-red-400 font-bold font-mono">{data.hr} bpm</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />

                            <Line type="monotone" dataKey="roundTrip" stroke="#52525b" strokeWidth={2} dot={false} strokeOpacity={0.5} strokeDasharray="4 4" />
                            <Line type="monotone" dataKey="ascent" stroke="#d97706" strokeWidth={3} dot={true} strokeOpacity={0.9} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
    );
}
