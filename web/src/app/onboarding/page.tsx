
'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Database } from 'lucide-react';

export default function OnboardingPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [sheetId, setSheetId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Step 1: Welcome (Implicit)
    // Step 2: Connect Data

    const handleFinish = async () => {
        setIsSaving(true);
        // Save user mapping
        try {
            const res = await fetch('/api/user/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: session?.user?.email,
                    sheetId: sheetId
                })
            });
            if (!res.ok) throw new Error('Failed to save');
            router.push('/');
        } catch (e) {
            alert('Error saving setup');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-2xl">
                {/* Progress */}
                <div className="flex justify-between mb-8 max-w-xs mx-auto">
                    <div className={`h-1 flex-1 rounded-full mr-2 ${step >= 1 ? 'bg-purple-500' : 'bg-zinc-800'}`}></div>
                    <div className={`h-1 flex-1 rounded-full ml-2 ${step >= 2 ? 'bg-purple-500' : 'bg-zinc-800'}`}></div>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 md:p-12 relative overflow-hidden">
                    {/* Step 1: Intro */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4">
                            <h1 className="text-3xl font-bold mb-4">Welcome, {session?.user?.name?.split(' ')[0] || 'User'}.</h1>
                            <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                                Project Excelsior is your personal fitness intelligence system.
                                To begin, we need to connect to your data source.
                            </p>
                            <div className="flex justify-end">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
                                >
                                    Connect Data <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Sheet ID */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4">
                            <div className="flex items-center gap-3 mb-6 text-emerald-500">
                                <Database size={24} />
                                <span className="font-bold tracking-widest uppercase text-xs">Data Link</span>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Where is your data?</h2>
                            <p className="text-zinc-400 mb-6">
                                Paste the ID of your Google Sheet. Ensure the service account has "Editor" access.
                            </p>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Google Sheet ID</label>
                                    <input
                                        value={sheetId}
                                        onChange={e => setSheetId(e.target.value)}
                                        className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-4 text-white font-mono text-sm focus:border-purple-500 focus:outline-none"
                                        placeholder="1S3yIQOi-ngOtADfRTeYf1F1tyPw..."
                                    />
                                    <p className="text-[10px] text-zinc-600 mt-2">
                                        Found in the URL: docs.google.com/spreadsheets/d/<b>THIS_PART</b>/edit
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <button onClick={() => setStep(1)} className="text-zinc-500 hover:text-white text-sm">Back</button>
                                <button
                                    onClick={handleFinish}
                                    disabled={!sheetId || isSaving}
                                    className="flex items-center gap-2 bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-purple-500 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? 'Connecting...' : <>Initialize <Check size={18} /></>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
