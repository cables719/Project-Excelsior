
import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

export function FeedbackBox() {
    const [isOpen, setIsOpen] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedback.trim()) return;

        setIsSending(true);
        try {
            await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feedback }),
            });
            setSent(true);
            setFeedback('');
            setTimeout(() => {
                setSent(false);
                setIsOpen(false);
            }, 2000);
        } catch (e) {
            alert('Failed to send feedback. check logs.');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-40 p-3 bg-zinc-900/80 backdrop-blur border border-zinc-800 rounded-full text-zinc-500 hover:text-purple-400 hover:border-purple-500/50 shadow-lg transition-all"
                title="Send Feedback"
            >
                <MessageSquare size={20} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-40 w-72 bg-[#09090b] border border-zinc-800 rounded-xl shadow-2xl animate-in slide-in-from-bottom-2 fade-in">
            <div className="flex justify-between items-center p-3 border-b border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Feedback / Bugs</h3>
                <button onClick={() => setIsOpen(false)} className="text-zinc-600 hover:text-white">
                    <X size={14} />
                </button>
            </div>

            {sent ? (
                <div className="p-8 flex flex-col items-center justify-center text-emerald-400 space-y-2">
                    <Send size={24} />
                    <span className="text-sm font-bold">Sent! Thank you.</span>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="p-3 space-y-3">
                    <textarea
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-sm text-white focus:border-purple-500/50 outline-none resize-none h-24 placeholder:text-zinc-600"
                        placeholder="What's broken? or What's cool?"
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="submit"
                        disabled={isSending || !feedback.trim()}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isSending ? 'Sending...' : 'Submit Feedback'}
                    </button>
                </form>
            )}
        </div>
    );
}
