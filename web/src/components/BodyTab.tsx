import React, { useState, useMemo } from 'react';
import { Scale, Plus } from 'lucide-react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Line, Scatter, CartesianGrid } from 'recharts';
import { CustomTooltip } from './ui/Tooltips';
import { aggregateByWeek } from '../lib/analytics';

interface BodyTabProps {
    graphData: any[];
    preferences?: any;
    onOpenLogModal: (type: 'weigh-in' | 'lift' | 'cardio' | 'nutrition' | 'eagles-peak') => void;
}

export function BodyTab({ graphData, preferences, onOpenLogModal }: BodyTabProps) {
    const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | 'ALL'>('1M');

    // Load saved preference on mount
    React.useEffect(() => {
        const saved = localStorage.getItem('bodyTab_timeRange');
        if (saved && (['1M', '3M', '6M', 'ALL'] as const).includes(saved as any)) {
            setTimeRange(saved as '1M' | '3M' | '6M' | 'ALL');
        }
    }, []);

    // Save preference on change
    const handleTimeRangeChange = (range: '1M' | '3M' | '6M' | 'ALL') => {
        setTimeRange(range);
        localStorage.setItem('bodyTab_timeRange', range);
    };

    const processedData = useMemo(() => {
        if (!graphData || graphData.length === 0) return [];

        switch (timeRange) {
            case '1M':
                return graphData.slice(-30);
            case '3M':
                return graphData.slice(-90);
            case '6M':
                return aggregateByWeek(graphData.slice(-180));
            case 'ALL':
                return aggregateByWeek(graphData);
            default:
                return graphData.slice(-30);
        }
    }, [graphData, timeRange]);

    const isAggregated = timeRange === '6M' || timeRange === 'ALL';

    return (
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

            {/* Time Range Filter */}
            <div className="flex justify-start gap-2 mb-4 bg-zinc-900/50 p-1 rounded-xl w-fit border border-zinc-800/50">
                {(['1M', '3M', '6M', 'ALL'] as const).map(range => (
                    <button
                        key={range}
                        onClick={() => handleTimeRangeChange(range)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${timeRange === range
                            ? 'bg-zinc-800 text-white shadow-sm'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        {range}
                    </button>
                ))}
            </div>

            {/* GRAPH 1: Weight */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 h-64 relative animate-in fade-in zoom-in-95">
                <div className="absolute top-4 left-6 flex flex-col z-10 bg-zinc-900/80 px-2 py-1 rounded-md backdrop-blur-sm">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">Weight Trend (Lbs)</span>
                    {isAggregated && <span className="text-[9px] text-zinc-400 italic mt-0.5">Showing Weekly Averages</span>}
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={processedData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
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
                    <div className="absolute top-4 left-6 flex flex-col z-10 bg-zinc-900/80 px-2 py-1 rounded-md backdrop-blur-sm">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">Body Fat % Trend</span>
                        {isAggregated && <span className="text-[9px] text-zinc-400 italic mt-0.5">Showing Weekly Averages</span>}
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={processedData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
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
    );
}
