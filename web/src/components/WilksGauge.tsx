
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { calculateWilks, getWilksLevel, determinePersonalBests, getTestedOneRepMaxes } from '@/lib/analytics';
import { Lift } from '@/lib/types';
import { Trophy, CheckCircle } from 'lucide-react';

interface WilksGaugeProps {
    currentWeight: number; // lbs
    lifts: Lift[];
}

export function WilksGauge({ currentWeight, lifts }: WilksGaugeProps) {
    const bests = React.useMemo(() => determinePersonalBests(lifts), [lifts]);
    const testData = React.useMemo(() => getTestedOneRepMaxes(lifts), [lifts]);

    const squat = bests['Squat']?.e1rm ?? 0;
    const bench = bests['Bench']?.e1rm ?? 0;
    const deadlift = bests['Deadlift']?.e1rm ?? 0;
    const total = squat + bench + deadlift;

    const wilks = calculateWilks(currentWeight, total, 'lbs');
    const { level, color, next } = getWilksLevel(wilks);

    const maxVal = next + 50;
    const gaugeData = [
        { name: 'Score', value: wilks },
        { name: 'Remaining', value: maxVal - wilks }
    ];

    const getColorHex = (c: string) => {
        if (c.includes('emerald')) return '#10b981';
        if (c.includes('amber')) return '#f59e0b';
        if (c.includes('sky') || c.includes('slate')) return '#38bdf8';
        if (c.includes('bronze')) return '#cd7f32';
        if (c.includes('purple')) return '#a855f7';
        return '#52525b';
    };

    const activeColor = color.includes('bronze') ? '#CD7F32' : getColorHex(color);

    const trophies = [
        { label: 'Squat',    pb: bests['Squat'],    tests: testData['Squat'] },
        { label: 'Bench',    pb: bests['Bench'],    tests: testData['Bench'] },
        { label: 'Deadlift', pb: bests['Deadlift'], tests: testData['Deadlift'] },
        { label: 'OHP',      pb: bests['OHP'],      tests: testData['OHP'] },
    ];

    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });

    return (
        <div
            className="bg-zinc-900/40 backdrop-blur-md border rounded-2xl p-6 relative overflow-hidden flex flex-col shadow-lg shadow-black/20 transition-colors duration-500"
            style={{ borderColor: `${activeColor}30` }}
        >
            {/* Background glow */}
            <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px] -z-10 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${activeColor} 0%, transparent 70%)`, opacity: 0.2 }}
            />

            {/* ── Top Row ── */}
            <div className="flex justify-between items-start z-10">
                <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Wilks</div>
                    <div className={`text-3xl font-black ${color} tracking-tighter`}>{wilks.toFixed(0)}</div>
                    <div className="text-xs text-zinc-500 font-medium">{level} Class</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Total</div>
                    <div className="text-xl font-bold text-white font-mono">
                        {Math.round(total)}<span className="text-xs text-zinc-600 ml-0.5">lbs</span>
                    </div>
                    <Trophy size={16} className="text-amber-500/20 ml-auto mt-1" />
                </div>
            </div>

            {/* ── Gauge ── */}
            <div className="h-32 w-full relative mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={gaugeData}
                            cx="50%" cy="100%"
                            startAngle={180} endAngle={0}
                            innerRadius={60} outerRadius={80}
                            paddingAngle={0} dataKey="value" stroke="none"
                        >
                            <Cell key="score" fill={activeColor} />
                            <Cell key="remaining" fill="#27272a" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center pb-2">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Next Level</span>
                    <div className="text-xs font-bold text-zinc-300">{next}</div>
                </div>
            </div>
            {currentWeight > 0 && (
                <div className="text-center text-[9px] text-zinc-700 -mt-1 mb-1">{currentWeight.toFixed(1)} lbs</div>
            )}

            {/* ── All-Time Bests Grid ── */}
            <div className="mt-5 pt-4 border-t border-zinc-800/50 z-10">
                <div className="flex items-center gap-1.5 mb-3">
                    <Trophy size={12} className="text-amber-500" />
                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">All-Time Bests</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                    {trophies.map(({ label, pb, tests }) => {
                        const latest = tests?.[tests.length - 1];
                        const prev   = tests?.[tests.length - 2];
                        const delta  = latest && prev ? latest.weight - prev.weight : null;

                        return (
                            <div key={label} className="text-center">
                                {/* Label */}
                                <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-1">{label}</div>

                                {pb ? (
                                    <>
                                        {/* e1RM */}
                                        <div className="flex items-baseline justify-center gap-1">
                                            <span className="text-base font-black text-white tracking-tight">{Math.round(pb.e1rm)}</span>
                                            <span className="text-[9px] text-zinc-500">e1RM</span>
                                        </div>
                                        {/* Actual sets×reps + date */}
                                        <div className="text-[9px] text-zinc-500 font-mono leading-tight mt-0.5">
                                            {pb.sets}×{pb.reps} @ <span className="text-zinc-300 font-semibold">{pb.weight}</span>
                                            <div className="text-zinc-600 text-[10px] mt-0.5">{fmtDate(pb.date)}</div>
                                        </div>

                                        {/* Tested 1RM section — only shown if at least one test exists */}
                                        {latest && (
                                            <div className="mt-1.5 pt-1.5 border-t border-zinc-800/60">
                                                <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mb-0.5">Verified 1RM</div>
                                                <div className="flex items-baseline justify-center gap-1">
                                                    <CheckCircle size={10} className="text-emerald-500 shrink-0" />
                                                    <span className="text-base font-black text-emerald-400 tracking-tight">{latest.weight}</span>
                                                    <span className="text-[9px] text-zinc-500">lbs</span>
                                                </div>
                                                {delta !== null ? (
                                                    <>
                                                        <div className="text-[10px] text-zinc-600">{fmtDate(latest.date)}</div>
                                                        <div className={`text-[10px] font-mono ${delta > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                            {delta > 0 ? '+' : ''}{delta} vs {fmtDate(prev!.date)}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-[10px] text-zinc-600">{fmtDate(latest.date)}</div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-sm text-zinc-700 font-medium">—</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
