import React, { useState, useMemo } from 'react';
import { Droplets, Brain, Plus, Check } from 'lucide-react';
import { HydrationLog, WellnessLog } from '@/lib/types';
import { toast } from 'react-hot-toast';

interface WellnessCardProps {
    hydrationLogs: HydrationLog[];
    wellnessLogs: WellnessLog[];
    onLogHydration: (amount: number) => Promise<void>;
    onLogWellness: (mood: number, energy: number, notes: string) => Promise<void>;
    hydrationTarget?: number;
}

export function WellnessCard({
    hydrationLogs,
    wellnessLogs,
    onLogHydration,
    onLogWellness,
    hydrationTarget = 135
}: WellnessCardProps) {

    // --- Hydration Logic ---
    const today = new Date().toLocaleDateString('en-US');

    const todaysHydration = useMemo(() => {
        return hydrationLogs
            .filter(h => h.date === today)
            .reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
    }, [hydrationLogs, today]);

    const hydrationProgress = Math.min(100, (todaysHydration / hydrationTarget) * 100);

    const [isAddingWater, setIsAddingWater] = useState(false);

    const handleQuickAdd = async (amount: number) => {
        setIsAddingWater(true);
        try {
            await onLogHydration(amount);
            toast.success(`+${amount}oz Added`);
        } catch (e) {
            toast.error("Failed to log water");
        } finally {
            setIsAddingWater(false);
        }
    };

    // --- Wellness Logic ---
    const todaysWellness = useMemo(() => {
        return wellnessLogs.find(w => w.date === today);
    }, [wellnessLogs, today]);

    const [mood, setMood] = useState(3);
    const [notes, setNotes] = useState('');
    const [isSavingWellness, setIsSavingWellness] = useState(false);

    // Initialize from existing log if present
    React.useEffect(() => {
        if (todaysWellness) {
            setMood(parseInt(todaysWellness.mood) || 3);
            setNotes(todaysWellness.notes || '');
        }
    }, [todaysWellness]);

    const handleSaveWellness = async () => {
        setIsSavingWellness(true);
        try {
            await onLogWellness(mood, 0, notes); // Energy is deprecated/hidden, sending 0
            toast.success("Wellness logged");
        } catch (e) {
            toast.error("Failed to save wellness");
        } finally {
            setIsSavingWellness(false);
        }
    };

    const moodLabels: Record<number, string> = {
        1: "Struggling",
        2: "Low",
        3: "Neutral",
        4: "Good",
        5: "Peak"
    };

    // Calculate Mood History (Last 7 Days)
    const moodHistory = useMemo(() => {
        const history = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US');
            const log = wellnessLogs.find(w => w.date === dateStr);
            history.push({
                date: dateStr,
                mood: log ? parseInt(log.mood) : null,
                day: d.toLocaleDateString('en-US', { weekday: 'narrow' })
            });
        }
        return history;
    }, [wellnessLogs]);

    const getMoodColor = (m: number) => {
        if (m >= 4) return 'bg-emerald-500';
        if (m === 3) return 'bg-zinc-500';
        return 'bg-red-500';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* HYDRATION CARD */}
            <div className="bg-[#09090b] border border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="flex justify-between items-start z-10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Droplets className="text-blue-500" size={20} />
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Hydration</h3>
                        </div>
                        <div className="text-3xl font-black text-white mt-2">
                            {(todaysHydration * 0.02957).toFixed(1)} <span className="text-sm font-medium text-zinc-500">/ {(hydrationTarget * 0.02957).toFixed(1)} L</span>
                        </div>
                    </div>
                    {/* Vertical Progress Bar */}
                    <div className="h-24 w-4 bg-zinc-800 rounded-full overflow-hidden flex flex-col-reverse relative">
                        <div
                            className="w-full bg-blue-500 transition-all duration-1000 ease-out absolute bottom-0"
                            style={{ height: `${hydrationProgress}%` }}
                        />
                    </div>
                </div>

                {/* Quick Adds - Moved to bottom, clear of valid data */}
                <div className="grid grid-cols-3 gap-2 mt-6 z-10">
                    <button
                        disabled={isAddingWater}
                        onClick={() => handleQuickAdd(8)}
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold py-2 rounded-lg border border-zinc-700 transition-colors flex flex-col items-center gap-1"
                    >
                        <Plus size={14} /> Cup
                    </button>
                    <button
                        disabled={isAddingWater}
                        onClick={() => handleQuickAdd(17)}
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold py-2 rounded-lg border border-zinc-700 transition-colors flex flex-col items-center gap-1"
                    >
                        <Plus size={14} /> 500ml
                    </button>
                    <button
                        disabled={isAddingWater}
                        onClick={() => handleQuickAdd(34)}
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold py-2 rounded-lg border border-zinc-700 transition-colors flex flex-col items-center gap-1"
                    >
                        <Plus size={14} /> 1L
                    </button>
                </div>
            </div>

            {/* WELLNESS CARD */}
            <div className="bg-[#09090b] border border-zinc-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <Brain className="text-emerald-500" size={20} />
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Mood</h3>
                        </div>
                        {todaysWellness && <div className="text-emerald-500"><Check size={16} /></div>}
                    </div>

                    {/* Mood Slider */}
                    <div className="space-y-4">
                        <div className="flex justify-between text-xs font-medium text-zinc-500">
                            <span className="text-white text-lg font-bold">{moodLabels[mood]}</span>
                            <span>{mood}/5</span>
                        </div>
                        <input
                            type="range"
                            min="1" max="5"
                            value={mood}
                            onChange={(e) => setMood(parseInt(e.target.value))}
                            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between px-1">
                            {[1, 2, 3, 4, 5].map(n => (
                                <div key={n} className="w-1 h-1 bg-zinc-700 rounded-full" />
                            ))}
                        </div>
                    </div>
                </div>

                {/* History & Save */}
                <div className="mt-6 space-y-4">
                    {/* History Dots */}
                    <div className="flex justify-between items-end h-8 px-2">
                        {moodHistory.map((day, i) => (
                            <div key={i} className="flex flex-col items-center gap-1 group">
                                <div
                                    className={`w-2 h-2 rounded-full ${day.mood ? getMoodColor(day.mood) : 'bg-zinc-800'}`}
                                    title={day.date + (day.mood ? `: ${day.mood}/5` : '')}
                                />
                                <span className="text-[9px] text-zinc-600 font-mono uppercase">{day.day}</span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSaveWellness}
                        disabled={isSavingWellness}
                        className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/50 text-xs font-bold py-2 rounded-lg transition-all"
                    >
                        {isSavingWellness ? 'Saving...' : (todaysWellness ? 'Update Mood' : 'Log Mood')}
                    </button>
                </div>
            </div>

        </div>
    );
}
