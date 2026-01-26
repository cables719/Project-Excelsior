
import React from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, Scatter, CartesianGrid } from 'recharts';
import { Activity } from 'lucide-react';
import { StatCard } from './ui/StatCard';
import { CustomTooltip, NoteTooltip } from './ui/Tooltips';
import { LogForms } from './LogForms';
import { DataContext } from '@/lib/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DashboardProps {
    currentWeight: string;
    currentBF: string;
    avgWeight: number;
    avgBF: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graphData: any[];

    // LogForms props passthrough
    logType: 'weigh-in' | 'lift' | 'cardio' | 'nutrition';
    setLogType: (type: 'weigh-in' | 'lift' | 'cardio' | 'nutrition') => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    weighInForm: any; setWeighInForm: (val: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    liftForm: any; setLiftForm: (val: any) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cardioForm: any; setCardioForm: (val: any) => void;
    foodInput: string; setFoodInput: (val: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    foodAnalysis: any; setFoodAnalysis: (val: any) => void;
    isAnalyzing: boolean;
    handleAnalyzeFood: () => void;
    isSubmitting: boolean;
    handleLogSubmit: (e: React.FormEvent) => void;
    netCalories: number;
    // netCalories: number; // Removed duplicate
    caloriesIn: number;
    proteinIn: number;
    proteinTarget: number;
    activityBurn: number;

    // Recent Activity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filteredActivity: any[];
    preferences?: {
        hideCardio?: boolean;
        hideLifts?: boolean;
        hideBodyFat?: boolean;
        hideNutrition?: boolean;
    };
}

export function Dashboard({
    currentWeight, currentBF, avgWeight, avgBF, graphData,
    logType, setLogType, weighInForm, setWeighInForm, liftForm, setLiftForm, cardioForm, setCardioForm,
    foodInput, setFoodInput, foodAnalysis, setFoodAnalysis, isAnalyzing, handleAnalyzeFood, isSubmitting, handleLogSubmit,
    netCalories, caloriesIn, proteinIn, proteinTarget, activityBurn, filteredActivity, preferences
}: DashboardProps) {

    return (
        <div className="w-[600px] bg-[#080808] border-l border-zinc-800/80 flex flex-col h-full shadow-2xl z-20">

            {/* Scrollable Dashboard */}
            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">

                {/* 1. Header & Stats */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity size={18} className="text-purple-500" />
                        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Biometrics</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <StatCard
                            label="Weight"
                            value={currentWeight !== '--' ? `${currentWeight} lbs` : '--'}
                            subtext={avgWeight ? `${avgWeight.toFixed(1)} lbs avg` : undefined}
                        />

                        {!preferences?.hideBodyFat && (
                            <StatCard
                                label="Body Fat"
                                value={currentBF !== '--' ? `${currentBF}%` : '--'}
                                subtext={avgBF ? `${avgBF.toFixed(1)}% avg` : undefined}
                            />
                        )}
                    </div>

                    {/* GRAPH 1: Weight */}
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 h-64 relative">
                        <div className="absolute top-4 left-6 text-[10px] font-bold text-zinc-500 uppercase">Weight Trend (Lbs)</div>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={graphData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} stroke="#27272a" />
                                <XAxis dataKey="date" hide />
                                <YAxis domain={['auto', 'auto']} orientation="left" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip unit=" lbs" />} />
                                <Line type="monotone" dataKey="weightAvg" stroke="#8b5cf6" strokeWidth={3} dot={false} strokeOpacity={0.8} />
                                <Scatter dataKey="weight" fill="#8b5cf6" fillOpacity={0.3} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>

                    {/* GRAPH 2: Body Fat */}
                    {!preferences?.hideBodyFat && (
                        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 h-64 relative">
                            <div className="absolute top-4 left-6 text-[10px] font-bold text-zinc-500 uppercase">Body Fat % Trend</div>
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={graphData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid vertical={false} stroke="#27272a" />
                                    <XAxis dataKey="date" hide />
                                    <YAxis domain={['auto', 'auto']} orientation="left" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} />
                                    <Tooltip content={<CustomTooltip unit="%" />} />
                                    <Line type="monotone" dataKey="bodyFatAvg" stroke="#10b981" strokeWidth={3} dot={false} strokeOpacity={0.8} />
                                    <Scatter dataKey="bodyFat" fill="#10b981" fillOpacity={0.3} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* 2. Logging Form (Integrated) */}
                <LogForms
                    logType={logType} setLogType={setLogType}
                    weighInForm={weighInForm} setWeighInForm={setWeighInForm}
                    liftForm={liftForm} setLiftForm={setLiftForm}
                    cardioForm={cardioForm} setCardioForm={setCardioForm}
                    foodInput={foodInput} setFoodInput={setFoodInput}
                    foodAnalysis={foodAnalysis} setFoodAnalysis={setFoodAnalysis}
                    isAnalyzing={isAnalyzing} handleAnalyzeFood={handleAnalyzeFood}
                    isSubmitting={isSubmitting} handleLogSubmit={handleLogSubmit}
                    netCalories={netCalories}
                    caloriesIn={caloriesIn}
                    proteinIn={proteinIn}
                    proteinTarget={proteinTarget}
                    activityBurn={activityBurn}
                    preferences={preferences}
                />

                {/* 3. Recent Activity (Filtered by Tab) */}
                <div className="space-y-6 pt-6 border-t border-zinc-800/50 pb-10">
                    <div className="flex items-center gap-2 mb-2">
                        <Activity size={18} className="text-zinc-500" />
                        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Recent Activity</h2>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-zinc-800/50">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <tbody>
                                    {filteredActivity.map((item, i) => {
                                        // Day Grouping Logic could be passed in or just simplified here
                                        // For now, let's just render the rows
                                        // Re-implementing the "IsNewDay" visual logic is tricky without the full array context
                                        // We'll trust the filtered list is ordered.
                                        const isNewDay = i > 0 && item.date !== filteredActivity[i - 1].date;

                                        return (
                                            <React.Fragment key={`group-${i}`}>
                                                {isNewDay && (
                                                    <tr>
                                                        <td colSpan={4} className="p-0">
                                                            <div className="h-1 w-full bg-zinc-800/50"></div>
                                                        </td>
                                                    </tr>
                                                )}
                                                <tr key={`a-${i}`} className="group hover:bg-zinc-800/30 transition-colors">
                                                    <td className="p-4 text-zinc-500 font-mono text-[10px] whitespace-nowrap w-2">
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
                                                    <td className={`p-4 text-zinc-300 font-medium ${item.type === 'weigh-in' ? 'w-[1px] px-0' : 'w-auto min-w-[100px]'}`}>
                                                        {item.type === 'cardio' && item.activity}
                                                        {item.type === 'lift' && item.exercise}
                                                        {item.type === 'nutrition' && null}
                                                    </td>

                                                    {/* VALUES COLUMN */}
                                                    <td className="p-4 whitespace-nowrap font-bold text-white/50 text-left">
                                                        {item.type === 'cardio' && (
                                                            <span>
                                                                <span className="text-blue-400">{item.duration} min</span>
                                                                {item.heartRate && <span className="text-zinc-600 mx-1">/</span>}
                                                                {item.heartRate && <span className="text-red-400">{item.heartRate} bpm</span>}
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
                                                                <span className="text-white">{item.calories} cal</span>
                                                                <span className="text-zinc-600 mx-1">/</span>
                                                                <span className="text-amber-500">{item.protein}g P</span>
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* NOTES COLUMN */}
                                                    <td className="py-4 pr-4 pl-4 text-left max-w-[150px]">
                                                        <NoteTooltip text={item.notes} index={i} widthClass="w-full" />
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
