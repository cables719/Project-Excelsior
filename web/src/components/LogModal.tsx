import React, { useState } from 'react';
import { X } from 'lucide-react';
import { LogForms } from './LogForms';
import { Lift } from '@/lib/types';
import { toast } from 'react-hot-toast';

interface LogModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'weigh-in' | 'lift' | 'cardio' | 'nutrition' | 'eagles-peak';
    onSave: (data: any) => Promise<void>;
    preferences?: any;
    lifts?: Lift[];
}

export function LogModal({ isOpen, onClose, type, onSave, preferences, lifts = [] }: LogModalProps) {
    // Internal State
    const [logType, setLogType] = useState(type);

    // Sync internal type with prop when it opens
    React.useEffect(() => {
        if (isOpen) {
            setLogType(type);
        }
    }, [isOpen, type]);

    const [logDate, setLogDate] = useState(new Date().toLocaleDateString('en-US'));

    // Forms
    const [weighInForm, setWeighInForm] = useState({ weight: '', bodyFat: '', notes: '' });
    const [liftForm, setLiftForm] = useState({ exercise: '', sets: '', reps: '', weight: '', notes: '' });
    const [cardioForm, setCardioForm] = useState({ activity: '', duration: '', distance: '', heartRate: '', notes: '' });
    const [foodInput, setFoodInput] = useState('');
    const [foodAnalysis, setFoodAnalysis] = useState<any>(null);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForms = () => {
        setFoodInput('');
        setFoodAnalysis(null);
        setWeighInForm({ weight: '', bodyFat: '', notes: '' });
        setLiftForm({ exercise: '', sets: '', reps: '', weight: '', notes: '' });
        setCardioForm({ activity: '', duration: '', distance: '', heartRate: '', notes: '' });
    };

    const handleClose = () => {
        resetForms();
        onClose();
    };

    // Handlers
    const handleAnalyzeFood = async (imageSrc?: string) => {
        setIsAnalyzing(true);
        const toastId = toast.loading("Analyzing...");
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: foodInput,
                    image: imageSrc
                })
            });

            if (!res.ok) throw new Error("Analysis failed");

            const data = await res.json();

            // Validate data structure roughly
            if (data.item_name && (data.calories !== undefined || data.protein !== undefined)) {
                setFoodAnalysis(data);
                toast.success("Analysis complete", { id: toastId });
            } else {
                throw new Error("Invalid response format");
            }

        } catch (e) {
            console.error(e);
            toast.error("Analysis failed. Please try again.", { id: toastId });
            setFoodAnalysis(null);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent, typeOverride?: string) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            // Construct payload based on active logtype
            const activeType = typeOverride || logType;
            // Capture time of log for Nutrition
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            let payload: any = { type: activeType, date: logDate };

            if (activeType === 'weigh-in') payload = { ...payload, ...weighInForm };
            else if (activeType === 'lift') payload = { ...payload, ...liftForm };
            else if (activeType === 'cardio') payload = { ...payload, ...cardioForm };
            else if (activeType === 'nutrition') {
                payload = {
                    ...payload,
                    ...foodAnalysis,
                    time: timeString,
                    item: foodAnalysis?.item_name || foodInput, // Prioritize analysis, fallback to input
                    notes: foodInput,
                    description: foodInput // Keep raw description if needed by backend, though 'item' is the sheet column
                };
            }

            await onSave(payload);

            // Reset Forms
            resetForms();

            onClose();
        } catch (e) {
            console.error(e);
            toast.error("Failed to save log.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-[#09090b] border border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900/50">
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Log Activity</h2>
                    <button onClick={handleClose} className="text-zinc-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto custom-scrollbar">
                    <LogForms
                        logType={logType}
                        setLogType={setLogType}
                        logDate={logDate} setLogDate={setLogDate}
                        lifts={lifts}
                        preferences={preferences}

                        weighInForm={weighInForm} setWeighInForm={setWeighInForm}
                        liftForm={liftForm} setLiftForm={setLiftForm}
                        cardioForm={cardioForm} setCardioForm={setCardioForm}
                        foodInput={foodInput} setFoodInput={setFoodInput}
                        foodAnalysis={foodAnalysis} setFoodAnalysis={setFoodAnalysis}

                        isAnalyzing={isAnalyzing}
                        handleAnalyzeFood={handleAnalyzeFood}
                        isSubmitting={isSubmitting}
                        handleLogSubmit={handleSubmit}

                        // Eagles peak passthrough if needed
                        onLogEaglesPeak={async (data) => {
                            await onSave({ ...data, type: 'eagles-peak' });
                            onClose();
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
