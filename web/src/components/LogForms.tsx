
import React, { useState, useRef } from 'react';
import { Activity, Plus, Scale, Utensils, Dumbbell, Heart, Mountain, Camera } from 'lucide-react';
import { EaglesPeakForm } from './EaglesPeakForm';


import { DataContext, Lift } from '@/lib/types'; // Import Lift type
import { detectTier } from '@/lib/analytics'; // Import tier detection
import { normalizeExerciseName, matchesExercise } from '@/lib/exercise-aliases';

interface LogFormsProps {
    logType: 'weigh-in' | 'lift' | 'cardio' | 'nutrition' | 'eagles-peak';
    setLogType: (type: 'weigh-in' | 'lift' | 'cardio' | 'nutrition' | 'eagles-peak') => void;
    lifts?: Lift[]; // Add lifts prop
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
    handleAnalyzeFood: (imageSrc?: string) => void; // Updated signature
    isSubmitting: boolean;
    handleLogSubmit: (e: React.FormEvent, typeOverride?: 'weigh-in' | 'lift' | 'cardio' | 'nutrition' | 'eagles-peak') => void;
    preferences?: {
        hideCardio?: boolean;
        hideLifts?: boolean;
        hideBodyFat?: boolean;
        hideNutrition?: boolean;
        showEaglesPeak?: boolean;
    };
    logDate: string;
    setLogDate: (date: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onLogEaglesPeak?: (data: any) => Promise<void>;
    hideTabs?: boolean;
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
    preferences, logDate, setLogDate, lifts = [], onLogEaglesPeak,
    hideTabs = false
}: LogFormsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Unique Exercises for Datalist — normalized to canonical names
    const uniqueExercises = React.useMemo(() => {
        const set = new Set(lifts.map(l => normalizeExerciseName(l.exercise)));
        return Array.from(set).sort();
    }, [lifts]);



    // Lift Suggestions
    const [showSuggestions, setShowSuggestions] = useState(false);
    const filteredExercises = React.useMemo(() => {
        if (!liftForm.exercise) return uniqueExercises;
        const input = liftForm.exercise.toLowerCase();
        // Show any canonical exercise whose name contains the input OR whose input normalizes to it
        const normalizedInput = normalizeExerciseName(liftForm.exercise);
        return uniqueExercises.filter(ex =>
            ex.toLowerCase().includes(input) || normalizedInput === ex
        );
    }, [uniqueExercises, liftForm.exercise]);

    const handleSelectExercise = (ex: string) => {
        setLiftForm({ ...liftForm, exercise: ex });
        setShowSuggestions(false);
    };

    // Food Suggestions
    const commonFoods = [
        "30g protein shake (30g protein, 150 calories)",
        "Homemade protein shake (60g protein, 400 calories)",
        "20g protein bar (20g protein, 200 calories)",
        "Chicken Breast (6oz cooked)",
        "Greek Yogurt Cup"
    ];
    const [showFoodSuggestions, setShowFoodSuggestions] = useState(false);
    const filteredFoods = React.useMemo(() => {
        if (!foodInput) return commonFoods;
        return commonFoods.filter(f => f.toLowerCase().includes(foodInput.toLowerCase()));
    }, [foodInput]);

    const handleSelectFood = (food: string) => {
        setFoodInput(food);
        setShowFoodSuggestions(false);
    };

    // Smart History Logic
    const getHistory = () => {
        if (!liftForm.exercise || lifts.length === 0) return null;

        const searchTerm = liftForm.exercise.trim();
        if (!searchTerm) return null;

        // Use matchesExercise so "Bench Press" matches "Bench" history
        const exerciseLifts = lifts
            .filter(l => matchesExercise(l.exercise, searchTerm))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (exerciseLifts.length === 0) return null;

        const lastT1 = exerciseLifts.find(l => {
            const reps = parseFloat(l.reps);
            return !isNaN(reps) && detectTier(reps) === 'T1';
        });

        const lastT2 = exerciseLifts.find(l => {
            const reps = parseFloat(l.reps);
            return !isNaN(reps) && detectTier(reps) === 'T2';
        });

        return { lastT1, lastT2 };
    };

    const history = logType === 'lift' ? getHistory() : null;


    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Resize Logic
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_DIM = 1500; // Safety resize for API limit

                if (width > MAX_DIM || height > MAX_DIM) {
                    if (width > height) {
                        height *= MAX_DIM / width;
                        width = MAX_DIM;
                    } else {
                        width *= MAX_DIM / height;
                        height = MAX_DIM;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const base64 = canvas.toDataURL('image/jpeg', 0.8);

                // Trigger Analysis Immediately
                handleAnalyzeFood(base64);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);

        // Reset input so same file can be selected again if needed
        e.target.value = '';
    };

