import React from 'react';
import { Activity, Scale, Dumbbell, Utensils, Mountain } from 'lucide-react';
import { Lift, EaglesPeakLog, HydrationLog, WellnessLog } from '@/lib/types';

interface RecentActivityProps {
    activeGraph: string;
    weighIns: any[];
    lifts: Lift[];
    cardio: any[];
    nutrition: any[];
    eaglesPeakLogs: EaglesPeakLog[];
    hydrationLogs: HydrationLog[];
    wellnessLogs: WellnessLog[];
}

export function RecentActivity({ activeGraph, weighIns, lifts, cardio, nutrition, eaglesPeakLogs, hydrationLogs, wellnessLogs }: RecentActivityProps) {
    return (
        <div className="space-y-6 pt-6 border-t border-zinc-800/50 pb-10">
            <div className="flex items-center gap-2 mb-2">
                {activeGraph === 'biometrics' && <Scale size={18} className="text-purple-500" />}
                {activeGraph === 'exercise' && <Dumbbell size={18} className="text-emerald-500" />}
                {activeGraph === 'nutrition' && <Utensils size={18} className="text-amber-500" />}
                {activeGraph === 'eagles-peak' && <Mountain size={18} className="text-amber-600" />}
                {!['biometrics', 'exercise', 'nutrition', 'eagles-peak'].includes(activeGraph) && <Activity size={18} className="text-zinc-500" />}

                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Recent Activity</h2>
            </div>

            <div className="rounded-xl border border-zinc-800/50 overflow-hidden bg-zinc-900/20 backdrop-blur-sm">
                <div className="">
                    <table className="w-full text-left border-collapse">
                        <tbody>
                            {(() => {
                                // Local Filtering Logic for Recent Activity
                                let localActivity: any[] = [];
                                // Combine all data sources
                                const combined = [
                                    ...weighIns.map(i => ({ ...i, type: 'weigh-in' })),
                                    ...lifts.map(i => ({ ...i, type: 'lift' })),
                                    ...cardio.map(i => ({ ...i, type: 'cardio' })),
                                    ...nutrition.map(i => ({ ...i, type: 'nutrition' })),
                                    ...eaglesPeakLogs.map(i => ({ ...i, type: 'eagles-peak' })),
                                    ...(hydrationLogs || []).map(i => ({ ...i, type: 'hydration' })),
                                    ...(wellnessLogs || []).map(i => ({ ...i, type: 'wellness' }))
                                ];

                                // Filter by active graph
                                if (activeGraph === 'biometrics') {
                                    localActivity = combined.filter(i => i.type === 'weigh-in');
                                } else if (activeGraph === 'exercise') {
                                    localActivity = combined.filter(i => i.type === 'lift' || i.type === 'cardio');
                                } else if (activeGraph === 'nutrition') {
                                    localActivity = combined.filter(i => i.type === 'nutrition');
                                } else if (activeGraph === 'eagles-peak') {
                                    localActivity = combined.filter(i => i.type === 'eagles-peak');
                                } else if (activeGraph === 'wellness') {
                                    localActivity = combined.filter(i => i.type === 'wellness' || i.type === 'hydration');
                                }

                                // Sort by date descending
                                localActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                // Take top 20
                                const displayActivity = localActivity.slice(0, 20);

                                if (displayActivity.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-zinc-600 text-xs">No recent activity for this section</td>
                                        </tr>
                                    );
                                }

                                return displayActivity.map((item, index) => {
                                    const isNewDay = index > 0 && item.date !== displayActivity[index - 1].date;
                                    return (
                                        <React.Fragment key={`group-${index}`}>
                                            {isNewDay && (
                                                <tr>
                                                    <td colSpan={4} className="p-0">
                                                        <div className="h-1 w-full bg-zinc-800/50"></div>
                                                    </td>
                                                </tr>
                                            )}
                                            <tr key={`a-${index}`} className="group hover:bg-white/5 transition-colors border-b border-zinc-800/30 last:border-0">
                                                <td className="p-3 text-zinc-500 font-mono text-xs whitespace-nowrap w-2 align-middle">
                                                    {(() => {
                                                        // Simplified Date Logic
                                                        const dPart = item.date.split(' ')[0];
                                                        if (dPart.includes('/')) {
                                                            const parts = dPart.split('/');
                                                            if (parts.length >= 2) return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}`;
                                                        }
                                                        if (dPart.includes('-')) {
                                                            const parts = dPart.split('-');
                                                            if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
                                                        }
                                                        return dPart;
                                                    })()}
                                                </td>

                                                {/* MIDDLE COLUMN: Description */}
                                                <td className={`p-3 text-zinc-300 font-medium text-xs align-middle ${item.type === 'weigh-in' ? 'w-[1px] px-0' : 'w-auto max-w-[140px] truncate'}`} title={
                                                    item.type === 'cardio' ? item.activity :
                                                        item.type === 'lift' ? item.exercise :
                                                            ''
                                                }>
                                                    {item.type === 'cardio' && item.activity}
                                                    {item.type === 'lift' && item.exercise}
                                                    {item.type === 'nutrition' && <span className="text-zinc-500 italic">Nutrition</span>}
                                                    {item.type === 'eagles-peak' && <span className="text-amber-600">Eagles Peak</span>}
                                                    {item.type === 'wellness' && <span className="text-blue-300">Mood: {item.mood}/5</span>}
                                                    {item.type === 'hydration' && <span className="text-cyan-400">Hydration</span>}
                                                </td>

                                                {/* VALUES COLUMN - COMPACT */}
                                                <td className="p-3 font-bold text-white/50 text-left text-xs align-middle whitespace-nowrap">
                                                    {item.type === 'cardio' && (
                                                        <span>
                                                            <span className="text-blue-400">{item.duration}m</span>
                                                            {item.heartRate && (
                                                                <>
                                                                    <span className="text-zinc-600 mx-1">/</span>
                                                                    <span className="text-red-400">{item.heartRate}bpm</span>
                                                                </>
                                                            )}
                                                            {(item.distance && !isNaN(parseFloat(item.distance))) && (
                                                                <>
                                                                    <span className="text-zinc-600 mx-1">/</span>
                                                                    <span className="text-sky-300">{item.distance}mi</span>
                                                                </>
                                                            )}
                                                        </span>
                                                    )}
                                                    {item.type === 'lift' && (
                                                        <span>
                                                            <span className="text-emerald-400">{item.weight}lbs</span>
                                                            <span className="text-zinc-600 mx-1">/</span>
                                                            <span className="text-zinc-400">{item.sets}x{item.reps}</span>
                                                        </span>
                                                    )}
                                                    {item.type === 'weigh-in' && (
                                                        <span>
                                                            <span className="text-purple-400">{item.weight}lb</span>
                                                            {item.bodyFat && <span className="text-zinc-600 mx-1">/</span>}
                                                            {item.bodyFat && <span className="text-emerald-400">{item.bodyFat}%</span>}
                                                        </span>
                                                    )}
                                                    {item.type === 'nutrition' && (
                                                        <span>
                                                            <span className="text-white">{item.calories}</span>
                                                            <span className="text-zinc-600 mx-1">/</span>
                                                            <span className="text-amber-500">{item.protein}p</span>
                                                        </span>
                                                    )}
                                                    {item.type === 'eagles-peak' && (
                                                        <span>
                                                            <span className="text-white">
                                                                {item.ascentTime?.split(':').length >= 3 ? item.ascentTime.split(':').slice(0, 2).join(':') : item.ascentTime}
                                                            </span>
                                                            {item.overallTime && (
                                                                <>
                                                                    <span className="text-zinc-600 mx-1">/</span>
                                                                    <span className="text-amber-500">
                                                                        {item.overallTime?.split(':').length >= 3 ? item.overallTime.split(':').slice(0, 2).join(':') : item.overallTime}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </span>
                                                    )}
                                                    {item.type === 'hydration' && (
                                                        <span>
                                                            <span className="text-cyan-300">+{item.amount}oz</span>
                                                        </span>
                                                    )}
                                                </td>

                                                {/* NOTES COLUMN */}
                                                <td className="p-3 align-middle w-auto text-left">
                                                    <div className="relative group flex justify-start w-full">
                                                        <div className="text-[11px] text-zinc-600 italic truncate max-w-[150px] cursor-help hover:text-zinc-400 transition-colors">
                                                            {item.notes}
                                                        </div>
                                                        {/* Custom Dark Tooltip */}
                                                        {item.notes && (
                                                            <div className={`absolute ${index < 3 ? 'top-full mt-1' : 'bottom-full mb-1'} right-0 w-max max-w-[250px] hidden group-hover:block z-[60]`}>
                                                                <div className="bg-[#111] border border-zinc-800 p-3 rounded-xl shadow-2xl shadow-black/50 text-[11px] text-zinc-300 leading-snug whitespace-normal break-words text-left">
                                                                    {item.notes}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
