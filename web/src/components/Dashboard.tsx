import React from 'react';
import { Activity } from 'lucide-react';
import { StatCard } from './ui/StatCard';
import { WellnessCard } from './WellnessCard';
import { Lift, EaglesPeakLog, HydrationLog, WellnessLog } from '@/lib/types';
import { calculateStreak } from '@/lib/analytics';

// Tab Sub-components
import { BodyTab } from './BodyTab';
import { NutritionTab } from './NutritionTab';
import { ExerciseTab } from './ExerciseTab';
import { EaglesPeakTab } from './EaglesPeakTab';
import { RecentActivity } from './RecentActivity';


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
    onStartWorkout?: () => void;

    // Wellness Props
    hydrationLogs?: HydrationLog[];
    wellnessLogs?: WellnessLog[];
    onLogHydration?: (amount: number) => Promise<void>;
    onLogWellness?: (mood: number, energy: number, notes: string) => Promise<void>;

    // Blueprint Props
    onSuggestBlueprint?: (constraints: string) => void;
    suggestedWorkout?: any;
    isSuggestingWorkout?: boolean;

    // Deprecated / unused props can be removed or kept as optional/any for compatibility
    // keeping them loose for now to prevent strict breakages if parent passes them
    [key: string]: any;
}

export function Dashboard({
    currentWeight, currentBF, avgWeight, avgBF, graphData, nutritionGraphData,
    onOpenLogModal, onStartWorkout,
    netCalories, caloriesIn, proteinIn, proteinTarget, activityBurn, filteredActivity, preferences,
    lifts = [], eaglesPeakLogs = [], cardio = [], weighIns = [], nutrition = [],
    hydrationLogs = [], wellnessLogs = [], onLogHydration = async () => { }, onLogWellness = async () => { },
    onSuggestBlueprint, suggestedWorkout, isSuggestingWorkout
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
    }, [activeGraph, preferences]);

    // Safety check: if nutrition hidden preference is on, force Biometrics active
    React.useEffect(() => {
        if (preferences?.hideNutrition && activeGraph === 'nutrition') {
            setActiveGraph('biometrics');
        }
        if (!preferences?.showWellness && activeGraph === 'wellness') {
            setActiveGraph('biometrics');
        }
    }, [preferences?.hideNutrition, preferences?.showWellness, activeGraph]);

    return (
        <div className="w-full md:w-[600px] bg-[#080808] md:border-l border-zinc-800/80 flex flex-col h-full shadow-2xl z-20">

            {/* Header / Top Section */}
            <div className="flex-1 overflow-y-auto pt-6 px-4 pb-20 md:pt-8 md:px-8 md:pb-8 space-y-6 md:space-y-10 custom-scrollbar">

                {/* 1. Header & Stats */}
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-xl font-black bg-gradient-to-r from-zinc-100 to-zinc-500 bg-clip-text text-transparent tracking-widest uppercase">DASHBOARD</h1>
                            <p className="text-zinc-500 text-[10px] font-bold mt-1 uppercase tracking-wider">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>

                </div>
                {/* Biometrics Section */}
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
                        <div className="flex gap-2 border-b border-zinc-800/50 pb-3 mb-6">
                            <button
                                onClick={() => setActiveGraph('biometrics')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeGraph === 'biometrics' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50'}`}
                            >
                                Body
                            </button>

                            {!preferences?.hideLifts && (
                                <button
                                    onClick={() => setActiveGraph('exercise')}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeGraph === 'exercise' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50 border border-transparent'}`}
                                >
                                    Exercise
                                </button>
                            )}

                            {!preferences?.hideNutrition && (
                                <button
                                    onClick={() => setActiveGraph('nutrition')}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeGraph === 'nutrition' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-sm' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50 border border-transparent'}`}
                                >
                                    Food
                                </button>
                            )}

                            {showEaglesPeak && (
                                <button
                                    onClick={() => setActiveGraph('eagles-peak')}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeGraph === 'eagles-peak' ? 'bg-amber-600/10 text-amber-600 border border-amber-600/20 shadow-sm' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50 border border-transparent'}`}
                                >
                                    Peak
                                </button>
                            )}

                            {preferences?.showWellness && (
                                <button
                                    onClick={() => setActiveGraph('wellness')}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${activeGraph === 'wellness' ? 'bg-blue-400/10 text-blue-400 border border-blue-400/20 shadow-sm' : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50 border border-transparent'}`}
                                >
                                    Wellness
                                </button>
                            )}

                        </div>

                        {/* Tab Content */}
                        {activeGraph === 'biometrics' ? (
                            <BodyTab graphData={graphData} preferences={preferences} onOpenLogModal={onOpenLogModal} />
                        ) : activeGraph === 'nutrition' ? (
                            <NutritionTab
                                nutritionGraphData={nutritionGraphData}
                                netCalories={netCalories}
                                caloriesIn={caloriesIn}
                                proteinIn={proteinIn}
                                proteinTarget={proteinTarget}
                                onOpenLogModal={onOpenLogModal}
                            />
                        ) : activeGraph === 'exercise' ? (
                            <ExerciseTab
                                lifts={lifts}
                                currentWeight={currentWeight}
                                avgWeight={avgWeight}
                                preferences={preferences}
                                onOpenLogModal={onOpenLogModal}
                                onStartWorkout={onStartWorkout}
                                onSuggestBlueprint={onSuggestBlueprint}
                                suggestedWorkout={suggestedWorkout}
                                isSuggestingWorkout={isSuggestingWorkout}
                            />
                        ) : activeGraph === 'eagles-peak' ? (
                            <EaglesPeakTab eaglesPeakLogs={eaglesPeakLogs} onOpenLogModal={onOpenLogModal} />
                        ) : (
                            /* Wellness */
                            <WellnessCard
                                hydrationLogs={hydrationLogs}
                                wellnessLogs={wellnessLogs}
                                onLogHydration={onLogHydration}
                                onLogWellness={onLogWellness}
                                hydrationTarget={preferences?.hydrationTarget}
                            />
                        )}
                    </div>

                </div>

                {/* 3. Recent Activity (Filtered by Tab) */}
                <RecentActivity
                    activeGraph={activeGraph}
                    weighIns={weighIns}
                    lifts={lifts}
                    cardio={cardio}
                    nutrition={nutrition}
                    eaglesPeakLogs={eaglesPeakLogs}
                    hydrationLogs={hydrationLogs}
                    wellnessLogs={wellnessLogs}
                />

            </div>
        </div >
    );
}
