import React from 'react';
import { Utensils, Plus } from 'lucide-react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, Bar, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { NutritionOverview } from './NutritionOverview';

interface NutritionTabProps {
    nutritionGraphData: any[];
    netCalories: number;
    caloriesIn: number;
    proteinIn: number;
    proteinTarget: number;
    onOpenLogModal: (type: 'weigh-in' | 'lift' | 'cardio' | 'nutrition' | 'eagles-peak') => void;
}

export function NutritionTab({ nutritionGraphData, netCalories, caloriesIn, proteinIn, proteinTarget, onOpenLogModal }: NutritionTabProps) {
    const [showProtein, setShowProtein] = React.useState(true);

    return (
        <>
            <div className="space-y-6 mb-4">
                <button
                    onClick={() => onOpenLogModal('nutrition')}
                    className="w-full bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/30 p-4 rounded-2xl flex items-center justify-between group transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Utensils size={20} className="text-amber-500" />
                        </div>
                        <div className="text-left">
                            <h3 className="text-sm font-bold text-white">Log Meal</h3>
                            <p className="text-[10px] text-zinc-500">Track calories & macros</p>
                        </div>
                    </div>
                    <Plus size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                </button>
            </div>

            <div className="mb-6">
                <NutritionOverview
                    netCalories={netCalories}
                    caloriesIn={caloriesIn}
                    proteinIn={proteinIn}
                    proteinTarget={proteinTarget}
                    dailyBudget={netCalories + caloriesIn}
                />
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 h-64 relative animate-in fade-in zoom-in-95">
                <div className="absolute top-4 left-6 text-[10px] font-bold text-zinc-500 uppercase">Fuel Log (Last 14 Days)</div>
                <div className="absolute top-4 right-6 flex gap-3 text-[9px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-1 text-zinc-500"><div className="w-2 h-2 bg-zinc-500 rounded-sm"></div> Cal</div>

                    {/* Target / Limit Legend */}
                    <div className="flex items-center gap-1 text-zinc-600"><div className="w-2 h-2 bg-[#27272a] border border-zinc-700 rounded-sm"></div> Limit</div>

                    {/* Protein Toggle */}
                    <button
                        onClick={() => setShowProtein(!showProtein)}
                        className={`pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-zinc-800/50 transition-all border ${showProtein ? 'border-amber-500/30 bg-amber-500/10' : 'border-zinc-800 bg-transparent opacity-60 hover:opacity-100'}`}
                        style={{ zIndex: 50 }}
                    >
                        <div className={`w-2 h-2 rounded-full ${showProtein ? 'bg-amber-500' : 'bg-zinc-600'}`}></div>
                        <span className={`text-[9px] font-bold ${showProtein ? 'text-amber-500' : 'text-zinc-500'}`}>Protein</span>
                    </button>
                </div>
                <ResponsiveContainer width="100%" height="100%">

                    <ComposedChart data={nutritionGraphData} margin={{ top: 40, right: 0, left: 0, bottom: 0 }} barGap={0}>
                        <CartesianGrid vertical={false} stroke="#27272a" />

                        {/* X Axis Overlay Trick: Two axes with same data to overlap bars */}
                        <XAxis xAxisId="0" dataKey="shortDate" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <XAxis xAxisId="1" dataKey="shortDate" hide />

                        <YAxis yAxisId="left" orientation="left" tick={{ fill: '#52525b', fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: 'Calories', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 11, offset: 14 }} />

                        {/* Hide Right Axis if Protein is hidden */}
                        {showProtein && (
                            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#f59e0b', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 'auto']} label={{ value: 'Protein (g)', angle: 90, position: 'insideRight', fill: '#f59e0b', fontSize: 11, offset: 14 }} />
                        )}

                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    // Find the actual data payload
                                    const data = payload[0].payload;
                                    return (
                                        <div className="bg-black/90 border border-zinc-800 p-3 rounded-lg shadow-xl backdrop-blur-sm">
                                            <p className="text-xs font-bold text-zinc-400 mb-2">{label}</p>
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-zinc-500 flex justify-between gap-4">
                                                    <span>Budget:</span>
                                                    <span>{data.target}</span>
                                                </p>
                                                <p className="text-xs font-bold text-white flex justify-between gap-4">
                                                    <span>Actual:</span>
                                                    <span>{data.calories}</span>
                                                </p>
                                                {showProtein && (
                                                    <p className="text-xs font-bold text-amber-500 flex justify-between gap-4">
                                                        <span>Protein:</span>
                                                        <span>{data.protein}g</span>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />

                        {/* 1. Background Bar: TDEE/Target (xAxisId 0) */}
                        <Bar xAxisId="0" yAxisId="left" dataKey="target" fill="#27272a" barSize={24} radius={[4, 4, 0, 0]} />

                        {/* 2. Foreground Bar: Actual Calories (xAxisId 1) - Overlaid */}
                        <Bar xAxisId="1" yAxisId="left" dataKey="calories" barSize={12} radius={[4, 4, 0, 0]}>
                            {nutritionGraphData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.calories > entry.target ? '#ef4444' : '#10b981'} />
                            ))}
                        </Bar>

                        {/* 3. Protein Line (Right Axis) */}
                        {showProtein && (
                            <>
                                <ReferenceLine y={proteinTarget} yAxisId="right" stroke="#f59e0b" strokeDasharray="3 3" opacity={0.5} />
                                <Line yAxisId="right" type="monotone" dataKey="protein" stroke="#f59e0b" strokeWidth={2} dot={false} strokeOpacity={0.8} />
                            </>
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </>
    );
}
