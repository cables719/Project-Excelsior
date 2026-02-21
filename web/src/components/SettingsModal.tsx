
import React, { useState, useEffect } from 'react';
import { UserProfile } from '@/lib/types';
import { X, Save, Calculator } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    currentProfile: any;
    onSave: () => void;
    hasHistory?: boolean;
}

export function SettingsModal({ isOpen, onClose, currentProfile, onSave, hasHistory = false }: SettingsModalProps) {
    const [formData, setFormData] = useState<UserProfile>({});
    const [showEaglesPeak, setShowEaglesPeak] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'prefs' | 'coach'>('profile');

    // Load initial data
    useEffect(() => {
        if (isOpen && currentProfile) {
            setFormData({
                ...currentProfile,
                coachAttributes: currentProfile.coachAttributes || { warmth: 0.5, intensity: 0.5, verbosity: 0.5 }
            });
            // Load Local Prefs
            setShowEaglesPeak(localStorage.getItem('show_eagles_peak') === 'true');

            // Check for admin/superuser or existing profile preference
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('admin') === 'true') {
                localStorage.setItem('is_admin', 'true');
                setIsAdmin(true);
            } else {
                // Also allow if profile has it enabled already OR if they have history
                const hasProfilePref = currentProfile?.preferences?.showEaglesPeak === true;
                setIsAdmin(localStorage.getItem('is_admin') === 'true' || hasProfilePref || hasHistory);
            }
        }
    }, [isOpen, currentProfile, hasHistory]);

    if (!isOpen) return null;

    const handleChange = (field: keyof UserProfile, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Merge separate state into formData for persistence
            const finalData = {
                ...formData,
                preferences: {
                    ...formData.preferences,
                    showEaglesPeak: showEaglesPeak
                }
            };

            await fetch('/api/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalData),
            });
            // Save Local Overrides
            localStorage.setItem('show_eagles_peak', String(showEaglesPeak));

            onSave(); // Trigger refresh in parent
            onClose();
        } catch (e) {
            alert('Failed to save profile');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Dynamic Calculations ---
    // Mifflin-St Jeor Equation
    const calculateStats = () => {
        // If BMR Override is set, use it directly (don't recalc from weight)
        if (formData.bmrOverride && formData.bmrOverride > 0) {
            const bmr = formData.bmrOverride;
            const activityMult = Number(formData.activityLevel || 1.2);
            const tdee = bmr * activityMult;
            return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
        }

        const currentWeight = Number(formData['currentWeight'] || formData.goalWeight || 160);
        const wKg = currentWeight * 0.453592;
        const hCm = Number(formData.height || 175);
        const age = Number(formData.age || 30);
        const s = 5; // Male offset (+5), Female (-161)
        const sexOffset = formData.sex === 'F' ? -161 : 5;

        const bmr = (10 * wKg) + (6.25 * hCm) - (5 * age) + sexOffset;

        const activityMult = Number(formData.activityLevel || 1.2);
        const tdee = bmr * activityMult;

        return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
    };

    const stats = calculateStats();

    // --- Render Helpers ---
    const Slider = ({ label, value, onChange, minLabel, maxLabel }: { label: string, value: number, onChange: (v: number) => void, minLabel: string, maxLabel: string }) => (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                <span>{label}</span>
                <span className="text-zinc-500">{value < 0.4 ? minLabel : value > 0.6 ? maxLabel : 'Default'}</span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.5"
                value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
        </div>
    );

    const PERSONAS = [
        { id: 'clara', name: 'Clara', desc: 'Warm, fun, supportive.', img: '/avatars/clara.png' },
        { id: 'atlas', name: 'Atlas', desc: 'Stoic, disciplined, steady.', img: '/avatars/atlas.png' },
        { id: 'cole', name: 'Cole', desc: 'Cocky, intense, demanding.', img: '/avatars/cole.png' },
        { id: 'ember', name: 'Ember', desc: 'Calm, reassuring, safe.', img: '/avatars/ember.png' },
    ];

    // --- Helper: Client-Side Resizer ---
    const handleResizeAndUpload = (file: File, fieldName: keyof UserProfile) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_SIZE = 256;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                const base64 = canvas.toDataURL('image/jpeg', 0.7);

                if (base64.length > 50000) {
                    alert("Image is too complex. Please try a simpler image.");
                    return;
                }
                handleChange(fieldName, base64);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#09090b] border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header with Tabs */}
                <div className="flex flex-col border-b border-zinc-800">
                    <div className="flex justify-between items-center p-6 pb-2">
                        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                            <Calculator size={18} className="text-purple-500" />
                            Settings
                        </h2>
                        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="flex px-6 gap-6">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'profile' ? 'text-white border-purple-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
                        >
                            Goals
                        </button>
                        <button
                            onClick={() => setActiveTab('prefs')}
                            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'prefs' ? 'text-white border-purple-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
                        >
                            Layout
                        </button>
                        <button
                            onClick={() => setActiveTab('coach')}
                            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${activeTab === 'coach' ? 'text-white border-purple-500' : 'text-zinc-600 border-transparent hover:text-zinc-400'}`}
                        >
                            Coach Lab
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                    {activeTab === 'profile' ? (
                        <>
                            {/* Goals Section */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Stats & Targets</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Left Column: Base Stats */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] text-zinc-400 mb-1">Base Weight (lbs)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none"
                                                value={formData.currentWeight || ''}
                                                onChange={e => handleChange('currentWeight', Number(e.target.value))}
                                                placeholder="For BMR"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-zinc-400 mb-1">Base Body Fat %</label>
                                            <input
                                                type="number"
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none"
                                                value={formData.currentBodyFat || ''}
                                                onChange={e => handleChange('currentBodyFat', Number(e.target.value))}
                                                placeholder="Est."
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Goals */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] text-zinc-400 mb-1">Goal Weight (lbs)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none"
                                                value={formData.goalWeight || ''}
                                                onChange={e => handleChange('goalWeight', Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-zinc-400 mb-1">Goal Body Fat %</label>
                                            <input
                                                type="number"
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none"
                                                value={formData.goalBodyFat || ''}
                                                onChange={e => handleChange('goalBodyFat', Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                    {/* Full Width: Custom Goals */}
                                    <div className="col-span-2 pt-2">
                                        <label className="block text-[10px] text-zinc-400 mb-1 uppercase tracking-wider font-bold">Specific Goals</label>
                                        <textarea
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none min-h-[80px]"
                                            value={formData.otherGoals || ''}
                                            onChange={e => handleChange('otherGoals', e.target.value)}
                                            placeholder="e.g. 'I want to bench 225lbs', 'Run a 5k under 25 min', 'Lift 4x a week'..."
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* Activity & Metabolism */}
                            <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Metabolism Engine</h3>

                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-[10px] text-zinc-400 mb-1">Activity Level</label>
                                        <select
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500/50 outline-none appearance-none"
                                            value={formData.activityLevel || 1.2}
                                            onChange={e => handleChange('activityLevel', Number(e.target.value))}
                                        >
                                            <option value={1.2}>Sedentary (Desk Job)</option>
                                            <option value={1.375}>Lightly Active (1-3 days)</option>
                                            <option value={1.55}>Moderately Active (3-5 days)</option>
                                            <option value={1.725}>Very Active (6-7 days)</option>
                                            <option value={1.9}>Extra Active (Physical Job)</option>
                                        </select>
                                    </div>

                                    {/* BMR / TDEE Display */}
                                    <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800/50 grid grid-cols-2 gap-4">
                                        <div className="text-center">
                                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">BMR</div>
                                            <div className="text-xl font-bold text-zinc-300">{stats.bmr}</div>
                                            <div className="text-[9px] text-zinc-600">Coma Calories</div>
                                        </div>
                                        <div className="text-center relative">
                                            <div className="text-[10px] text-blue-500 uppercase tracking-widest font-bold">TDEE</div>
                                            <div className="text-xl font-bold text-white">{stats.tdee}</div>
                                            <div className="text-[9px] text-zinc-500">Maintenance</div>
                                        </div>
                                    </div>

                                    {/* Overrides */}
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <label className="block text-[10px] text-zinc-500 mb-1">BMR Override</label>
                                            <input
                                                type="number"
                                                className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:border-zinc-700 outline-none"
                                                value={formData.bmrOverride || ''}
                                                onChange={e => handleChange('bmrOverride', Number(e.target.value))}
                                                placeholder={`Auto: ${stats.bmr}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-zinc-500 mb-1">Protein Target (g)</label>
                                            <input
                                                type="number"
                                                className="w-full bg-black/40 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:border-zinc-700 outline-none"
                                                value={formData.proteinOverride || ''}
                                                onChange={e => handleChange('proteinOverride', Number(e.target.value))}
                                                placeholder="180"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : activeTab === 'prefs' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Dashboard Modules</h3>
                                <p className="text-xs text-zinc-400">Toggle modules to simplify your view.</p>

                                <div className="space-y-3">
                                    {/* Hide Body Fat */}
                                    <label className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                                        <span className="text-sm font-bold text-white">Hide Body Fat %</span>
                                        <input
                                            type="checkbox"
                                            checked={formData.preferences?.hideBodyFat || false}
                                            onChange={e => setFormData(prev => ({
                                                ...prev,
                                                preferences: { ...prev.preferences, hideBodyFat: e.target.checked }
                                            }))}
                                            className="accent-purple-500 w-4 h-4"
                                        />
                                    </label>

                                    {/* Hide Lifts */}
                                    <label className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                                        <span className="text-sm font-bold text-white">Hide Lifting</span>
                                        <input
                                            type="checkbox"
                                            checked={formData.preferences?.hideLifts || false}
                                            onChange={e => setFormData(prev => ({
                                                ...prev,
                                                preferences: { ...prev.preferences, hideLifts: e.target.checked }
                                            }))}
                                            className="accent-purple-500 w-4 h-4"
                                        />
                                    </label>

                                    {/* Hide Cardio */}
                                    <label className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                                        <span className="text-sm font-bold text-white">Hide Cardio</span>
                                        <input
                                            type="checkbox"
                                            checked={formData.preferences?.hideCardio || false}
                                            onChange={e => setFormData(prev => ({
                                                ...prev,
                                                preferences: { ...prev.preferences, hideCardio: e.target.checked }
                                            }))}
                                            className="accent-purple-500 w-4 h-4"
                                        />
                                    </label>

                                    {/* Hide Nutrition */}
                                    <label className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                                        <span className="text-sm font-bold text-white">Hide Nutrition</span>
                                        <input
                                            type="checkbox"
                                            checked={formData.preferences?.hideNutrition || false}
                                            onChange={e => setFormData(prev => ({
                                                ...prev,
                                                preferences: { ...prev.preferences, hideNutrition: e.target.checked }
                                            }))}
                                            className="accent-purple-500 w-4 h-4"
                                        />
                                    </label>

                                    {/* Enable Wellness */}
                                    <label className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                                        <span className="text-sm font-bold text-white">Enable Wellness & Hydration</span>
                                        <input
                                            type="checkbox"
                                            checked={formData.preferences?.showWellness || false}
                                            onChange={e => setFormData(prev => ({
                                                ...prev,
                                                preferences: { ...prev.preferences, showWellness: e.target.checked }
                                            }))}
                                            className="accent-purple-500 w-4 h-4"
                                        />
                                    </label>

                                    {/* Enable Eagles Peak (Local Only) - Hidden unless admin or already enabled */}
                                    {(isAdmin || showEaglesPeak) && (
                                        <label className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-amber-500">Enable Eagles Peak 🏔️</span>
                                                <span className="text-[9px] text-zinc-500">Visible only on this device</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={showEaglesPeak}
                                                onChange={e => setShowEaglesPeak(e.target.checked)}
                                                className="accent-amber-500 w-4 h-4"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                            {/* Coach Selection */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Select Your Guide</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {PERSONAS.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => handleChange('coachMode', p.id)}
                                            className={`relative group p-1.5 rounded-xl border text-left transition-all ${formData.coachMode === p.id
                                                ? 'bg-zinc-800 border-purple-500 shadow-lg shadow-purple-900/20'
                                                : 'bg-black/20 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <img src={p.img} alt={p.name} className="w-12 h-12 rounded-lg object-cover bg-zinc-900" />
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-white truncate">{p.name}</div>
                                                    <div className="text-[9px] text-zinc-500 leading-tight line-clamp-2">{p.desc}</div>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tuning Sliders */}
                            <div className="space-y-6 pt-2">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Personality Tuning</h3>
                                <div className="space-y-5 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
                                    <Slider
                                        label="Warmth"
                                        minLabel="Clinical"
                                        maxLabel="Affectionate"
                                        value={formData.coachAttributes?.warmth ?? 0.5}
                                        onChange={v => setFormData(prev => ({ ...prev, coachAttributes: { ...prev.coachAttributes, warmth: v } as any }))}
                                    />
                                    <Slider
                                        label="Intensity"
                                        minLabel="Gentle"
                                        maxLabel="Hardcore"
                                        value={formData.coachAttributes?.intensity ?? 0.5}
                                        onChange={v => setFormData(prev => ({ ...prev, coachAttributes: { ...prev.coachAttributes, intensity: v } as any }))}
                                    />
                                    <Slider
                                        label="Verbosity"
                                        minLabel="Concise"
                                        maxLabel="Verbose"
                                        value={formData.coachAttributes?.verbosity ?? 0.5}
                                        onChange={v => setFormData(prev => ({ ...prev, coachAttributes: { ...prev.coachAttributes, verbosity: v } as any }))}
                                    />
                                </div>
                            </div>

                            {/* Advanced Coach Customization */}
                            <div className="space-y-4 pt-2 border-t border-zinc-800/50">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Advanced Overrides</h3>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] text-zinc-400 mb-1">Custom Name</label>
                                            <input
                                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500/50 outline-none"
                                                value={formData.customCoachName || ''}
                                                onChange={e => handleChange('customCoachName', e.target.value)}
                                                placeholder="(Optional)"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-zinc-400 mb-1">Custom Avatar</label>
                                            <div className="flex gap-2 items-center flex-1">
                                                {formData.customCoachAvatar && (
                                                    <img src={formData.customCoachAvatar} alt="Coach" className="w-8 h-8 rounded-full bg-zinc-800 object-cover" />
                                                )}
                                                <label className="flex-1 cursor-pointer">
                                                    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors flex items-center justify-center gap-2">
                                                        Upload
                                                    </div>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleResizeAndUpload(file, 'customCoachAvatar');
                                                        }}
                                                    />
                                                </label>
                                                {formData.customCoachAvatar && (
                                                    <button
                                                        onClick={() => handleChange('customCoachAvatar', '')}
                                                        className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-red-400 hover:border-red-900/50 transition-colors"
                                                        title="clear"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                </div>

                                {(formData.customCoachName || formData.customCoachAvatar) && (
                                    <div className="pt-2">
                                        <button
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                customCoachName: '',
                                                customCoachAvatar: '',
                                            }))}
                                            className="w-full text-xs text-zinc-500 hover:text-red-400 border border-zinc-800 hover:border-red-900/30 rounded-lg py-2 transition-colors"
                                        >
                                            Reset Custom Coach
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>


                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-800 bg-zinc-900/30 rounded-b-2xl">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors"
                    >
                        {isSaving ? <span className="animate-pulse">Saving Profile...</span> : <><Save size={18} /> Save Changes</>}
                    </button>
                </div>

            </div>
        </div >
    );
}
