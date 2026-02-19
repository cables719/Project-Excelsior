import React from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, Scatter, Bar, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { Activity, Plus, Scale, Utensils, Dumbbell, Heart, Mountain } from 'lucide-react';
import { StatCard } from './ui/StatCard';
import { NutritionOverview } from './NutritionOverview';
import { WellnessCard } from './WellnessCard'; // Import
import { CustomTooltip, NoteTooltip } from './ui/Tooltips';
import { DataContext, Lift, EaglesPeakLog, HydrationLog, WellnessLog } from '@/lib/types';
import { processLifts, aggregateDailyBest, processEaglesPeakData, calculateStreak, determinePersonalBests } from '@/lib/analytics';
import { WilksGauge } from './WilksGauge';
import { Trophy, TrendingUp, Calendar } from 'lucide-react'; // Removed ReferenceLine from lucide, it's recharts.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DashboardProps {
    currentWeight: string;
    currentBF: string;
    avgWeight: number;
    avgBF: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graphData: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nutritionGraphData: any[];
    lifts?: Lift[];
    eaglesPeakLogs?: EaglesPeakLog[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cardio: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    weighIns: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nutrition: any[];

    // New Modal Handler
    onOpenLogModal: (type: 'weigh-in' | 'lift' | 'cardio' | 'nutrition' | 'eagles-peak') => void;

    // Wellness Props
    hydrationLogs?: HydrationLog[];
    wellnessLogs?: WellnessLog[];
    onLogHydration?: (amount: number) => Promise<void>;
    onLogWellness?: (mood: number, energy: number, notes: string) => Promise<void>;

    // Deprecated / unused props can be removed or kept as optional/any for compatibility
    // keeping them loose for now to prevent strict breakages if parent passes them
    [key: string]: any;
}

