import React, { useState } from 'react';
import { EaglesPeakLog } from '@/lib/types';
import { ChevronDown, ChevronUp, Activity, Timer, Heart } from 'lucide-react';

interface EaglesPeakFormProps {
    date: string;
    setDate: (date: string) => void;
    onSubmit: (data: Omit<EaglesPeakLog, 'date'>) => Promise<void>;
    isSubmitting: boolean;
}

export function EaglesPeakForm({ date, setDate, onSubmit, isSubmitting }: EaglesPeakFormProps) {
    const [form, setForm] = useState({
        ascentTime: '',
        overallTime: '',
        averagePace: '',
        averageHR: '',
        maxHR: '',
        zone5: '',
        zone4: '',
        zone3: '',
        zone2: '',
        calories: '',
        notes: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(form);
        // Reset specific fields but keep some if needed? No, standard reset.
        setForm({
            ascentTime: '',
            overallTime: '',
            averagePace: '',
            averageHR: '',
            maxHR: '',
            zone5: '',
            zone4: '',
            zone3: '',
            zone2: '',
            calories: '',
            notes: ''
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header / Date */}
            {/* Header removed to reduce redundancy with modal title */}

            <div className="grid grid-cols-2 gap-4">
                {/* Time Stats */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase">Timing</h3>
                    <div className="space-y-2">
                        <input
                            name="ascentTime"
                            placeholder="Ascent Time (mm:ss)"
                            value={form.ascentTime}
                            onChange={handleChange}
                            className="w-full bg-black border border-zinc-800 rounded p-3 text-sm text-white placeholder-zinc-600 focus:border-amber-500 transition-colors"
                        />
                        <input
                            name="overallTime"
                            placeholder="Overall Time (h:mm:ss)"
                            value={form.overallTime}
                            onChange={handleChange}
                            className="w-full bg-black border border-zinc-800 rounded p-3 text-sm text-white placeholder-zinc-600 focus:border-amber-500 transition-colors"
                        />
                        <input
                            name="averagePace"
                            placeholder="Avg Pace (mm:ss)"
                            value={form.averagePace}
                            onChange={handleChange}
                            className="w-full bg-black border border-zinc-800 rounded p-3 text-sm text-white placeholder-zinc-600 focus:border-amber-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Heart Rate Stats */}
                <div className="space-y-4">
                    <h3 className="text-[10px] font-bold text-zinc-600 uppercase">Physio</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            name="averageHR"
                            placeholder="Avg HR"
                            value={form.averageHR}
                            onChange={handleChange}
                            className="w-full bg-black border border-zinc-800 rounded p-3 text-sm text-white placeholder-zinc-600 focus:border-red-500 transition-colors"
                        />
                        <input
                            name="maxHR"
                            placeholder="Max HR"
                            value={form.maxHR}
                            onChange={handleChange}
                            className="w-full bg-black border border-zinc-800 rounded p-3 text-sm text-white placeholder-zinc-600 focus:border-red-500 transition-colors"
                        />
                        <input
                            name="calories"
                            placeholder="Calories"
                            value={form.calories}
                            onChange={handleChange}
                            className="col-span-2 w-full bg-black border border-zinc-800 rounded p-3 text-sm text-white placeholder-zinc-600 focus:border-orange-500 transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Zones Grid */}
            <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-zinc-600 uppercase">HR Zones (%)</h3>
                <div className="grid grid-cols-4 gap-2">
                    <input name="zone5" placeholder="Z5" value={form.zone5} onChange={handleChange} className="bg-black border border-zinc-800 rounded p-2 text-center text-sm focus:border-red-500" />
                    <input name="zone4" placeholder="Z4" value={form.zone4} onChange={handleChange} className="bg-black border border-zinc-800 rounded p-2 text-center text-sm focus:border-orange-500" />
                    <input name="zone3" placeholder="Z3" value={form.zone3} onChange={handleChange} className="bg-black border border-zinc-800 rounded p-2 text-center text-sm focus:border-yellow-500" />
                    <input name="zone2" placeholder="Z2" value={form.zone2} onChange={handleChange} className="bg-black border border-zinc-800 rounded p-2 text-center text-sm focus:border-green-500" />
                </div>
            </div>

            <textarea
                name="notes"
                placeholder="Notes (Weather, feel, gear...)"
                value={form.notes}
                onChange={handleChange}
                className="w-full bg-black border border-zinc-800 rounded p-3 text-sm text-white placeholder-zinc-600 min-h-[80px] focus:border-zinc-600 transition-colors resize-none"
            />

            <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? 'Saving...' : 'Save'}
            </button>
        </form>
    );
}
