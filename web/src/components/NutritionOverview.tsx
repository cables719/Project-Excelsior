import React from 'react';

interface NutritionOverviewProps {
    netCalories: number;
    caloriesIn: number;
    proteinIn: number;
    proteinTarget: number;
    dailyBudget: number; // Added dailyBudget prop for clarity
}

export function NutritionOverview({
    netCalories,
    caloriesIn,
    proteinIn,
    proteinTarget,
    dailyBudget
}: NutritionOverviewProps) {
    return (
        <div className="space-y-4">
            {/* Net Calorie Budget Card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                <div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Daily Budget</div>
                    <div className="text-xs text-zinc-400">
                        <span className="text-white font-bold">{dailyBudget}</span> (TDEE)
                        <span className="mx-2">-</span>
                        <span className="text-white font-bold">{caloriesIn}</span> (Eaten)
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-2xl font-bold ${netCalories >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {netCalories >= 0 ? `${netCalories} left` : `${Math.abs(netCalories)} over`}
                    </div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Net Remaining</div>
                </div>
            </div>

            {/* Protein Goal Card */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                <div>
                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Protein Goal</div>
                    <div className="text-xs text-zinc-400">
                        <span className={`font-bold ${proteinIn >= proteinTarget ? 'text-emerald-400' : 'text-zinc-200'}`}>{proteinIn}g</span>
                        <span className="mx-1 text-zinc-600">/</span>
                        <span className="text-zinc-500">{proteinTarget}g</span>
                    </div>
                    {/* Mini Progress Bar */}
                    <div className="w-24 h-1 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                        <div
                            className={`h-full rounded-full ${proteinIn >= proteinTarget ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${Math.min(100, (proteinIn / proteinTarget) * 100)}%` }}
                        ></div>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-xl font-bold ${proteinIn >= proteinTarget ? 'text-emerald-400' : 'text-amber-500'}`}>
                        {Math.round((proteinIn / proteinTarget) * 100)}%
                    </div>
                </div>
            </div>
        </div>
    );
}
