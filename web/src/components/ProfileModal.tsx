import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Save, User as UserIcon } from 'lucide-react';
import { UserProfile } from '@/lib/types';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile?: UserProfile | undefined;
    // Alias profile to currentProfile to match page.tsx
    currentProfile?: UserProfile | undefined;
    onSave: (updatedProfile: UserProfile) => Promise<void>;
}

export function ProfileModal({ isOpen, onClose, profile, currentProfile, onSave }: ProfileModalProps) {
    const activeProfile = profile || currentProfile;
    const [isSaving, setIsSaving] = useState(false);

    // Buffer state for form inputs to prevent API spam on keystroke
    // We initialize with the profile data or empty object
    const [formData, setFormData] = useState<UserProfile>(activeProfile || {} as UserProfile);

    // Sync local state when profile prop updates (e.g. initial load or re-open)
    useEffect(() => {
        if (activeProfile) {
            setFormData(prev => ({ ...prev, ...activeProfile }));
        }
    }, [activeProfile]);

    // Local state for previews (base64 strings)
    const [localUserAvatar, setLocalUserAvatar] = useState<string | undefined>(activeProfile?.userAvatar ? String(activeProfile.userAvatar) : undefined);

    // Hidden file inputs
    const userFileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Resize Logic
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Target size: 256x256 (max for reasonable quality in 50k char limit)
                const MAX_SIZE = 256;
                let width = img.width;
                let height = img.height;

                // Maintain aspect ratio logic
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

                // Convert to Base64 JPEG with quality adjustment
                // 0.7 quality usually keeps it well under 40kb
                const base64 = canvas.toDataURL('image/jpeg', 0.7);

                if (base64.length > 50000) {
                    alert("Image is too complex even after resizing. Please try a simpler image.");
                    return;
                }

                setLocalUserAvatar(base64);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave({
                ...formData,
                userAvatar: localUserAvatar,
            });
            onClose();
        } catch (e) {
            console.error(e);
            alert("Failed to save profile.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <h2 className="text-xl font-bold text-white">Profile Settings</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">

                    {/* Basic Identity Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-zinc-400 block mb-1.5">Name</label>
                                <input
                                    className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Your Name"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-zinc-400 block mb-1.5">Age</label>
                                <input
                                    type="number"
                                    className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg px-3 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                    value={formData.age || ''}
                                    onChange={e => setFormData({ ...formData, age: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-zinc-400 block mb-1.5">Sex</label>
                                <div className="flex bg-zinc-800 rounded-lg p-1 border border-zinc-700 h-10 box-border">
                                    <button
                                        onClick={() => setFormData({ ...formData, sex: 'M' })}
                                        className={`flex-1 h-full text-xs font-bold rounded-md transition-all flex items-center justify-center ${formData.sex === 'M' || !formData.sex ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}
                                    >M</button>
                                    <button
                                        onClick={() => setFormData({ ...formData, sex: 'F' })}
                                        className={`flex-1 h-full text-xs font-bold rounded-md transition-all flex items-center justify-center ${formData.sex === 'F' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}
                                    >F</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-zinc-400 block mb-1.5">Height</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-6 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                            value={Math.floor(Number(formData.height || 0) / 30.48) || ''}
                                            onChange={e => {
                                                const ft = Number(e.target.value);
                                                const inches = Math.round((Number(formData.height || 0) / 2.54) % 12);
                                                const totalCm = Math.round((ft * 30.48) + (inches * 2.54));
                                                setFormData({ ...formData, height: totalCm });
                                            }}
                                            placeholder="5"
                                        />
                                        <span className="absolute right-2 top-0 bottom-0 flex items-center text-[10px] text-zinc-500 font-bold pointer-events-none">ft</span>
                                    </div>
                                    <div className="relative flex-1">
                                        <input
                                            type="number"
                                            className="w-full h-10 bg-zinc-800 border border-zinc-700 rounded-lg pl-3 pr-6 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                            value={Math.round((Number(formData.height || 0) / 2.54) % 12) || ''}
                                            onChange={e => {
                                                const inches = Number(e.target.value);
                                                const ft = Math.floor(Number(formData.height || 0) / 30.48);
                                                const totalCm = Math.round((ft * 30.48) + (inches * 2.54));
                                                setFormData({ ...formData, height: totalCm });
                                            }}
                                            placeholder="10"
                                        />
                                        <span className="absolute right-2 top-0 bottom-0 flex items-center text-[10px] text-zinc-500 font-bold pointer-events-none">in</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr className="border-zinc-800" />

                    {/* User Avatar Section */}
                    <div className="space-y-4">
                        <label className="text-sm font-medium text-zinc-400 block">Your Avatar</label>
                        <div className="flex items-center gap-4">
                            <div className={`w-20 h-20 rounded-full overflow-hidden border-2 flex-shrink-0 ${localUserAvatar ? 'border-emerald-500' : 'border-zinc-700'} relative bg-zinc-800`}>
                                {localUserAvatar ? (
                                    <img src={localUserAvatar} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                        <UserIcon size={24} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <input
                                    type="file"
                                    ref={userFileRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                <button
                                    onClick={() => userFileRef.current?.click()}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <Upload size={16} />
                                    Upload Image
                                </button>
                                <p className="text-xs text-zinc-500 mt-2">Max 256x256 (Auto-resized), Stored in Sheets</p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {isSaving ? 'Saving...' : (
                            <>
                                <Save size={16} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
