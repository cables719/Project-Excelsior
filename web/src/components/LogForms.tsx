
import React, { useState } from 'react';
import { Scale, Dumbbell, Heart, Utensils } from 'lucide-react';

interface LogFormsProps {
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
    caloriesIn: number;
    activityBurn: number;
}

export function LogForms({
    logType, setLogType,
    weighInForm, setWeighInForm,
    liftForm, setLiftForm,
    cardioForm, setCardioForm,
    foodInput, setFoodInput,
    foodAnalysis, setFoodAnalysis,
    isAnalyzing, handleAnalyzeFood,
    isSubmitting, handleLogSubmit,
    netCalories, caloriesIn, activityBurn
}: LogFormsProps) {

    return (
        <div className="space-y-4 pt-6 border-t border-zinc-800/50">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {/* Dynamic Icon */}
                    {logType === 'weigh-in' && <Scale size={18} className="text-purple-500" />}
                    {logType === 'lift' && <Dumbbell size={18} className="text-emerald-500" />}
                    {logType === 'cardio' && <Heart size={18} className="text-blue-500" />}
                    {logType === 'nutrition' && <Utensils size={18} className="text-amber-500" />}
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Entry Log</h2>
                </div>
                <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                    <button onClick={() => setLogType('weigh-in')} className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${logType === 'weigh-in' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}>BODY</button>
                    <button onClick={() => setLogType('lift')} className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${logType === 'lift' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}>LIFT</button>
                    <button onClick={() => setLogType('cardio')} className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${logType === 'cardio' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}>CARDIO</button>
                    <button onClick={() => setLogType('nutrition')} className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${logType === 'nutrition' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}>FOOD</button>
                </div>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
                <form onSubmit={handleLogSubmit} className="space-y-4">
                    {logType === 'weigh-in' ? (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] text-zinc-600 font-bold uppercase block mb-1">Weight</label>
                                    <input
                                        type="number" step="0.1"
                                        value={weighInForm.weight}
                                        onChange={e => setWeighInForm({ ...weighInForm, weight: e.target.value })}
                                        className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-3 text-sm focus:border-indigo-500/50 focus:outline-none transition-colors"
                                        placeholder="0.0"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-zinc-600 font-bold uppercase block mb-1">Fat %</label>
                                    <input
                                        type="number" step="0.1"
                                        value={weighInForm.bodyFat}
                                        onChange={e => setWeighInForm({ ...weighInForm, bodyFat: e.target.value })}
                                        className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-3 text-sm focus:border-indigo-500/50 focus:outline-none transition-colors"
                                        placeholder="0.0"
                                    />
                                </div>
                            </div>
                            <div>
                                <input
                                    value={weighInForm.notes}
                                    onChange={e => setWeighInForm({ ...weighInForm, notes: e.target.value })}
                                    className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-3 text-sm focus:border-indigo-500/50 focus:outline-none transition-colors"
                                    placeholder="Notes..."
                                />
                            </div>
                        </>
                    ) : logType === 'lift' ? (
                        <>
                            <div>
                                <input
                                    value={liftForm.exercise}
                                    onChange={e => setLiftForm({ ...liftForm, exercise: e.target.value })}
                                    className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-3 text-sm focus:border-emerald-500/50 focus:outline-none transition-colors text-white"
                                    placeholder="Exercise Name"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <input type="number" placeholder="Sets" className="bg-[#0a0a0a] border border-zinc-800 rounded-lg px-2 py-3 text-sm text-center focus:border-emerald-500/50 focus:outline-none transition-all" value={liftForm.sets} onChange={e => setLiftForm({ ...liftForm, sets: e.target.value })} />
                                <input type="number" placeholder="Reps" className="bg-[#0a0a0a] border border-zinc-800 rounded-lg px-2 py-3 text-sm text-center focus:border-emerald-500/50 focus:outline-none transition-all" value={liftForm.reps} onChange={e => setLiftForm({ ...liftForm, reps: e.target.value })} />
                                <input type="number" placeholder="Lbs" className="bg-[#0a0a0a] border border-zinc-800 rounded-lg px-2 py-3 text-sm text-center text-white focus:border-emerald-500/50 focus:outline-none transition-all" value={liftForm.weight} onChange={e => setLiftForm({ ...liftForm, weight: e.target.value })} />
                            </div>
                            <input value={liftForm.notes} onChange={e => setLiftForm({ ...liftForm, notes: e.target.value })} className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-3 text-sm focus:border-emerald-500/50 focus:outline-none transition-all" placeholder="Notes..." />
                        </>
                    ) : logType === 'cardio' ? (
                        <>
                            {/* CARDIO FORM */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <input
                                        value={cardioForm.activity}
                                        onChange={e => setCardioForm({ ...cardioForm, activity: e.target.value })}
                                        className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-3 text-sm focus:border-blue-500/50 focus:outline-none transition-colors"
                                        placeholder="Activity (e.g. Run)"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <input
                                        type="number"
                                        value={cardioForm.duration}
                                        onChange={e => setCardioForm({ ...cardioForm, duration: e.target.value })}
                                        className="bg-[#0a0a0a] border border-zinc-800 rounded-lg px-2 py-3 text-sm text-center focus:border-blue-500/50 focus:outline-none"
                                        placeholder="Mins"
                                    />
                                    <input
                                        value={cardioForm.distance}
                                        onChange={e => setCardioForm({ ...cardioForm, distance: e.target.value })}
                                        className="bg-[#0a0a0a] border border-zinc-800 rounded-lg px-2 py-3 text-sm text-center focus:border-blue-500/50 focus:outline-none"
                                        placeholder="Dist"
                                    />
                                    <input
                                        value={cardioForm.heartRate}
                                        onChange={e => setCardioForm({ ...cardioForm, heartRate: e.target.value })}
                                        className="bg-[#0a0a0a] border border-zinc-800 rounded-lg px-2 py-3 text-sm text-center focus:border-blue-500/50 focus:outline-none"
                                        placeholder="HR"
                                    />
                                </div>
                            </div>
                            <input value={cardioForm.notes} onChange={e => setCardioForm({ ...cardioForm, notes: e.target.value })} className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-3 text-sm focus:border-blue-500/50 focus:outline-none transition-all" placeholder="Notes..." />
                        </>
                    ) : null}

                    {logType === 'nutrition' && (
                        <div className="space-y-4">
                            {/* Net Calorie Budget Card */}
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex justify-between items-center">
                                <div>
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Daily Budget</div>
                                    <div className="text-xs text-zinc-400">
                                        <span className="text-white font-bold">{netCalories + caloriesIn}</span> (TDEE + Activity)
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

                            <textarea
                                value={foodInput}
                                onChange={e => setFoodInput(e.target.value)}
                                className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-3 text-sm focus:border-amber-500/50 focus:outline-none transition-colors min-h-[80px]"
                                placeholder="Describe your meal (e.g. 'Chicken breast and rice')..."
                            />

                            {!foodAnalysis ? (
                                <button
                                    type="button"
                                    onClick={handleAnalyzeFood}
                                    disabled={isAnalyzing || !foodInput}
                                    className="w-full py-3 bg-zinc-800 text-zinc-200 text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-700 transition-colors"
                                >
                                    {isAnalyzing ? <span className="animate-pulse">Analyzing...</span> : 'Analyze Meal'}
                                </button>
                            ) : (
                                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Identified</div>
                                            <div className="text-white text-sm font-medium">{foodAnalysis.item_name}</div>
                                        </div>
                                        <div className="text-right">
                                            <button type="button" onClick={() => setFoodAnalysis(null)} className="text-[10px] text-zinc-500 hover:text-white underline">Reset</button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                        <div className="bg-black/40 rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-white">{foodAnalysis.calories}</div>
                                            <div className="text-[10px] text-zinc-500 uppercase">Calories</div>
                                        </div>
                                        <div className="bg-black/40 rounded-lg p-3 text-center">
                                            <div className="text-2xl font-bold text-amber-500">{foodAnalysis.protein}g</div>
                                            <div className="text-[10px] text-zinc-500 uppercase">Protein</div>
                                        </div>
                                    </div>
                                    {foodAnalysis.reasoning && (
                                        <div className="text-[10px] text-zinc-500 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50 italic">
                                            Ai: "{foodAnalysis.reasoning}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Hide standard submit button for nutrition unless analyzed */}
                    {(logType !== 'nutrition' || foodAnalysis) && (
                        <button type="submit" disabled={isSubmitting} className="w-full py-4 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5 mt-2">
                            {isSubmitting ? 'Saving...' : 'Log Entry'}
                        </button>
                    )}
                </form>
            </div >
        </div >
    );
}
