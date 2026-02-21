import React, { useState, useEffect } from 'react';
import { X, Check, Play, Settings2, MessageSquare, Plus, Minus } from 'lucide-react';
import { WorkoutPlan, WorkoutSet } from '@/lib/gzclp-engine';
import { Lift, Message } from '@/lib/types';
import { ChatInterface } from './ChatInterface';

interface ActiveWorkoutProps {
    plan: WorkoutPlan | null;
    onClose: () => void;
    onComplete: (loggedLifts: Lift[]) => void;

    // Chat Props
    messages: Message[];
    input: string;
    setInput: (v: string) => void;
    handleChatSubmit: (e: React.FormEvent) => void;
    isLoading: boolean;
}

export function ActiveWorkout({
    plan, onClose, onComplete,
    messages, input, setInput, handleChatSubmit, isLoading
}: ActiveWorkoutProps) {
    const [state, setState] = useState<'preview' | 'active' | 'rest' | 'summary'>('preview');
    const [currentSetIndex, setCurrentSetIndex] = useState(0);
    const [currentSetRepTrack, setCurrentSetRepTrack] = useState(1); // 1 = Set 1 of Target Sets
    const [currentTime, setCurrentTime] = useState(0); // Rest timer
    const [activeSets, setActiveSets] = useState<WorkoutSet[]>([]);

    // Captured execution 
    const [executionLog, setExecutionLog] = useState<{ exercise: string, weight: number, reps: number, sets: number, tier: string, failed: boolean }[]>([]);

    useEffect(() => {
        if (plan) {
            setActiveSets(JSON.parse(JSON.stringify(plan.sets))); // Deep copy for editing
        }
    }, [plan]);

    // Timer Effect
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (state === 'rest' && currentTime > 0) {
            timer = setInterval(() => {
                setCurrentTime(prev => prev - 1);
            }, 1000);
        } else if (state === 'rest' && currentTime === 0) {
            setState('active');
        }
        return () => clearInterval(timer);
    }, [state, currentTime]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (!plan) return null;

    const currentExercise = activeSets[currentSetIndex];

    const handleStart = () => {
        setState('active');
        setCurrentSetIndex(0);
        setCurrentSetRepTrack(1);
        setExecutionLog([]);
    };

    const handleCompleteSet = (failed: boolean = false, actualReps?: number) => {
        const repsCompleted = actualReps !== undefined ? actualReps : currentExercise.targetReps;

        // Save log attempt
        setExecutionLog(prev => {
            const existing = prev.find(l => l.exercise === currentExercise.exercise);
            if (existing) {
                // Not true set-by-set DB logging yet, just aggregating for the final push
                // E.g. 5x3 becomes 5 sets of 3 in the array, or we just increment a counter
                return prev.map(l => l.exercise === currentExercise.exercise ?
                    { ...l, sets: l.sets + 1, failed: failed || l.failed } : l);
            } else {
                return [...prev, {
                    exercise: currentExercise.exercise,
                    weight: currentExercise.targetWeight,
                    reps: repsCompleted,
                    sets: 1,
                    tier: currentExercise.tier,
                    failed: failed
                }];
            }
        });

        if (currentSetRepTrack < currentExercise.targetSets) {
            // Next set of same exercise
            setCurrentSetRepTrack(prev => prev + 1);
            setCurrentTime(currentExercise.restSeconds);
            setState('rest');
        } else {
            // Move to next exercise
            if (currentSetIndex + 1 < activeSets.length) {
                setCurrentSetIndex(prev => prev + 1);
                setCurrentSetRepTrack(1);
                setCurrentTime(currentExercise.restSeconds);
                setState('rest');
            } else {
                // Done!
                setState('summary');
            }
        }
    };

    const finishWorkout = () => {
        // Convert to generic Lift[]
        const date = new Date().toLocaleDateString('en-US');
        const finalLogs: Lift[] = executionLog.map(l => ({
            date: date,
            exercise: l.exercise,
            weight: l.weight.toString(),
            sets: l.sets.toString(),
            reps: l.reps.toString(),
            notes: l.failed ? `Failed at set ${l.sets}` : ''
        }));
        onComplete(finalLogs);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#050505] text-white flex flex-col font-sans animate-in slide-in-from-bottom">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl shrink-0">
                <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
                        {state === 'preview' ? 'Workout Plan' : state === 'summary' ? 'Workout Complete' : 'Active Workout'}
                    </h2>
                    <p className="text-xs text-zinc-500 font-bold tracking-wider uppercase mt-1">
                        {plan.dayName}
                    </p>
                </div>
                {state === 'preview' && (
                    <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
                        <X size={20} className="text-zinc-400" />
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">

                {state === 'preview' && (
                    <div className="space-y-6 max-w-lg mx-auto pb-24">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex gap-3 text-sm text-emerald-200">
                            <Check size={20} className="shrink-0 text-emerald-500" />
                            <p>Plan generated based on your last GZCLP blocks. Edit targets below if needed before starting.</p>
                        </div>

                        <div className="space-y-4">
                            {activeSets.map((set, idx) => (
                                <div key={idx} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-xs
                                            ${set.tier === 'T1' ? 'bg-purple-500/20 text-purple-400' : set.tier === 'T2' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {set.tier}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{set.exercise}</h3>
                                            <p className="text-sm text-zinc-400">{set.targetSets} sets x {set.targetReps} reps</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                const newSets = [...activeSets];
                                                newSets[idx].targetWeight = Math.max(0, newSets[idx].targetWeight - 5);
                                                setActiveSets(newSets);
                                            }}
                                            className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400">
                                            <Minus size={16} />
                                        </button>
                                        <div className="w-16 text-center font-bold text-lg">
                                            {set.targetWeight}<span className="text-xs text-zinc-500">lbs</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const newSets = [...activeSets];
                                                newSets[idx].targetWeight += 5;
                                                setActiveSets(newSets);
                                            }}
                                            className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {state === 'active' && currentExercise && (
                    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto space-y-12">
                        <div className="text-center space-y-4">
                            <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800">
                                {currentExercise.tier} • Set {currentSetRepTrack} of {currentExercise.targetSets}
                            </span>
                            <h2 className="text-5xl font-black tracking-tight">{currentExercise.exercise}</h2>
                        </div>

                        <div className="text-center">
                            <div className="flex items-end justify-center gap-2">
                                <span className="text-8xl font-black text-emerald-400">{currentExercise.targetWeight}</span>
                                <span className="text-2xl font-bold text-emerald-500/50 mb-3">lbs</span>
                            </div>
                            <p className="text-2xl font-medium text-zinc-400 mt-2">Target: {currentExercise.targetReps} Reps</p>
                        </div>

                        <div className="w-full flex gap-4 pt-8">
                            <button
                                onClick={() => handleCompleteSet(true)}
                                className="flex-1 py-6 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-bold text-xl hover:bg-red-500/20 transition-colors">
                                Failed (AMRAP)
                            </button>
                            <button
                                onClick={() => handleCompleteSet(false)}
                                className="flex-[2] py-6 bg-emerald-500 text-black shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] rounded-2xl font-black text-2xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-95">
                                COMPLETED
                            </button>
                        </div>
                    </div>
                )}

                {state === 'rest' && (
                    <div className="flex flex-col h-full max-w-lg mx-auto">
                        <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                            <h3 className="text-2xl font-bold text-zinc-500">Rest</h3>
                            <div className="text-9xl font-black tracking-tight font-mono text-emerald-400 tabular-nums">
                                {formatTime(currentTime)}
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setCurrentTime(prev => Math.max(0, prev - 30))} className="px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 font-bold hover:bg-zinc-800">-30s</button>
                                <button onClick={() => setCurrentTime(prev => prev + 30)} className="px-6 py-3 rounded-xl bg-zinc-900 border border-zinc-800 font-bold hover:bg-zinc-800">+30s</button>
                                <button onClick={() => setState('active')} className="px-6 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold hover:bg-emerald-500/30">Skip Rest</button>
                            </div>
                        </div>

                        {/* Integrated Chat for Rest Period */}
                        <div className="flex-1 mt-8 bg-black/50 border border-zinc-800 rounded-t-3xl overflow-hidden flex flex-col relative w-full translate-y-6">
                            <ChatInterface
                                messages={messages}
                                input={input}
                                setInput={setInput}
                                isLoading={isLoading}
                                handleChatSubmit={handleChatSubmit}
                                isEmbedded={true}
                                coachMode="clara"
                            />
                        </div>
                    </div>
                )}

                {state === 'summary' && (
                    <div className="max-w-md mx-auto space-y-8 py-12 text-center">
                        <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check size={48} strokeWidth={3} />
                        </div>
                        <h2 className="text-4xl font-black">Workout Complete!</h2>
                        <p className="text-zinc-400">Great job. Your logs are ready to save.</p>

                        <div className="text-left bg-zinc-900 p-6 rounded-2xl border border-zinc-800 space-y-4">
                            {executionLog.map((l, i) => (
                                <div key={i} className="flex justify-between items-center text-sm font-bold border-b border-zinc-800/50 pb-2 last:border-0 last:pb-0">
                                    <span className="text-zinc-300">{l.sets}x{l.reps} {l.exercise}</span>
                                    <span className={l.failed ? 'text-red-400' : 'text-emerald-400'}>
                                        {l.weight} lbs {l.failed && '(Failed)'}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={finishWorkout}
                            className="w-full py-4 bg-emerald-500 text-black font-black text-lg rounded-xl shadow-lg hover:bg-emerald-400 transition-colors mt-8">
                            Save to Logbook
                        </button>
                    </div>
                )}
            </div>

            {/* Sticky Action Footer for Preview */}
            {state === 'preview' && (
                <div className="p-6 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-xl shrink-0 absolute bottom-0 left-0 right-0 z-10">
                    <button
                        onClick={handleStart}
                        className="w-full max-w-lg mx-auto block py-4 bg-emerald-500 text-black font-black text-lg rounded-xl hover:bg-emerald-400 transition-colors shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)]">
                        START WORKOUT
                    </button>
                </div>
            )}
        </div>
    );
}