export function Dashboard({
    currentWeight, currentBF, avgWeight, avgBF, graphData, nutritionGraphData,
    onOpenLogModal,
    netCalories, caloriesIn, proteinIn, proteinTarget, activityBurn, filteredActivity, preferences,
    lifts = [], eaglesPeakLogs = [], cardio = [], weighIns = [], nutrition = [],
    hydrationLogs = [], wellnessLogs = [], onLogHydration = async () => { }, onLogWellness = async () => { }
}: DashboardProps) {

    const [activeGraph, setActiveGraph] = React.useState<'biometrics' | 'nutrition' | 'exercise' | 'eagles-peak' | 'wellness'>('biometrics');
    const [showEaglesPeak, setShowEaglesPeak] = React.useState(false);

    // Initialize Local Preferences
    React.useEffect(() => {
        const localEP = localStorage.getItem('show_eagles_peak') === 'true';
        const isVisible = localEP || !!preferences?.showEaglesPeak;

        setShowEaglesPeak(isVisible);

        // If active graph is EP but it's hidden, switch
        if (activeGraph === 'eagles-peak' && !isVisible) {
            setActiveGraph('biometrics');
        }
    }, [activeGraph, preferences]); // Added preferences dependency
    const [showProtein, setShowProtein] = React.useState(true);

    // Lifting Logic
    const [selectedLift, setSelectedLift] = React.useState<string>('Squat');
    const [liftFilter, setLiftFilter] = React.useState<'all' | 'T1' | 'T2'>('all');

    // Derived Data
    const uniqueLifts = React.useMemo(() => {
        const set = new Set(lifts.map(l => l.exercise));
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

        // Aggregate multiple entries per day to find the "Daily Max"
        return aggregateDailyBest(filtered);
    }, [lifts, selectedLift, liftFilter]);

    // Graph Data Logic: Eagles Peak
    // Graph Data Logic: Eagles Peak
    const { processedEaglesPeakData, eaglesPeakTicks } = React.useMemo(() => {
        return processEaglesPeakData(eaglesPeakLogs);
    }, [eaglesPeakLogs]);


    // Safety check: if nutrition hidden preferene is on, force Biometrics active
    React.useEffect(() => {
        if (preferences?.hideNutrition && activeGraph === 'nutrition') {
            setActiveGraph('biometrics');
        }
    }, [preferences?.hideNutrition, activeGraph]);

    const streak = React.useMemo(() => {
        return calculateStreak({
            lifts,
            cardio,
            weighIns,
            eaglesPeakLogs,
            nutrition: [],
            hydrationLogs: [],
            wellnessLogs: [],
            userProfile: {},
            formattedString: ''
        });
    }, [lifts, cardio, weighIns, eaglesPeakLogs]);



    // Trophy Room Data
    const trophies = React.useMemo(() => {
        const bests = determinePersonalBests(lifts);
        return [
            { label: 'Squat', lift: bests['Squat'] },
            { label: 'Bench', lift: bests['Bench'] },
            { label: 'Deadlift', lift: bests['Deadlift'] },
            { label: 'Press', lift: bests['Press'] }
        ];
    }, [lifts]);

    return (
        <div className="w-full md:w-[600px] bg-[#080808] md:border-l border-zinc-800/80 flex flex-col h-full shadow-2xl z-20">

            {/* Header / Top Section */}
            {/* Using pt-6 md:pt-8 to match Chat Header padding for alignment */}
            <div className="flex-1 overflow-y-auto pt-6 px-4 pb-20 md:pt-8 md:px-8 md:pb-8 space-y-6 md:space-y-10 custom-scrollbar">

                {/* 1. Updated Header & Stats */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tighter">DASHBOARD</h1>
                            <p className="text-zinc-500 text-xs font-medium mt-1">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                </div>
                {/* Original Biometrics section, now outside the grid for GladiatorCard */}
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

                    {/* GRAPH SECTION - TABBED */}
                    <div className="space-y-4">
                        {/* Tab Switcher */}
                        <div className="flex gap-4 border-b border-zinc-800/50 pb-2 mb-6">
                            <button
                                onClick={() => setActiveGraph('biometrics')}
                                className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeGraph === 'biometrics' ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                            >
                                Body
                            </button>

                            {!preferences?.hideLifts && (
                                <button
                                    onClick={() => setActiveGraph('exercise')}
                                    className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeGraph === 'exercise' ? 'text-emerald-500' : 'text-zinc-600 hover:text-zinc-400'}`}
                                >
                                    Exercise
                                </button>
                            )}

                            {!preferences?.hideNutrition && (
                                <button
                                    onClick={() => setActiveGraph('nutrition')}
                                    className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeGraph === 'nutrition' ? 'text-amber-500' : 'text-zinc-600 hover:text-zinc-400'}`}
                                >
                                    Food
                                </button>
                            )}

                            {showEaglesPeak && (
                                <button
                                    onClick={() => setActiveGraph('eagles-peak')}
                                    className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeGraph === 'eagles-peak' ? 'text-amber-600' : 'text-zinc-600 hover:text-zinc-400'}`}
                                >
                                    Peak
                                </button>
                            )}

                            <button
                                onClick={() => setActiveGraph('wellness')}
                                className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${activeGraph === 'wellness' ? 'text-blue-400' : 'text-zinc-600 hover:text-zinc-400'}`}
                            >
                                Wellness
                            </button>

                        </div>

                        {activeGraph === 'biometrics' ? (
                            <>
                                {/* Action Buttons: Weigh-in */}
                                <div className="space-y-6 mb-8">
                                    <button
                                        onClick={() => onOpenLogModal('weigh-in')}
                                        className="w-full bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Scale size={20} className="text-purple-500" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-sm font-bold text-white">Log Body Stats</h3>
                                                <p className="text-[10px] text-zinc-500">Log weight & body fat</p>
                                            </div>
                                        </div>
                                        <Plus size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                                    </button>
                                </div>

                                {/* GRAPH 1: Weight */}
                                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 h-64 relative animate-in fade-in zoom-in-95">
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
                                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 h-64 relative animate-in fade-in zoom-in-95 mt-4">
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
                            </>
                        ) : activeGraph === 'nutrition' ? (
                            /* GRAPH 3: Nutrition (Calories vs Protein) */
                            <>
                                <div className="space-y-6 mb-4">
                                    <button
                                        onClick={() => onOpenLogModal('nutrition')}
                                        className="w-full bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Utensils size={20} className="text-amber-500" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-sm font-bold text-white">Log Meal</h3>
                                                <p className="text-[10px] text-zinc-500">Track calories & macros</p>
                                            </div>
                                        </div>
                                        <Plus size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                                    </button>
                                </div>

                                <div className="mb-6">
                                    <NutritionOverview
                                        netCalories={netCalories}
                                        caloriesIn={caloriesIn}
                                        proteinIn={proteinIn}
                                        proteinTarget={proteinTarget}
                                        dailyBudget={netCalories + caloriesIn}
                                    />
                                </div>

                                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 h-64 relative animate-in fade-in zoom-in-95">
                                    <div className="absolute top-4 left-6 text-[10px] font-bold text-zinc-500 uppercase">Fuel Log (Last 14 Days)</div>
                                    <div className="absolute top-4 right-6 flex gap-3 text-[9px] font-bold uppercase tracking-wider">
                                        <div className="flex items-center gap-1 text-zinc-500"><div className="w-2 h-2 bg-zinc-500 rounded-sm"></div> Cal</div>

                                        {/* Target / Limit Legend */}
                                        <div className="flex items-center gap-1 text-zinc-600"><div className="w-2 h-2 bg-[#27272a] border border-zinc-700 rounded-sm"></div> Limit</div>

                                        {/* Protein Toggle */}
                                        <button
                                            onClick={() => setShowProtein(!showProtein)}
                                            className={`pointer-events-auto flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-zinc-800/50 transition-all border ${showProtein ? 'border-amber-500/30 bg-amber-500/10' : 'border-zinc-800 bg-transparent opacity-60 hover:opacity-100'}`}
                                            style={{ zIndex: 50 }}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${showProtein ? 'bg-amber-500' : 'bg-zinc-600'}`}></div>
                                            <span className={`text-[9px] font-bold ${showProtein ? 'text-amber-500' : 'text-zinc-500'}`}>Protein</span>
                                        </button>
                                    </div>
                                    <ResponsiveContainer width="100%" height="100%">

                                        <ComposedChart data={nutritionGraphData} margin={{ top: 40, right: 0, left: 0, bottom: 0 }} barGap={0}>
                                            <CartesianGrid vertical={false} stroke="#27272a" />

                                            {/* X Axis Overlay Trick: Two axes with same data to overlap bars */}
                                            <XAxis xAxisId="0" dataKey="shortDate" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                            <XAxis xAxisId="1" dataKey="shortDate" hide />

                                            <YAxis yAxisId="left" orientation="left" tick={{ fill: '#52525b', fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: 'Calories', angle: -90, position: 'insideLeft', fill: '#52525b', fontSize: 11, offset: 14 }} />

                                            {/* Hide Right Axis if Protein is hidden */}
                                            {showProtein && (
                                                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#f59e0b', fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 'auto']} label={{ value: 'Protein (g)', angle: 90, position: 'insideRight', fill: '#f59e0b', fontSize: 11, offset: 14 }} />
                                            )}

                                            <Tooltip
                                                content={({ active, payload, label }) => {
                                                    if (active && payload && payload.length) {
                                                        // Find the actual data payload
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-black/90 border border-zinc-800 p-3 rounded-lg shadow-xl backdrop-blur-sm">
                                                                <p className="text-xs font-bold text-zinc-400 mb-2">{label}</p>
                                                                <div className="space-y-1">
                                                                    <p className="text-xs font-bold text-zinc-500 flex justify-between gap-4">
                                                                        <span>Budget:</span>
                                                                        <span>{data.target}</span>
                                                                    </p>
                                                                    <p className="text-xs font-bold text-white flex justify-between gap-4">
                                                                        <span>Actual:</span>
                                                                        <span>{data.calories}</span>
                                                                    </p>
                                                                    {showProtein && (
                                                                        <p className="text-xs font-bold text-amber-500 flex justify-between gap-4">
                                                                            <span>Protein:</span>
                                                                            <span>{data.protein}g</span>
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />

                                            {/* 1. Background Bar: TDEE/Target (xAxisId 0) */}
                                            <Bar xAxisId="0" yAxisId="left" dataKey="target" fill="#27272a" barSize={24} radius={[4, 4, 0, 0]} />

                                            {/* 2. Foreground Bar: Actual Calories (xAxisId 1) - Overlaid */}
                                            <Bar xAxisId="1" yAxisId="left" dataKey="calories" barSize={12} radius={[4, 4, 0, 0]}>
                                                {nutritionGraphData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.calories > entry.target ? '#ef4444' : '#10b981'} />
                                                ))}
                                            </Bar>

                                            {/* 3. Protein Line (Right Axis) */}
                                            {showProtein && (
                                                <>
                                                    <ReferenceLine y={proteinTarget} yAxisId="right" stroke="#f59e0b" strokeDasharray="3 3" opacity={0.5} />
                                                    <Line yAxisId="right" type="monotone" dataKey="protein" stroke="#f59e0b" strokeWidth={2} dot={false} strokeOpacity={0.8} />
                                                </>
                                            )}
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </>
                        ) : activeGraph === 'exercise' ? (
                            <>
                                {/* Lift & Cardio Buttons */}
                                <div className="space-y-4 mb-8">
                                    <button
                                        onClick={() => onOpenLogModal('lift')}
                                        className="w-full bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl flex items-center justify-between group transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Dumbbell size={20} className="text-emerald-500" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-sm font-bold text-white">Log Workout</h3>
                                                <p className="text-[10px] text-zinc-500">Track lifts & reps</p>
                                            </div>
                                        </div>
                                        <Plus size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                                    </button>

                                    {!preferences?.hideCardio && (
                                        <button
                                            onClick={() => onOpenLogModal('cardio')}
                                            className="w-full bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl flex items-center justify-between group transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Heart size={20} className="text-blue-500" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-sm font-bold text-white">Log Cardio</h3>
                                                    <p className="text-[10px] text-zinc-500">Track run, swim, row</p>
                                                </div>
                                            </div>
                                            <Plus size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                                        </button>
                                    )}
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
                            </>
                        ) : activeGraph === 'eagles-peak' ? (

                            /* GRAPH 5: Eagles Peak */
                            <>
                                <div className="mb-4">
                                    <div className="space-y-6 mb-6">
                                        <button
                                            onClick={() => onOpenLogModal('eagles-peak')}
                                            className="w-full bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl flex items-center justify-between group transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-amber-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <Mountain size={20} className="text-amber-600" />
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-sm font-bold text-white">Log Ascent</h3>
                                                    <p className="text-[10px] text-zinc-500">Log Eagles Peak climb</p>
                                                </div>
                                            </div>
                                            <Plus size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 h-64 relative animate-in fade-in zoom-in-95 flex flex-col">
                                    <div className="absolute top-4 left-6 text-xs font-bold text-zinc-500 uppercase">Eagles Peak Climb</div>
                                    <div className="flex-1 min-h-0 mt-6">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                            <ComposedChart data={processedEaglesPeakData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                                                <CartesianGrid vertical={false} stroke="#3f3f46" strokeWidth={1} />
                                                <XAxis
                                                    dataKey="date"
                                                    tick={{ fill: '#52525b', fontSize: 10 }}
                                                    tickFormatter={(val) => {
                                                        const parts = val.split('/');
                                                        if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
                                                        return val;
                                                    }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                    interval="preserveStartEnd"
                                                />
                                                <YAxis
                                                    domain={[eaglesPeakTicks[0], eaglesPeakTicks[eaglesPeakTicks.length - 1]]}
                                                    ticks={eaglesPeakTicks}
                                                    interval={0}
                                                    minTickGap={1}
                                                    type="number"
                                                    allowDecimals={false}
                                                    orientation="left"
                                                    tick={{ fill: '#71717a', fontSize: 10 }}
                                                    tickLine={false}
                                                    axisLine={false}
                                                />

                                                <Tooltip
                                                    content={({ active, payload, label }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-black/90 border border-zinc-800 p-3 rounded-lg shadow-xl backdrop-blur-sm">
                                                                    <p className="text-[10px] font-bold text-zinc-500 mb-2">{label}</p>

                                                                    <div className="space-y-2">
                                                                        {data.roundTrip && (
                                                                            <div className="flex justify-between gap-4">
                                                                                <span className="text-zinc-400 text-xs">Round Trip</span>
                                                                                <span className="text-zinc-300 font-bold font-mono">
                                                                                    {Math.floor(data.roundTrip)}m {Math.round((data.roundTrip % 1) * 60)}s
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        <div className="flex justify-between gap-4">
                                                                            <span className="text-zinc-400 text-xs">Ascent</span>
                                                                            <span className="text-amber-500 font-bold font-mono">
                                                                                {Math.floor(data.ascent)}m {Math.round((data.ascent % 1) * 60)}s
                                                                            </span>
                                                                        </div>
                                                                        {data.hr && (
                                                                            <div className="flex justify-between gap-4">
                                                                                <span className="text-zinc-400 text-xs">Avg HR</span>
                                                                                <span className="text-red-400 font-bold font-mono">{data.hr} bpm</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />

                                                <Line type="monotone" dataKey="roundTrip" stroke="#52525b" strokeWidth={2} dot={false} strokeOpacity={0.5} strokeDasharray="4 4" />
                                                <Line type="monotone" dataKey="ascent" stroke="#d97706" strokeWidth={3} dot={true} strokeOpacity={0.9} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* GRAPH 6: Wellness */
                            <>
                                <WellnessCard
                                    hydrationLogs={hydrationLogs}
                                    wellnessLogs={wellnessLogs}
                                    onLogHydration={onLogHydration}
                                    onLogWellness={onLogWellness}
                                    hydrationTarget={preferences?.hydrationTarget}
                                />
                            </>
                        )}
                    </div>

                    {/* Trophy Room (Between Graphs & Logs) - ONLY for Exercise */}
                    {activeGraph === 'exercise' && (
                        <>
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
                    )}

                    {/* Peak Form - MOVED TOP */}
                    {activeGraph === 'eagles-peak' && (
                        <div className="hidden">
                            {/* Placeholder to keep layout valid if needed, or remove completely if not used */}
                        </div>
                    )}



                </div>

                {/* 3. Recent Activity (Filtered by Tab) */}
                <div className="space-y-6 pt-6 border-t border-zinc-800/50 pb-10">
                    <div className="flex items-center gap-2 mb-2">
                        {activeGraph === 'biometrics' && <Scale size={18} className="text-purple-500" />}
                        {activeGraph === 'exercise' && <Dumbbell size={18} className="text-emerald-500" />}
                        {activeGraph === 'nutrition' && <Utensils size={18} className="text-amber-500" />}
                        {activeGraph === 'eagles-peak' && <Mountain size={18} className="text-amber-600" />}
                        {/* Fallback or default */}
                        {!['biometrics', 'exercise', 'nutrition', 'eagles-peak'].includes(activeGraph) && <Activity size={18} className="text-zinc-500" />}

                        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Recent Activity</h2>
                    </div>

                    <div className="rounded-xl border border-zinc-800/50 overflow-hidden bg-zinc-900/20 backdrop-blur-sm">
                        <div className="">
                            <table className="w-full text-left border-collapse">
                                <tbody>
                                    {(() => {
                                        // Local Filtering Logic for Recent Activity
                                        let localActivity = [];
                                        // Combine all data sources
                                        const combined = [
                                            ...weighIns.map(i => ({ ...i, type: 'weigh-in' })),
                                            ...lifts.map(i => ({ ...i, type: 'lift' })),
                                            ...cardio.map(i => ({ ...i, type: 'cardio' })),
                                            ...nutrition.map(i => ({ ...i, type: 'nutrition' })),
                                            ...eaglesPeakLogs.map(i => ({ ...i, type: 'eagles-peak' }))
                                        ];

                                        // Filter by active graph
                                        if (activeGraph === 'biometrics') {
                                            localActivity = combined.filter(i => i.type === 'weigh-in');
                                        } else if (activeGraph === 'exercise') {
                                            localActivity = combined.filter(i => i.type === 'lift' || i.type === 'cardio');
                                        } else if (activeGraph === 'nutrition') {
                                            localActivity = combined.filter(i => i.type === 'nutrition');
                                        } else if (activeGraph === 'eagles-peak') {
                                            localActivity = combined.filter(i => i.type === 'eagles-peak');
                                        }

                                        // Sort by date descending
                                        localActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                                        // Take top 20
                                        const displayActivity = localActivity.slice(0, 20);

                                        if (displayActivity.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-zinc-600 text-xs">No recent activity for this section</td>
                                                </tr>
                                            );
                                        }

                                        return displayActivity.map((item, index) => {
                                            const isNewDay = index > 0 && item.date !== displayActivity[index - 1].date;
                                            return (
                                                <React.Fragment key={`group-${index}`}>
                                                    {isNewDay && (
                                                        <tr>
                                                            <td colSpan={4} className="p-0">
                                                                <div className="h-1 w-full bg-zinc-800/50"></div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    <tr key={`a-${index}`} className="group hover:bg-white/5 transition-colors border-b border-zinc-800/30 last:border-0">
                                                        <td className="p-3 text-zinc-500 font-mono text-xs whitespace-nowrap w-2 align-middle">
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
                                                        <td className={`p-3 text-zinc-300 font-medium text-xs align-middle ${item.type === 'weigh-in' ? 'w-[1px] px-0' : 'w-auto max-w-[140px] truncate'}`} title={
                                                            item.type === 'cardio' ? item.activity :
                                                                item.type === 'lift' ? item.exercise :
                                                                    ''
                                                        }>
                                                            {item.type === 'cardio' && item.activity}
                                                            {item.type === 'lift' && item.exercise}
                                                            {item.type === 'nutrition' && <span className="text-zinc-500 italic">Nutrition</span>}
                                                            {item.type === 'eagles-peak' && <span className="text-amber-600">Eagles Peak</span>}
                                                        </td>

                                                        {/* VALUES COLUMN - COMPACT */}
                                                        <td className="p-3 font-bold text-white/50 text-left text-xs align-middle whitespace-nowrap">
                                                            {item.type === 'cardio' && (
                                                                <span>
                                                                    <span className="text-blue-400">{item.duration}m</span>
                                                                    {item.heartRate && (
                                                                        <>
                                                                            <span className="text-zinc-600 mx-1">/</span>
                                                                            <span className="text-red-400">{item.heartRate}bpm</span>
                                                                        </>
                                                                    )}
                                                                    {(item.distance && !isNaN(parseFloat(item.distance))) && (
                                                                        <>
                                                                            <span className="text-zinc-600 mx-1">/</span>
                                                                            <span className="text-sky-300">{item.distance}mi</span>
                                                                        </>
                                                                    )}
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
                                                                    <span className="text-white">{item.calories}</span>
                                                                    <span className="text-zinc-600 mx-1">/</span>
                                                                    <span className="text-amber-500">{item.protein}p</span>
                                                                </span>
                                                            )}
                                                            {item.type === 'eagles-peak' && (
                                                                <span>
                                                                    <span className="text-white">
                                                                        {item.ascentTime?.split(':').length >= 3 ? item.ascentTime.split(':').slice(0, 2).join(':') : item.ascentTime}
                                                                    </span>
                                                                    <span className="text-zinc-600 mx-1">/</span>
                                                                    <span className="text-amber-500">
                                                                        {Math.floor(item.ascent)}m
                                                                    </span>
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* NOTES COLUMN */}
                                                        <td className="p-3 align-middle w-auto text-left">
                                                            <div className="relative group flex justify-start w-full">
                                                                <div className="text-[11px] text-zinc-600 italic truncate max-w-[150px] cursor-help hover:text-zinc-400 transition-colors">
                                                                    {item.notes}
                                                                </div>
                                                                {/* Custom Dark Tooltip */}
                                                                {/* Anchored right-0 to prevent screen overflow. Only render if notes exist. */}
                                                                {item.notes && (
                                                                    <div className={`absolute ${index < 3 ? 'top-full mt-1' : 'bottom-full mb-1'} right-0 w-max max-w-[250px] hidden group-hover:block z-[60]`}>
                                                                        <div className="bg-[#111] border border-zinc-800 p-3 rounded-xl shadow-2xl shadow-black/50 text-[11px] text-zinc-300 leading-snug whitespace-normal break-words text-left">
                                                                            {item.notes}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                </React.Fragment>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </div >
    );
}