    return (
        <div className="space-y-4 pt-6 border-t border-zinc-800/50">
            {!hideTabs && (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 px-2">
                        {/* Dynamic Icon */}
                        {logType === 'weigh-in' && <Scale size={18} className="text-purple-500" />}
                        {logType === 'lift' && <Dumbbell size={18} className="text-emerald-500" />}
                        {logType === 'cardio' && <Heart size={18} className="text-blue-500" />}
                        {logType === 'nutrition' && <Utensils size={18} className="text-amber-500" />}
                        {logType === 'eagles-peak' && <Mountain size={18} className="text-amber-600" />}
                    </div>
                    <div className="flex flex-wrap gap-1 w-full bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                        <button type="button" onClick={() => setLogType('weigh-in')} className={`flex-1 min-w-[70px] py-1.5 text-[10px] font-bold rounded-md transition-all ${logType === 'weigh-in' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}>BODY</button>
                        {!preferences?.hideLifts && (
                            <button type="button" onClick={() => setLogType('lift')} className={`flex-1 min-w-[70px] py-1.5 text-[10px] font-bold rounded-md transition-all ${logType === 'lift' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}>LIFT</button>
                        )}
                        {!preferences?.hideCardio && (
                            <button type="button" onClick={() => setLogType('cardio')} className={`flex-1 min-w-[70px] py-1.5 text-[10px] font-bold rounded-md transition-all ${logType === 'cardio' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}>CARDIO</button>
                        )}
                        {!preferences?.hideNutrition && (
                            <button type="button" onClick={() => setLogType('nutrition')} className={`flex-1 min-w-[70px] py-1.5 text-[10px] font-bold rounded-md transition-all ${logType === 'nutrition' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}>FOOD</button>
                        )}
                        {preferences?.showEaglesPeak && (
                            <button type="button" onClick={() => setLogType('eagles-peak')} className={`flex-1 min-w-[70px] py-1.5 text-[10px] font-bold rounded-md transition-all ${logType === 'eagles-peak' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}>PEAK</button>
                        )}
                    </div>
                </div>
            )}

            {/* Date Picker (Optional) */}
            <div className="flex justify-end mb-2" key={logType}>
                <input
                    type="date"
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="bg-transparent text-zinc-500 text-[10px] font-mono border-b border-zinc-800 focus:border-emerald-500 focus:outline-none text-right appearance-none"
                    placeholder="Today"
                />
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6">
                <form onSubmit={(e) => handleLogSubmit(e, logType)} className="space-y-4">
                    {logType === 'weigh-in' && (
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
                                {!preferences?.hideBodyFat && (
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
                                )}
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
                    )}

                    {logType === 'lift' && (
                        <>
                            <div className="relative group">
                                <input
                                    value={liftForm.exercise}
                                    onChange={e => {
                                        setLiftForm({ ...liftForm, exercise: e.target.value });
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                    className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-3 text-sm focus:border-emerald-500/50 focus:outline-none transition-colors text-white"
                                    placeholder="Exercise Name"
                                    autoComplete="off"
                                />
                                {showSuggestions && filteredExercises.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                                        {filteredExercises.map(ex => (
                                            <div
                                                key={ex}
                                                onMouseDown={(e) => { e.preventDefault(); handleSelectExercise(ex); }}
                                                className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer transition-colors"
                                            >
                                                {ex}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Smart History Display */}
                            {history && (
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    {history.lastT1 ? (
                                        <div className="bg-black/40 border border-zinc-800 rounded p-2 text-[10px]">
                                            <div className="text-emerald-500 font-bold uppercase mb-0.5">Last T1 (Heavy)</div>
                                            <div className="text-white font-mono">{history.lastT1.weight}lbs</div>
                                            <div className="text-zinc-400">{history.lastT1.sets}x{history.lastT1.reps} on {history.lastT1.date.split('/').slice(0, 2).join('/')}</div>
                                            {history.lastT1.notes && <div className="text-zinc-500 italic truncate mt-1">"{history.lastT1.notes}"</div>}
                                        </div>
                                    ) : <div className="bg-black/20 border border-zinc-800/50 rounded p-2 text-[10px] text-zinc-600 flex items-center justify-center">No T1 History</div>}

                                    {history.lastT2 ? (
                                        <div className="bg-black/40 border border-zinc-800 rounded p-2 text-[10px]">
                                            <div className="text-blue-500 font-bold uppercase mb-0.5">Last T2 (Vol)</div>
                                            <div className="text-white font-mono">{history.lastT2.weight}lbs</div>
                                            <div className="text-zinc-400">{history.lastT2.sets}x{history.lastT2.reps} on {history.lastT2.date.split('/').slice(0, 2).join('/')}</div>
                                            {history.lastT2.notes && <div className="text-zinc-500 italic truncate mt-1">"{history.lastT2.notes}"</div>}
                                        </div>
                                    ) : <div className="bg-black/20 border border-zinc-800/50 rounded p-2 text-[10px] text-zinc-600 flex items-center justify-center">No T2 History</div>}
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-3">
                                <input type="number" placeholder="Sets" className="bg-[#0a0a0a] border border-zinc-800 rounded-lg px-2 py-3 text-sm text-center focus:border-emerald-500/50 focus:outline-none transition-all" value={liftForm.sets} onChange={e => setLiftForm({ ...liftForm, sets: e.target.value })} />
                                <input type="number" placeholder="Reps" className="bg-[#0a0a0a] border border-zinc-800 rounded-lg px-2 py-3 text-sm text-center focus:border-emerald-500/50 focus:outline-none transition-all" value={liftForm.reps} onChange={e => setLiftForm({ ...liftForm, reps: e.target.value })} />
                                <input type="number" placeholder="Lbs" className="bg-[#0a0a0a] border border-zinc-800 rounded-lg px-2 py-3 text-sm text-center text-white focus:border-emerald-500/50 focus:outline-none transition-all" value={liftForm.weight} onChange={e => setLiftForm({ ...liftForm, weight: e.target.value })} />
                            </div>
                            <input value={liftForm.notes} onChange={e => setLiftForm({ ...liftForm, notes: e.target.value })} className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-3 text-sm focus:border-emerald-500/50 focus:outline-none transition-all" placeholder="Notes..." />
                        </>
                    )}

                    {logType === 'cardio' && (
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
                    )}

                    {logType === 'nutrition' && (
                        <div className="space-y-4">


                            <div className="relative group">
                                <textarea
                                    value={foodInput}
                                    onChange={e => {
                                        setFoodInput(e.target.value);
                                        setShowFoodSuggestions(true);
                                    }}
                                    onFocus={() => setShowFoodSuggestions(true)}
                                    // Delay blur to allow click
                                    onBlur={() => setTimeout(() => setShowFoodSuggestions(false), 200)}
                                    className="w-full bg-[#0a0a0a] border border-zinc-800 rounded-lg px-3 py-3 pr-12 text-sm focus:border-amber-500/50 focus:outline-none transition-colors min-h-[80px]"
                                    placeholder="Describe your meal..."
                                    autoComplete="off"
                                />
                                {showFoodSuggestions && filteredFoods.length > 0 && !foodAnalysis && (
                                    <div className="absolute z-10 w-full mt-1 bg-[#0a0a0a] border border-zinc-800 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                                        {filteredFoods.map(food => (
                                            <div
                                                key={food}
                                                onMouseDown={(e) => { e.preventDefault(); handleSelectFood(food); }}
                                                className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 cursor-pointer transition-colors"
                                            >
                                                {food}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {/* Camera Button */}
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="absolute bottom-3 right-3 text-zinc-500 hover:text-amber-500 transition-colors"
                                    title="Upload Food Photo"
                                >
                                    <Camera size={20} />
                                </button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    ref={fileInputRef}
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />
                            </div>

                            {!foodAnalysis ? (
                                <button
                                    type="button"
                                    onClick={() => handleAnalyzeFood()}
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


                    {/* Hide standard submit button for nutrition unless analyzed, OR for eagles-peak (it has its own button) */}
                    {((logType !== 'nutrition' && logType !== 'eagles-peak') || (logType === 'nutrition' && foodAnalysis)) && (
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full py-4 text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg mt-2 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                ${logType === 'weigh-in' ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/20' : ''}
                                ${logType === 'lift' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20' : ''}
                                ${logType === 'cardio' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20' : ''}
                                ${logType === 'nutrition' ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20' : ''}
                            `}
                        >
                            {isSubmitting ? 'Saving...' : 'Save'}
                        </button>
                    )}
                </form>

                {logType === 'eagles-peak' && onLogEaglesPeak && (
                    <div className="pt-2">
                        {/* We just render the dedicated form here, it handles its own submit logic */}
                        {/* We need to hide the generic submit button below */}
                        <EaglesPeakForm
                            date={logDate}
                            setDate={setLogDate}
                            onSubmit={onLogEaglesPeak}
                            isSubmitting={isSubmitting}
                        />
                    </div>
                )}


            </div>
        </div>
    );
}
