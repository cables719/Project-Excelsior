import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, Play, Settings2, MessageSquare, Plus, Minus, FileText } from 'lucide-react';
import { WorkoutPlan, WorkoutSet } from '@/lib/gzclp-engine';
import { Lift, Message } from '@/lib/types';
import { ChatInterface } from './ChatInterface';

export interface ActiveWorkoutState {
    exercise: string;
    weight: number;
    targetReps: number;
    currentSet: number;
    totalSets: number;
    tier: string;
    workoutState: 'preview' | 'active' | 'rest' | 'summary';
    dayName: string;
}

interface ActiveWorkoutProps {
    plan: WorkoutPlan | null;
    onClose: () => void;
    onComplete: (loggedLifts: Lift[]) => void;
    onWorkoutStateChange?: (state: ActiveWorkoutState | null) => void;

    // Chat Props
    messages: Message[];
    input: string;
    setInput: (v: string) => void;
    handleChatSubmit: (e: React.FormEvent) => void;
    isLoading: boolean;
    userAvatar?: string;
    coachAvatar?: string;
    coachName?: string;
}

export function ActiveWorkout({
    plan, onClose, onComplete, onWorkoutStateChange,
    messages, input, setInput, handleChatSubmit, isLoading,
    userAvatar, coachAvatar, coachName
}: ActiveWorkoutProps) {
    const [state, setState] = useState<'preview' | 'active' | 'rest' | 'summary'>('preview');
    const [isFailing, setIsFailing] = useState(false);
    const [sequence, setSequence] = useState<{ exerciseIndex: number; setNumber: number }[]>([]);
    const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
    const [currentTime, setCurrentTime] = useState(0); // Rest timer
    const [activeSets, setActiveSets] = useState<WorkoutSet[]>([]);
    // Per-exercise user notes
    const [userNotes, setUserNotes] = useState<Record<string, string>>({});
    // Captured execution 
    const [executionLog, setExecutionLog] = useState<{ exercise: string, weight: number, targetReps: number, targetSets: number, actualSetsCompleted: number, tier: string, failed: boolean, notes: string }[]>([]);

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

    const currentSeqItem = sequence[currentSequenceIndex];
    const currentExercise = currentSeqItem ? activeSets[currentSeqItem.exerciseIndex] : null;
    const currentSetRepTrack = currentSeqItem ? currentSeqItem.setNumber : 1;

    // Notify parent of workout state changes so Clara can see what we're doing
    useEffect(() => {
        if (onWorkoutStateChange) {
            if (currentExercise && (state === 'active' || state === 'rest')) {
                onWorkoutStateChange({
                    exercise: currentExercise.exercise,
                    weight: currentExercise.targetWeight,
                    targetReps: currentExercise.targetReps,
                    currentSet: currentSetRepTrack,
                    totalSets: currentExercise.targetSets,
                    tier: currentExercise.tier,
                    workoutState: state,
                    dayName: plan.dayName
                });
            } else {
                onWorkoutStateChange(state === 'summary' ? null : {
                    exercise: '',
                    weight: 0,
                    targetReps: 0,
                    currentSet: 0,
                    totalSets: 0,
                    tier: '',
                    workoutState: state,
                    dayName: plan.dayName
                });
            }
        }
    }, [state, currentSequenceIndex, currentExercise]);

    const handleStart = () => {
        const executionSequence: { exerciseIndex: number; setNumber: number }[] = [];
        let i = 0;
        while (i < activeSets.length) {
            let groupStart = i;
            let groupEnd = i;
            while (groupEnd < activeSets.length - 1 && activeSets[groupEnd + 1].isLinkedToPrevious) {
                groupEnd++;
            }

            const maxSets = Math.max(...activeSets.slice(groupStart, groupEnd + 1).map(s => s.targetSets));
            for (let setNum = 1; setNum <= maxSets; setNum++) {
                for (let j = groupStart; j <= groupEnd; j++) {
                    if (activeSets[j].targetSets >= setNum) { // Still has sets left
                        executionSequence.push({ exerciseIndex: j, setNumber: setNum });
                    }
                }
            }
            i = groupEnd + 1;
        }

        setSequence(executionSequence);
        setCurrentSequenceIndex(0);
        setState('active');
        setExecutionLog([]);
    };

    const handleCompleteSet = (failed: boolean = false, actualReps?: number) => {
        if (!currentExercise) return;
        const repsCompleted = actualReps !== undefined ? actualReps : currentExercise.targetReps;

        // Save log attempt
        setExecutionLog(prev => {
            const existingIdx = prev.findIndex(l => l.exercise === currentExercise.exercise);
            if (existingIdx >= 0) {
                const newLog = [...prev];
                newLog[existingIdx] = {
                    ...newLog[existingIdx],
                    actualSetsCompleted: newLog[existingIdx].actualSetsCompleted + 1,
                    failed: newLog[existingIdx].failed || failed,
                    notes: failed ? `Fail (completed ${repsCompleted}/${currentExercise.targetReps} on set ${newLog[existingIdx].actualSetsCompleted + 1})` : newLog[existingIdx].notes
                };
                return newLog;
            } else {
                return [...prev, {
                    exercise: currentExercise.exercise,
                    weight: currentExercise.targetWeight,
                    targetReps: currentExercise.targetReps,
                    targetSets: currentExercise.targetSets,
                    actualSetsCompleted: 1,
                    tier: currentExercise.tier,
                    failed: failed,
                    notes: failed ? `Fail (completed ${repsCompleted}/${currentExercise.targetReps} on set 1)` : ''
                }];
            }
        });

        setIsFailing(false);

        if (currentSequenceIndex + 1 < sequence.length) {
            setCurrentSequenceIndex(prev => prev + 1);
            setCurrentTime(currentExercise.restSeconds);
            setState('rest');
        } else {
            // Done!
            setState('summary');
        }
    };

    const finishWorkout = () => {
        // Convert to generic Lift[]
        const date = new Date().toLocaleDateString('en-US');
        const finalLogs: Lift[] = executionLog.map(l => {
            // Merge user notes with auto-generated fail notes
            const autoNotes = l.notes;
            const manualNotes = userNotes[l.exercise] || '';
            const combined = [autoNotes, manualNotes].filter(Boolean).join(' | ');
            return {
                date: date,
                exercise: l.exercise,
                weight: l.weight.toString(),
                sets: l.actualSetsCompleted.toString(),
                reps: l.targetReps.toString(),
                notes: combined
            };
        });

        // Log to API
        onComplete(finalLogs);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-4xl mx-auto bg-zinc-950 border border-zinc-800 rounded-3xl h-[90vh] flex flex-col overflow-hidden relative shadow-2xl animate-in zoom-in-95">
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
                    {state === 'preview' ? (
                        <button onClick={onClose} className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
                            <X size={20} className="text-zinc-400" />
                        </button>
                    ) : state !== 'summary' ? (
                        <button onClick={() => setState('summary')} className="text-xs text-red-500 font-bold tracking-wider px-3 py-1.5 bg-red-500/10 rounded-full hover:bg-red-500/20">END EARLY</button>
                    ) : null}
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
                                    <React.Fragment key={idx}>
                                        <div className={`bg-zinc-900/50 border ${set.isLinkedToPrevious ? 'border-t-0 rounded-t-none border-t-zinc-800/50' : 'rounded-t-xl'} ${idx < activeSets.length - 1 && activeSets[idx + 1].isLinkedToPrevious ? 'border-b-0 rounded-b-none' : 'rounded-b-xl'} border-zinc-800 p-4 flex flex-col sm:flex-row items-center sm:justify-between gap-4 relative transition-colors`}>
                                            <div className="flex items-center justify-center sm:justify-start gap-3 w-full sm:w-auto">
                                                {/* Reorder Buttons */}
                                                <div className="flex flex-col shrink-0">
                                                    <button
                                                        onClick={() => {
                                                            if (idx === 0) return;
                                                            const newSets = [...activeSets];
                                                            const temp = newSets[idx - 1];
                                                            newSets[idx - 1] = newSets[idx];
                                                            newSets[idx] = temp;
                                                            setActiveSets(newSets);
                                                        }}
                                                        className="text-zinc-600 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-600 p-0.5"
                                                        disabled={idx === 0}
                                                    ><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m18 15-6-6-6 6" /></svg></button>
                                                    <button
                                                        onClick={() => {
                                                            if (idx === activeSets.length - 1) return;
                                                            const newSets = [...activeSets];
                                                            const temp = newSets[idx + 1];
                                                            newSets[idx + 1] = newSets[idx];
                                                            newSets[idx] = temp;
                                                            setActiveSets(newSets);
                                                        }}
                                                        className="text-zinc-600 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-600 p-0.5"
                                                        disabled={idx === activeSets.length - 1}
                                                    ><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg></button>
                                                </div>

                                                <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-xs shrink-0
                                                ${set.tier === 'T1' ? 'bg-purple-500/20 text-purple-400' : set.tier === 'T2' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                    {set.tier}
                                                </div>
                                                <div className="min-w-0 text-left">
                                                    <h3 className="font-bold text-sm md:text-lg truncate">{set.exercise}</h3>
                                                    <p className="text-xs md:text-sm text-zinc-400">{set.targetSets} sets x {set.targetReps} reps</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-center sm:justify-end w-full sm:w-auto gap-2 shrink-0 border-t border-zinc-800/50 pt-3 mt-1 sm:border-0 sm:pt-0 sm:mt-0">
                                                <button
                                                    onClick={() => {
                                                        const newSets = [...activeSets];
                                                        newSets[idx].targetWeight = Math.max(0, newSets[idx].targetWeight - 5);
                                                        setActiveSets(newSets);
                                                    }}
                                                    className="p-3 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400 transition-colors">
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
                                                    className="p-3 bg-zinc-800 rounded hover:bg-zinc-700 text-zinc-400 transition-colors">
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Superset Link Toggle */}
                                        {idx < activeSets.length - 1 && (
                                            <div className="flex justify-center -my-3 relative z-10 w-full">
                                                <button
                                                    onClick={() => {
                                                        const newSets = [...activeSets];
                                                        newSets[idx + 1].isLinkedToPrevious = !newSets[idx + 1].isLinkedToPrevious;
                                                        setActiveSets(newSets);
                                                    }}
                                                    className={`p-1.5 rounded-full border border-zinc-800 transition-colors ${activeSets[idx + 1].isLinkedToPrevious ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-zinc-900 text-zinc-600 hover:text-white'}`}
                                                    title="Link as Superset"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                                                </button>
                                            </div>
                                        )}
                                    </React.Fragment>
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

                            {/* Notes Input */}
                            <div className="w-full">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText size={12} className="text-zinc-600" />
                                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Notes</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Form cues, RPE, sticking points..."
                                    value={userNotes[currentExercise.exercise] || ''}
                                    onChange={e => setUserNotes(prev => ({ ...prev, [currentExercise.exercise]: e.target.value }))}
                                    className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-700 focus:border-emerald-500/50 outline-none transition-colors"
                                />
                            </div>

                            <div className="w-full pt-4">
                                {isFailing ? (
                                    <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-4">
                                        <h3 className="text-sm font-bold text-zinc-400 mb-4 text-center">How many reps completed?</h3>
                                        <div className="flex flex-wrap gap-2 justify-center mb-6 max-w-[280px] mx-auto">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                                                <button key={r} onClick={() => handleCompleteSet(true, r)} className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-red-500/20 text-zinc-300 hover:text-red-500 font-black text-lg transition-colors">{r}</button>
                                            ))}
                                        </div>
                                        <button onClick={() => setIsFailing(false)} className="w-full py-3 text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors">Cancel</button>
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setIsFailing(true)}
                                            className="flex-1 py-6 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-bold text-xl hover:bg-red-500/20 transition-colors">
                                            Failed
                                        </button>
                                        <button
                                            onClick={() => handleCompleteSet(false)}
                                            className="flex-[2] py-6 bg-emerald-500 text-black shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] rounded-2xl font-black text-2xl hover:bg-emerald-400 transition-all hover:scale-[1.02] active:scale-95">
                                            COMPLETED
                                        </button>
                                    </div>
                                )}
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
                                    userAvatar={userAvatar}
                                    coachAvatar={coachAvatar}
                                    coachName={coachName}
                                />
                            </div>
                        </div>
                    )}

                    {state === 'summary' && (
                        <div className="max-w-md mx-auto space-y-4 py-6 text-center h-full flex flex-col justify-center w-full px-4">
                            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 shrink-0">
                                <Check size={32} strokeWidth={3} />
                            </div>
                            <h2 className="text-3xl font-black">Workout Complete!</h2>
                            <p className="text-zinc-400 text-sm">Great job. Your logs are ready to save.</p>

                            <div className="text-left bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-3">
                                {executionLog.map((l, i) => (
                                    <div key={i} className="border-b border-zinc-800/50 pb-3 last:border-0 last:pb-0 space-y-2">
                                        <div className="flex justify-between items-center text-sm font-bold">
                                            <span className="text-zinc-300">{l.actualSetsCompleted}x{l.targetReps} {l.exercise}</span>
                                            <span className={l.failed ? 'text-red-400' : 'text-emerald-400'}>
                                                {l.weight} lbs {l.failed && '(Fail)'}
                                            </span>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Add notes..."
                                            value={userNotes[l.exercise] || ''}
                                            onChange={e => setUserNotes(prev => ({ ...prev, [l.exercise]: e.target.value }))}
                                            className="w-full bg-zinc-800/50 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-700 focus:border-emerald-500/50 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3 pt-4 shrink-0">
                                <button
                                    onClick={finishWorkout}
                                    className="w-full py-4 bg-emerald-500 text-black font-black text-lg rounded-xl shadow-lg hover:bg-emerald-400 transition-colors">
                                    Save to Logbook
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 text-zinc-500 font-bold hover:text-red-400 transition-colors text-sm">
                                    Discard & End Workout Without Saving
                                </button>
                            </div>
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
        </div>
    );
}
