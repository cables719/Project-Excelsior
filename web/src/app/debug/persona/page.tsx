'use client';

import React, { useState, useEffect } from 'react';
import { getClaraSystemPrompt } from '@/lib/persona';
import { DataContext, UserProfile } from '@/lib/types';
import { ArrowLeft, RefreshCw, Copy } from 'lucide-react';
import Link from 'next/link';

export default function PersonaDebugPage() {
    // Sliders
    const [attributes, setAttributes] = useState({ warmth: 0.5, intensity: 0.5, verbosity: 0.5 });

    // Context Toggles
    const [scenario, setScenario] = useState<'neutral' | 'pr' | 'missed' | 'overate'>('neutral');
    const [coachMode, setCoachMode] = useState<'clara' | 'cole' | 'atlas' | 'ember'>('clara');

    // Output
    const [promptText, setPromptText] = useState('');

    useEffect(() => {
        // Mock Data Context
        const mockProfile: UserProfile = {
            name: "Test User",
            age: 30,
            sex: 'M',
            height: 180,
            currentWeight: 180,
            goalWeight: 170,
            activityLevel: 1.55,
            coachMode: coachMode,
            coachAttributes: attributes
        };

        const mockLifts = scenario === 'pr'
            ? [{ date: new Date().toISOString(), exercise: 'Squat', weight: '315', sets: '1', reps: '1', notes: 'PR!' }]
            : scenario === 'missed'
                ? [] // Empty recently?
                : [{ date: new Date().toISOString(), exercise: 'Bench', weight: '225', sets: '3', reps: '5', notes: 'Standard' }];

        const mockNutrition = scenario === 'overate'
            ? [{ date: new Date().toISOString(), time: '20:00', item: 'Pizza', calories: '1500', protein: '40', notes: 'Oops' }]
            : [];

        const mockContext: DataContext = {
            weighIns: [{ date: '2026-01-01', weight: '185', bodyFat: '20', notes: '' }],
            lifts: mockLifts as any[],
            cardio: [],
            nutrition: mockNutrition as any[],
            eaglesPeakLogs: [],
            userProfile: mockProfile,
            formattedString: ''
        };

        const text = getClaraSystemPrompt(mockContext, new Date().toISOString());
        setPromptText(text);

    }, [attributes, scenario, coachMode]);

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans p-8">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/" className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                            Persona Lab
                        </h1>
                        <p className="text-xs text-zinc-500 font-mono">Debug & Simulation</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                    {/* Controls */}
                    <div className="space-y-8">

                        {/* 1. Base Persona */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Base Persona</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {['clara', 'cole', 'atlas', 'ember'].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setCoachMode(m as any)}
                                        className={`px-3 py-2 rounded-lg text-sm border transition-all ${coachMode === m
                                            ? 'bg-purple-900/20 border-purple-500/50 text-purple-200'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                                    >
                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Sliders */}
                        <div className="space-y-6">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Attributes</h3>
                            <div className="space-y-6 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800">
                                <FormSlider
                                    label="Warmth"
                                    avg="Neutral" low="Clinical" high="Affectionate"
                                    val={attributes.warmth}
                                    set={v => setAttributes(p => ({ ...p, warmth: v }))}
                                />
                                <FormSlider
                                    label="Intensity"
                                    avg="Balanced" low="Gentle" high="Hardcore"
                                    val={attributes.intensity}
                                    set={v => setAttributes(p => ({ ...p, intensity: v }))}
                                />
                                <FormSlider
                                    label="Verbosity"
                                    avg="Standard" low="Concise" high="Verbose"
                                    val={attributes.verbosity}
                                    set={v => setAttributes(p => ({ ...p, verbosity: v }))}
                                />
                            </div>
                        </div>

                        {/* 3. Scenario */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Context Scenario</h3>
                            <select
                                value={scenario}
                                onChange={(e) => setScenario(e.target.value as any)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:border-purple-500 outline-none"
                            >
                                <option value="neutral">Neutral Day</option>
                                <option value="pr">Hit a PR (Squat 315)</option>
                                <option value="overate">Overate Pizza (+1500 cal)</option>
                                <option value="missed">Missed Workouts (Empty Log)</option>
                            </select>
                        </div>

                    </div>

                    {/* Output Preview */}
                    <div className="md:col-span-2 flex flex-col h-[700px]">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Generated System Prompt</h3>
                            <button className="text-xs flex items-center gap-1 text-zinc-500 hover:text-white" onClick={() => navigator.clipboard.writeText(promptText)}>
                                <Copy size={12} /> Copy
                            </button>
                        </div>
                        <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-6 overflow-auto custom-scrollbar font-mono text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                            {promptText}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

function FormSlider({ label, val, set, avg, low, high }: { label: string, val: number, set: (v: number) => void, avg: string, low: string, high: string }) {
    return (
        <div className="space-y-3">
            <div className="flex justify-between text-[10px] uppercase font-bold tracking-wider">
                <span className="text-zinc-400">{label}</span>
                <span className={val > 0.6 ? 'text-emerald-400' : val < 0.4 ? 'text-blue-400' : 'text-zinc-600'}>
                    {val > 0.6 ? high : val < 0.4 ? low : avg} ({val.toFixed(1)})
                </span>
            </div>
            <input
                type="range" min="0" max="1" step="0.1"
                value={val}
                onChange={(e) => set(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
        </div>
    );
}
