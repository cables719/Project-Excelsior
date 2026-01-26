
'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Database } from 'lucide-react';

export default function OnboardingPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [sheetUrl, setSheetUrl] = useState('');
    const [sheetId, setSheetId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Extract ID from URL
    const handleUrlChange = (url: string) => {
        setSheetUrl(url);
        setError('');

        // Regex to find /d/ID/
        const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
            setSheetId(match[1]);
        } else if (url.length > 20 && !url.includes('/')) {
            // Assume they pasted the ID directly
            setSheetId(url);
        } else {
            setSheetId('');
        }
    };

    const handleFinish = async () => {
        if (!sheetId) {
            setError('Invalid Sheet URL');
            return;
        }

        setIsSaving(true);
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
            setError('Failed to connect. Please check the ID and permissions.');
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
                    {/* Step 1: Template */}
                    {step === 1 && (
                        <div className="animate-in fade-in slide-in-from-right-4">
                            <h1 className="text-3xl font-bold mb-4">Let's get set up.</h1>
                            <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                                FitSync uses your own Google Sheet to store data. We've created a template to get you started correctly.
                            </p>

                            <div className="bg-zinc-900/80 border border-zinc-700/50 rounded-xl p-6 mb-8 flex items-center justify-between group hover:border-purple-500/50 transition-colors cursor-pointer" onClick={() => window.open('https://docs.google.com/spreadsheets/d/1XyZ...PLACEHOLDER.../copy', '_blank')}>
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-green-900/20 rounded-lg text-green-500">
                                        <Database size={24} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg">Copy Template Sheet</div>
                                        <div className="text-xs text-zinc-500">Opens in Google Sheets</div>
                                    </div>
                                </div>
                                <ArrowRight size={20} className="text-zinc-600 group-hover:text-white transition-colors" />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={() => setStep(2)}
                                    className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
                                >
                                    I have my Sheet <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Connection */}
                    {step === 2 && (
                        <div className="animate-in fade-in slide-in-from-right-4">
                            <h2 className="text-2xl font-bold mb-2">Connect your data</h2>
                            <p className="text-zinc-400 mb-6">
                                Paste the URL of your new Google Sheet below.
                            </p>

                            <div className="space-y-4 mb-8">
                                <div>
                                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Google Sheet URL</label>
                                    <input
                                        value={sheetUrl}
                                        onChange={e => handleUrlChange(e.target.value)}
                                        className="w-full bg-black/50 border border-zinc-700 rounded-xl px-4 py-4 text-white font-mono text-sm focus:border-purple-500 focus:outline-none"
                                        placeholder="https://docs.google.com/spreadsheets/d/..."
                                    />
                                    {sheetId && (
                                        <div className="mt-2 flex items-center gap-2 text-emerald-500 text-xs">
                                            <Check size={12} /> Valid ID detected: <span className="font-mono text-white/50">{sheetId.substring(0, 8)}...</span>
                                        </div>
                                    )}
                                    {error && (
                                        <p className="text-rose-500 text-xs mt-2 font-bold">{error}</p>
                                    )}
                                </div>
                                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-200 leading-relaxed">
                                    <span className="font-bold block mb-1">Important:</span>
                                    Ensure you've shared the sheet with our service account:<br />
                                    <code className="bg-black/30 px-1 py-0.5 rounded mt-1 inline-block select-all">service-account@project-excelsior.iam.gserviceaccount.com</code>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <button onClick={() => setStep(1)} className="text-zinc-500 hover:text-white text-sm">Back</button>
                                <button
                                    onClick={handleFinish}
                                    disabled={!sheetId || isSaving}
                                    className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? 'Verifying...' : <>Complete Setup <Check size={18} /></>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
