
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Activity, User, Sparkles } from 'lucide-react';
import { Message } from '@/lib/types';
import { AvatarImg } from './ui/AvatarImg';

interface ChatInterfaceProps {
    messages: Message[];
    input: string;
    setInput: (v: string) => void;
    isLoading: boolean;
    handleChatSubmit: (e: React.FormEvent) => void;
    bottomRef: React.RefObject<HTMLDivElement | null>;
    coachMode?: 'clara' | 'cole' | 'atlas' | 'ember';
}

const AVATAR_MAP = {
    clara: '/avatars/clara.png',
    cole: '/avatars/cole.png',
    atlas: '/avatars/atlas.png',
    ember: '/avatars/ember.png'
};

export function ChatInterface({
    messages, input, setInput, isLoading, handleChatSubmit, bottomRef, coachMode = 'clara'
}: ChatInterfaceProps) {
    return (
        <div className="flex-1 flex flex-col relative min-w-[500px] min-h-0">
            {/* Header Removed - managed by parent */}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto pt-24 pb-8 px-8 scroll-smooth">
                <div className="max-w-4xl mx-auto space-y-10">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center opacity-30 mt-32 space-y-4 animate-pulse">
                            <Activity size={64} className="text-white" strokeWidth={1} />
                            <p className="font-light tracking-wide text-lg">SYSTEM READY</p>
                        </div>
                    )}
                    {messages.map(m => (
                        <div key={m.id} className={`flex gap-6 items-start ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className="flex-shrink-0 mt-2">
                                {m.role === 'assistant'
                                    ? <AvatarImg src={AVATAR_MAP[coachMode] || AVATAR_MAP['clara']} fallbackIcon={Sparkles} ringColor="ring-purple-500/50" scaleClass="scale-125" />
                                    : <AvatarImg src="/user.png" fallbackIcon={User} ringColor="ring-emerald-500/50" />
                                }
                            </div>
                            {/* Bubble */}
                            <div className={`max-w-[85%] px-6 text-[16px] leading-tight ${m.role === 'user'
                                ? 'py-2 bg-zinc-800/80 backdrop-blur-sm text-zinc-100/90 rounded-2xl rounded-tr-sm shadow-sm'
                                : 'py-2 bg-zinc-900/40 text-zinc-300 rounded-2xl rounded-tl-sm'
                                }`}>
                                {m.role === 'assistant' ? (
                                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-4 prose-headings:my-3 prose-ul:my-4 prose-li:my-2">
                                        <ReactMarkdown
                                            components={{
                                                ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
                                                h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-white mb-2" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-white mb-2" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-base font-bold text-white mb-1" {...props} />,
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap">{m.content}</div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-6">
                            <div className="flex-shrink-0 mt-2">
                                <AvatarImg src={AVATAR_MAP[coachMode] || AVATAR_MAP['clara']} fallbackIcon={Sparkles} ringColor="ring-purple-500/50" scaleClass="scale-125" />
                            </div>
                            <div className="flex items-center gap-1.5 px-6 py-4">
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="p-8 pb-10 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
                <div className="max-w-4xl mx-auto">
                    <form onSubmit={handleChatSubmit} className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl opacity-20 group-hover:opacity-30 transition duration-500 blur-sm"></div>
                        <input
                            className="relative w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl px-6 py-5 pr-16 text-lg focus:outline-none focus:bg-[#0f0f0f] transition-all placeholder:text-zinc-600 text-white"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Ask ${coachMode.charAt(0).toUpperCase() + coachMode.slice(1)}...`}
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="absolute right-3 top-3 bottom-3 aspect-square bg-zinc-800 text-white rounded-lg flex items-center justify-center hover:bg-zinc-700 disabled:opacity-0 transition-all"
                        >
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg">
                                <Send size={20} />
                            </div>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
