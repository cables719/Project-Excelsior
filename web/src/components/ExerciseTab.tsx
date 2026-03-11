import React, { useState } from 'react';
import { Dumbbell, Heart, Play, Plus, Map, Sparkles, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import { Trophy, TrendingUp } from 'lucide-react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, CartesianGrid } from 'recharts';
import { Lift } from '@/lib/types';
import { processLifts, aggregateDailyBest, determinePersonalBests } from '@/lib/analytics';
import { WilksGauge } from './WilksGauge';
import { normalizeExerciseName } from '@/lib/exercise-aliases';

interface ExerciseTabProps {
    lifts: Lift[];
    currentWeight: string;
    preferences?: any;
    onOpenLogModal: (type: 'weigh-in' | 'lift' | 'cardio' | 'nutrition' | 'eagles-peak') => void;
    onStartWorkout?: () => void;
    onSuggestBlueprint?: (constraints: string) => void;
    suggestedWorkout?: any;
    isSuggestingWorkout?: boolean;
}

export function ExerciseTab({ lifts, currentWeight, preferences, onOpenLogModal, onStartWorkout, onSuggestBlueprint, suggestedWorkout, isSuggestingWorkout }: ExerciseTabProps) {
    const [selectedLift, setSelectedLift] = React.useState<string>('Squat');
    const [liftFilter, setLiftFilter] = React.useState<'all' | 'T1' | 'T2'>('all');
    const [constraints, setConstraints] = useState('');

    const uniqueLifts = React.useMemo(() => {
        // Normalize all exercise names to canonical form, then deduplicate
        const set = new Set(lifts.map(l => normalizeExerciseName(l.exercise)));
        return Array.from(set).sort();
    }, [lifts]);

    // Select first lift on load if needed
    React.useEffect(() => {
        if (!uniqueLifts.includes(selectedLift) && uniqueLifts.length > 0) {
            const likelyPrimary = uniqueLifts.find(l => l.includes('Squat')) || uniqueLifts[0];
            setSelectedLift(likelyPrimary);
        }
    }, [uniqueLifts]); // Run when list changes

    const processedLiftData = React.useMemo(() => {
        const raw = processLifts(lifts, selectedLift);

        let filtered = raw;
        if (liftFilter !== 'all') {
            filtered = raw.filter(d => d.tier === liftFilter);
        }

        return aggregateDailyBest(filtered);
    }, [lifts, selectedLift, liftFilter]);

    // Trophy Room Data
    const trophies = React.useMemo(() => {
        const bests = determinePersonalBests(lifts);
        return [
            { label: 'Squat', lift: bests['Squat'] },
            { label: 'Bench', lift: bests['Bench'] },
            { label: 'Deadlift', lift: bests['Deadlift'] },
            { label: 'OHP', lift: bests['OHP'] }
        ];
    }, [lifts]);

    return (
        <>
            {/* Lift & Cardio Buttons */}
            <div className="space-y-4 mb-8">
                {preferences?.useCustomBlueprint ? (
                    suggestedWorkout ? (
                        <div className="bg-zinc-900/40 border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden group shadow-lg">
                            <div className="flex items-center gap-2 mb-3 relative z-10">
                                <Map size={18} className="text-emerald-500" />
                                <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Today's Mission</h2>
                            </div>
                            <div className="space-y-4 relative z-10">
                                <div className="space-y-3 bg-black/40 p-4 rounded-xl border border-zinc-800">
                                    <div className="flex items-center gap-2 text-white font-bold mb-2">
                                        <Sparkles size={16} className="text-amber-400" />
                                        {suggestedWorkout.title || "Suggested Workout"}
                                    </div>
                                    <p className="text-xs text-zinc-400 leading-relaxed mb-4">{suggestedWorkout.rationale}</p>
                                    
                                    <div className="space-y-2">
                                        {suggestedWorkout.exercises?.map((ex: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                                                <span className="text-zinc-200 font-medium">{ex.name}</span>
                                                <span className="text-emerald-400 font-mono text-xs bg-emerald-500/10 px-2 py-1 rounded">{ex.reps}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={constraints}
                                        onChange={(e) => setConstraints(e.target.value)}
                                        placeholder="Add comments & regenerate..."
                                        className="flex-1 bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && onSuggestBlueprint) {
                                                onSuggestBlueprint(constraints);
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => onSuggestBlueprint?.(constraints)}
                                        disabled={isSuggestingWorkout}
                                        className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 w-10 h-[34px] rounded-lg flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                                        title="Regenerate Workout"
                                    >
                                        {isSuggestingWorkout ? <Loader2 size={16} className="animate-spin text-emerald-400" /> : <RefreshCw size={14} className="text-emerald-400" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-zinc-900/40 border border-emerald-500/20 p-4 rounded-2xl flex flex-col gap-4 transition-all">
                            <button
                                onClick={() => onSuggestBlueprint?.(constraints)}
                                disabled={isSuggestingWorkout}
                                className="w-full flex items-center justify-between group transition-all disabled:opacity-50"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        {isSuggestingWorkout ? <Loader2 size={20} className="animate-spin text-emerald-400" /> : <Map size={20} className="text-emerald-400" />}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-sm font-bold text-emerald-100">AI Workout Coach</h3>
                                        <p className="text-[10px] text-emerald-400/80">{isSuggestingWorkout ? 'Consulting blueprint...' : 'Generate today’s mission'}</p>
                                    </div>
                                </div>
                                <Sparkles size={20} className="text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
                            </button>
                            <input 
                                type="text"
                                value={constraints}
                                onChange={(e) => setConstraints(e.target.value)}
                                placeholder="Any special requests? (e.g., 'Sore knees', 'Only 30 mins')"
                                className="bg-black border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50 w-full"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && onSuggestBlueprint) {
                                        onSuggestBlueprint(constraints);
                                    }
                                }}
                            />
                        </div>
                    )
                ) : preferences?.enableGZCLP && (
                    <button
                        onClick={onStartWorkout}
                        className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between group transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Play size={20} className="text-emerald-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-sm font-bold text-emerald-100">Start Active Workout</h3>
                                <p className="text-[10px] text-emerald-400/80">Live mode with prediction & timer</p>
                            </div>
                        </div>
                        <Play size={20} className="text-emerald-500/50 group-hover:text-emerald-400 transition-colors" />
                    </button>
                )}

                <div className="flex gap-4">
                    <button
                        onClick={() => onOpenLogModal('lift')}
                        className="flex-1 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl flex items-center justify-between group transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <Dumbbell size={20} className="text-emerald-500" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-sm font-bold text-white">Log Past Lift</h3>
                            </div>
                        </div>
                        <Plus size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                    </button>

                    {!preferences?.hideCardio && (
                        <button
                            onClick={() => onOpenLogModal('cardio')}
                            className="flex-1 bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl flex items-center justify-between group transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Heart size={20} className="text-blue-500" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-sm font-bold text-white">Log Cardio</h3>
                                </div>
                            </div>
                            <Plus size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 h-64 relative animate-in fade-in zoom-in-95 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] font-bold text-zinc-500 uppercase">Strength Trend (e1RM)</div>

                    {/* Controls */}
                    <div className="flex gap-2">
                        <select
                            value={selectedLift}
                            onChange={(e) => setSelectedLift(e.target.value)}
                            className="bg-black border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-white focus:outline-none focus:border-emerald-500"
                        >
                            {/* Auto-generate options from data */}
                            {uniqueLifts.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>

                        <div className="flex bg-black border border-zinc-800 rounded p-0.5">
                            {(['all', 'T1', 'T2'] as const).map(tier => (
                                <button
                                    key={tier}
                                    onClick={() => setLiftFilter(tier)}
                                    className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded transition-colors ${liftFilter === tier ? 'bg-emerald-500 text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    {tier}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={processedLiftData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid vertical={false} stroke="#27272a" />
                            <XAxis dataKey="date" hide />
                            <YAxis
                                domain={['dataMin - 20', 'auto']}
                                orientation="left"
                                tick={{ fill: '#52525b', fontSize: 10 }}
                                tickLine={false} axisLine={false}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="bg-black/90 border border-zinc-800 p-3 rounded-lg shadow-xl backdrop-blur-sm">
                                                <p className="text-xs font-bold text-emerald-400 mb-1">{data.exercise}</p>
                                                <p className="text-[10px] font-bold text-zinc-500 mb-2">{label}</p>

                                                <div className="space-y-1">
                                                    <p className="text-xl font-bold text-white">
                                                        {data.e1rm} <span className="text-xs text-zinc-500 font-normal">e1RM</span>
                                                    </p>
                                                    <p className="text-xs text-zinc-400">
                                                        Actual: <span className="text-white font-mono">{data.weight}x{data.reps}</span>
                                                    </p>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${data.tier === 'T1' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' : 'border-blue-500/30 text-blue-500 bg-blue-500/10'}`}>
                                                            {data.tier}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="e1rm"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ fill: '#050505', stroke: '#10b981', r: 3, strokeWidth: 2 }}
                                activeDot={{ r: 5, fill: '#10b981' }}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                {processedLiftData.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-xs">
                        No data for this tier
                    </div>
                )}
            </div>

            {/* Wilks Gauge Row */}
            <div className="h-auto">
                <WilksGauge currentWeight={parseFloat(currentWeight) || 180} lifts={lifts} />
            </div>

            {/* Trophy Room */}
            <div className="bg-zinc-900/40 backdrop-blur-md border border-amber-500/20 rounded-2xl p-5 relative overflow-hidden group mb-10 shadow-lg shadow-black/20">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                    <Trophy size={80} className="text-amber-500 transform rotate-12" />
                </div>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                    <Trophy size={16} className="text-amber-500" />
                    <h2 className="text-xs font-bold text-amber-500 uppercase tracking-widest">Trophy Room (All-Time Best e1RM)</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    {trophies.map((t) => (
                        <div key={t.label} className="flex flex-col relative group/item">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase mb-0.5">{t.label}</span>
                            {t.lift ? (
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-black text-white tracking-tight text-shadow-glow">{Math.round(t.lift.e1rm)}</span>
                                        <span className="text-[10px] text-zinc-500 font-medium">e1RM</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                        {t.lift.sets}x{t.lift.reps} @ <span className="text-zinc-300 font-bold">{t.lift.weight}</span> lbs
                                        <div className="text-zinc-600 text-[9px] mt-0.5">{new Date(t.lift.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}</div>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-sm text-zinc-700 font-medium">--</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
