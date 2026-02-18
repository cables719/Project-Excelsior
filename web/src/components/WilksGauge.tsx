
import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { calculateWilks, getWilksLevel } from '@/lib/analytics';
import { Lift } from '@/lib/types';

interface WilksGaugeProps {
    currentWeight: number; // lbs
    lifts: Lift[];
}

export function WilksGauge({ currentWeight, lifts }: WilksGaugeProps) {
    // 1. Calculate Best Lifts (Squat, Bench, Deadlift)
    // We look for the absolute highest "weight" lifted for each, regardless of reps (1RM specific not e1RM for Wilks typically, but we'll use e1RM for "Projected" if we want, let's stick to simple Max Weight for "Validated" score, or e1RM for "Potential")
    // Let's use e1RM to be generous/motivational since this is a "Potential" gauge.

    const getBestLift = (names: string[]) => {
        const matches = lifts.filter(l => names.some(n => l.exercise.toLowerCase().includes(n.toLowerCase())));
        if (matches.length === 0) return 0;

        // Calculate max e1RM
        return Math.max(...matches.map(l => {
            // Simple e1RM calc inline or ignore if complex
            const w = parseFloat(l.weight) || 0;
            const r = parseFloat(l.reps) || 0;
            if (r === 1) return w;
            return w * (1 + r / 30);
        }));
    };

    const squat = getBestLift(['squat']);
    const bench = getBestLift(['bench']);
    const deadlift = getBestLift(['deadlift', 'dlift', 'dead']);
    const total = squat + bench + deadlift;

    const wilks = calculateWilks(currentWeight, total, 'lbs');
    const { level, color, next } = getWilksLevel(wilks);

    // Gauge Data for Recharts
    // Next milestone is the max value of the gauge, or current + buffer
    const maxVal = next + 50;
    const gaugeData = [
        { name: 'Score', value: wilks },
        { name: 'Remaining', value: maxVal - wilks }
    ];

    // Colors
    // If Elite, glowing emerald? If Gold, Amber? 
    // We can map the 'color' text class to a hex for the chart
    const getColorHex = (c: string) => {
        if (c.includes('emerald')) return '#10b981'; // emerald-500
        if (c.includes('amber')) return '#f59e0b'; // amber-500
        if (c.includes('slate')) return '#38bdf8'; // sky-400 (Premium Silver/Blue)
        if (c.includes('bronze')) return '#cd7f32'; // manual bronze
        if (c.includes('purple')) return '#a855f7'; // purple-500
        return '#52525b'; // zinc-600
    }

    // For "Novice" (bronze-500 isn't a tailwind default, use custom hex)
    const activeColor = color.includes('bronze') ? '#CD7F32' : getColorHex(color);

    return (
        <div
            className="bg-zinc-900/40 backdrop-blur-md border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-full min-h-[250px] shadow-lg shadow-black/20 transition-colors duration-500"
            style={{ borderColor: `${activeColor}30` }}
        >
            {/* Background Texture/Glow */}
            <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[60px] -z-10 pointer-events-none transition-opacity duration-1000"
                style={{ background: `radial-gradient(circle, ${activeColor} 0%, transparent 70%)`, opacity: 0.25 }}
            ></div>

            <div className="flex justify-between items-start z-10">
                <div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Wilks</div>
                    <div className={`text-3xl font-black ${color} tracking-tighter`}>{wilks.toFixed(0)}</div>
                    <div className="text-xs text-zinc-500 font-medium">{level} Class</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Total Lift</div>
                    <div className="text-xl font-bold text-white font-mono">{Math.round(total)}<span className="text-xs text-zinc-600 ml-0.5">lbs</span></div>
                </div>
            </div>

            {/* Gauge */}
            <div className="h-32 w-full relative mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={gaugeData}
                            cx="50%"
                            cy="100%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell key="score" fill={activeColor} />
                            <Cell key="remaining" fill="#27272a" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center pb-2">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold">Next Level</span>
                    <div className="text-xs font-bold text-zinc-300">{next}</div>
                </div>
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-zinc-800/50">
                <div className="text-center">
                    <div className="text-[9px] text-zinc-600 uppercase font-bold">Squat</div>
                    <div className="text-xs font-bold text-zinc-300">{Math.round(squat)}</div>
                </div>
                <div className="text-center">
                    <div className="text-[9px] text-zinc-600 uppercase font-bold">Bench</div>
                    <div className="text-xs font-bold text-zinc-300">{Math.round(bench)}</div>
                </div>
                <div className="text-center">
                    <div className="text-[9px] text-zinc-600 uppercase font-bold">Dead</div>
                    <div className="text-xs font-bold text-zinc-300">{Math.round(deadlift)}</div>
                </div>
            </div>
        </div>
    );
}
