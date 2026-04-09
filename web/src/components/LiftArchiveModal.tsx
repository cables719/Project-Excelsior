import React, { useState, useMemo } from 'react';
import { Search, Trophy, Database, Calendar, X } from 'lucide-react';
import { Lift } from '@/lib/types';
import { normalizeExerciseName } from '@/lib/exercise-aliases';
import { calculateE1RM, detectTier, detectPRLiftKeys } from '@/lib/analytics';

interface LiftArchiveModalProps {
    isOpen: boolean;
    onClose?: () => void;
    lifts: Lift[];
}

export function LiftArchiveModal({ isOpen, onClose, lifts }: LiftArchiveModalProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterExercise, setFilterExercise] = useState('All');
    const [filterTier, setFilterTier] = useState('All');

    const prKeys = useMemo(() => detectPRLiftKeys(lifts), [lifts]);

    const uniqueExercises = useMemo(() => {
        const set = new Set(lifts.map(l => normalizeExerciseName(l.exercise)));
        return Array.from(set).sort();
    }, [lifts]);

    const processedLifts = useMemo(() => {
        return lifts
            .map(l => {
                const w = parseFloat(l.weight) || 0;
                const r = parseFloat(l.reps) || 0;
                const s = parseFloat(l.sets) || 0;
                const canonical = normalizeExerciseName(l.exercise);
                const isPR = prKeys.has(`${l.date}|${canonical}|${l.weight}|${l.reps}|${l.sets}`);
                const e1rm = calculateE1RM(w, r);
                const tier = detectTier(r);

                return {
                    ...l,
                    canonical,
                    weightNum: w,
                    repsNum: r,
                    setsNum: s,
                    e1rm,
                    tier,
                    isPR,
                    displayDate: l.date.includes('/') ? l.date.split('/').slice(0, 2).join('/') : l.date,
                    dateObj: new Date(l.date)
                };
            })
            .filter(l => filterExercise === 'All' || l.canonical === filterExercise)
            .filter(l => filterTier === 'All' || l.tier === filterTier)
            .filter(l => {
                if (!searchTerm) return true;
                const term = searchTerm.toLowerCase();
                return (
                    l.canonical.toLowerCase().includes(term) ||
                    (l.notes && l.notes.toLowerCase().includes(term))
                );
            })
            .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime()); // Descending
    }, [lifts, filterExercise, filterTier, searchTerm, prKeys]);

    const groupedLifts = useMemo(() => {
        const groups: Record<string, typeof processedLifts> = {};
        for (const lift of processedLifts) {
            if (!groups[lift.displayDate]) groups[lift.displayDate] = [];
            groups[lift.displayDate].push(lift);
        }
        return groups;
    }, [processedLifts]);

    const totalSets = processedLifts.length;
    const allTimeE1RM = processedLifts.reduce((max, l) => Math.max(max, l.e1rm), 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 md:left-auto md:right-0 w-full md:w-[600px] h-full z-50 bg-[#080808] md:border-l border-zinc-800/80 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header & Close */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800/80 bg-zinc-900/40">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Database size={20} className="text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-wide">The Iron Vault</h2>
                        <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Lift Archive & Ledger</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-2 bg-black/50 hover:bg-zinc-800 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-zinc-800/50 bg-black/40 space-y-3">

                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <div className="relative flex-1 min-w-[140px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search notes..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                    </div>
                    <select
                        value={filterExercise}
                        onChange={e => setFilterExercise(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none focus:border-emerald-500/50 outline-none"
                    >
                        <option value="All">All Lifts</option>
                        {uniqueExercises.map(ex => (
                            <option key={ex} value={ex}>{ex}</option>
                        ))}
                    </select>
                    <select
                        value={filterTier}
                        onChange={e => setFilterTier(e.target.value)}
                        className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[10px] text-zinc-300 focus:outline-none focus:border-emerald-500/50 outline-none"
                    >
                        <option value="All">All Tiers</option>
                        <option value="T1">T1 (Heavy)</option>
                        <option value="T2">T2 (Volume)</option>
                        <option value="T3">T3 (Accessories)</option>
                    </select>
                </div>

                {/* Quick Stats */}
                <div className="flex justify-between items-center px-1">
                    <div className="text-[10px] text-zinc-500 font-medium">
                        <span className="text-zinc-300 mr-1">{totalSets}</span>Sets
                    </div>
                    {filterExercise !== 'All' && (
                        <div className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                            <Trophy size={10} />
                            <span>{allTimeE1RM} lbs All-Time e1RM</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Ledger Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {Object.keys(groupedLifts).map(date => (
                    <div key={date} className="space-y-1">
                        {/* Day Header - Note: sticky removed per feedback */}
                        <div className="flex items-center gap-2 mb-2 py-1.5 rounded">
                            <Calendar size={12} className="text-emerald-500/70 ml-1" />
                            <span className="text-xs font-bold text-emerald-500/70 uppercase tracking-widest">{date}</span>
                            <div className="h-px flex-1 bg-zinc-800/50 mt-1 ml-2"></div>
                        </div>

                        {/* Density Rows */}
                        <div className="space-y-1 pl-2">
                            {groupedLifts[date].map((lift, i) => {
                                const isDeload = lift.notes?.toLowerCase().includes('deload');
                                const isTest = lift.notes?.toLowerCase().includes('1rm test');
                                const notesToDisplay = lift.notes?.replace(/1rm test/i, '').replace(/deload/i, '').trim();

                                return (
                                    <div key={i} className="flex flex-col py-1.5 border-b border-zinc-800/20 last:border-0 hover:bg-zinc-800/20 px-2 rounded group transition-colors">
                                        <div className="flex justify-between items-center">
                                            {/* Left: Exercise & Details */}
                                            <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                                                <span className="text-[12px] font-bold text-zinc-200 min-w-[80px]">{lift.canonical}</span>
                                                <div className="text-[11px] font-mono whitespace-nowrap">
                                                    <span className="text-emerald-400 font-bold">{lift.weightNum}</span> <span className="text-zinc-600 font-sans">lbs</span>
                                                    <span className="text-zinc-600 mx-1 font-sans">×</span>
                                                    <span className="text-zinc-300 font-bold">{lift.setsNum}</span><span className="text-zinc-600 font-sans">x</span><span className="text-zinc-300 font-bold">{lift.repsNum}</span>
                                                </div>
                                                
                                                {/* Badges inline */}
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[8px] px-1 py-0.5 rounded border font-bold uppercase ${lift.tier === 'T1' ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10' : lift.tier === 'T2' ? 'border-blue-500/30 text-blue-500 bg-blue-500/10' : 'border-zinc-700/50 text-zinc-400 bg-zinc-800/50'}`}>
                                                        {lift.tier}
                                                    </span>
                                                    {lift.isPR && (
                                                        <span className="flex items-center gap-0.5 px-1 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-[8px] text-amber-500 font-bold tracking-wider uppercase">
                                                            <Trophy size={8} /> PR
                                                        </span>
                                                    )}
                                                    {isTest && (
                                                        <span className="text-[8px] px-1 py-0.5 rounded border border-purple-500/30 text-purple-400 bg-purple-500/10 font-bold uppercase">1RM</span>
                                                    )}
                                                    {isDeload && (
                                                        <span className="text-[8px] px-1 py-0.5 rounded border border-sky-500/30 text-sky-400 bg-sky-500/10 font-bold uppercase">DELOAD</span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Right: e1RM */}
                                            <div className="text-[10px] text-zinc-500 whitespace-nowrap hidden sm:block shrink-0 ml-4">
                                                e1RM: <span className="text-zinc-300 font-mono text-[11px]">{lift.e1rm}</span>
                                            </div>
                                        </div>

                                        {/* Notes row */}
                                        {notesToDisplay && (
                                            <div className="mt-1 text-[10px] text-zinc-500 italic pl-[92px]">
                                                {notesToDisplay}
                                            </div>
                                        )}
                                        {/* Mobile e1RM fallback */}
                                        <div className="sm:hidden mt-1 text-[9px] text-zinc-600">
                                            e1RM: <span className="text-zinc-400 font-mono">{lift.e1rm}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
                {processedLifts.length === 0 && (
                    <div className="text-center py-10 text-zinc-600 text-xs text-balance px-4">
                        No logs match your search. Time to lift!
                    </div>
                )}
            </div>
        </div>
    );
}
