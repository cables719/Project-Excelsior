
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Activity, User, Sparkles, Paperclip, X, Settings } from 'lucide-react';
import { Message } from '@/lib/types';
import { AvatarImg } from './ui/AvatarImg';

interface ChatInterfaceProps {
    messages: Message[];
    input: string;
    setInput: (v: string) => void;
    isLoading: boolean;
    handleChatSubmit: (e: React.FormEvent) => void;
    // Alias bottomRef to messagesEndRef to match page.tsx
    messagesEndRef?: React.RefObject<HTMLDivElement | null>;
    bottomRef?: React.RefObject<HTMLDivElement | null>;

    // Coach & User Props
    coachMode?: 'clara' | 'cole' | 'atlas' | 'ember';
    userAvatar?: string;
    coachAvatar?: string;
    coachName?: string;

    // New Image Props
    selectedImage?: string | null;
    setSelectedImage?: (img: string | null) => void;
    onImageSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onPaste?: (e: React.ClipboardEvent) => void;

    onOpenSettings?: () => void;
    onOpenProfile?: () => void;

    // New optional prop for embedding inside other components like ActiveWorkout
    isEmbedded?: boolean;

    // History Props
    onLoadHistory?: () => void;
    hasMoreHistory?: boolean;
    isLoadingHistory?: boolean;
}

const AVATAR_MAP = {
    clara: '/avatars/clara.png',
    cole: '/avatars/cole.png',
    atlas: '/avatars/atlas.png',
    ember: '/avatars/ember.png'
};

export function ChatInterface({
    messages, input, setInput, isLoading, handleChatSubmit, bottomRef, messagesEndRef, coachMode = 'clara',
    userAvatar, coachAvatar, coachName,
    selectedImage, setSelectedImage, onImageSelect, onPaste,
    onOpenSettings, onOpenProfile, isEmbedded = false,
    onLoadHistory, hasMoreHistory = false, isLoadingHistory = false
}: ChatInterfaceProps) {
    // Use messagesEndRef if provided, distinct from bottomRef for backward compat
    const internalRef = React.useRef<HTMLDivElement>(null);
    const ref = bottomRef || messagesEndRef || internalRef;
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isEmbedded && ref && 'current' in ref && ref.current) {
            ref.current.scrollIntoView({ behavior: 'auto' });
        }
    }, [messages, isEmbedded, ref]);
    return (
        <div className={`flex flex-col relative w-full h-full min-h-0 ${isEmbedded ? '' : 'flex-1 md:min-w-[500px]'}`}>
            {/* Header - Hidden if embedded */}
            {!isEmbedded && (
                <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-[#050505] via-[#050505]/80 to-transparent z-10 flex items-start justify-between px-8 pt-8 pointer-events-none">
                    <div className="pointer-events-auto">
                        <h1 className="text-2xl font-black tracking-tighter text-white/90">
                            PROJECT <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-cyan-500">EXCELSIOR</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-6 pointer-events-auto">
                        <div className="flex gap-4">
                            <button
                                onClick={onOpenProfile}
                                className="text-zinc-500 hover:text-white transition-colors"
                                title="Profile"
                            >
                                <User size={20} strokeWidth={1.5} />
                            </button>
                            <button
                                onClick={onOpenSettings}
                                className="text-zinc-500 hover:text-white transition-colors"
                                title="Settings"
                            >
                                <Settings size={20} strokeWidth={1.5} />
                            </button>
                        </div>
                        {/* Version Badge */}
                        <div className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-black/40 text-[9px] font-bold text-zinc-500 tracking-wider">
                            V2.3 • GEMINI 2.5
                        </div>
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar ${isEmbedded ? 'p-4' : 'pt-24 pb-24 md:pb-8 px-4 md:px-8'} scroll-smooth flex flex-col`}>
                <div className="max-w-4xl mx-auto space-y-10 w-full flex-1 flex flex-col">
                    {messages.length === 0 && !isLoading && !isEmbedded && !hasMoreHistory && (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-30 space-y-4 animate-pulse">
                            <img src="/logo.png" alt="Logo" className="w-48 h-48 md:w-80 md:h-80 opacity-100" />
                            <p className="font-light tracking-wide text-lg">SYSTEM READY</p>
                        </div>
                    )}

                    {/* History Loader */}
                    {hasMoreHistory && (
                        <div className="flex justify-center py-4">
                            <button
                                onClick={onLoadHistory}
                                disabled={isLoadingHistory}
                                className="px-6 py-2 rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoadingHistory ? (
                                    <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent animate-spin rounded-full" />
                                ) : (
                                    <Activity size={14} className="text-emerald-500" />
                                )}
                                {messages.length === 0 ? "Display previous conversation" : "Load older messages"}
                            </button>
                        </div>
                    )}
                    {messages
                        .filter(m => !m.content.startsWith('SYSTEM_EVENT:'))
                        .map(m => (
                        <div key={m.id} className={`flex gap-6 items-start ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Avatar */}
                            <div className="flex-shrink-0 mt-2">
                                {m.role === 'assistant'
                                    ? <AvatarImg key={'coach-' + coachAvatar} src={coachAvatar || AVATAR_MAP[coachMode] || AVATAR_MAP['clara']} fallbackIcon={Sparkles} ringColor="ring-purple-500/50" scaleClass={coachAvatar ? "" : "scale-150"} />
                                    : <AvatarImg key={'user-' + userAvatar} src={userAvatar || ""} fallbackIcon={User} ringColor="ring-emerald-500/50" />
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
                                                p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                                            }}
                                        >
                                            {m.content}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="whitespace-pre-wrap">
                                        {m.images && m.images.map((img, idx) => (
                                            <img key={idx} src={img} alt="User Upload" className="max-w-xs rounded mb-2 border border-zinc-700" />
                                        ))}
                                        {m.content}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex gap-6">
                            <div className="flex-shrink-0 mt-2">
                                <AvatarImg src={AVATAR_MAP[coachMode] || AVATAR_MAP['clara']} fallbackIcon={Sparkles} ringColor="ring-purple-500/50" scaleClass="scale-150" />
                            </div>
                            <div className="flex items-center gap-1.5 px-6 py-4">
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-bounce"></div>
                            </div>
                        </div>
                    )}
                    <div ref={ref} />
                </div>
            </div>

            {/* Input Area */}
            <div className={`${isEmbedded ? 'p-4 pb-[max(1rem,env(safe-area-inset-bottom))]' : 'px-4 md:px-8 pt-4 pb-24 md:pb-10 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent'}`}>
                <div className="max-w-4xl mx-auto">
                    {selectedImage && (
                        <div className="mb-2 relative inline-block">
                            <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded border border-zinc-700 object-cover" />
                            <button
                                onClick={() => setSelectedImage?.(null)}
                                className="absolute -top-2 -right-2 bg-zinc-800 rounded-full p-0.5 border border-zinc-600 hover:bg-zinc-700 text-white"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleChatSubmit} className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-900 to-purple-900 rounded-2xl opacity-20 group-hover:opacity-30 transition duration-500 blur-sm"></div>
                        <div className="relative w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl flex items-end">
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="pl-4 pb-4 text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                                <Paperclip size={20} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={onImageSelect}
                            />
                            <textarea
                                className="w-full bg-transparent px-4 py-5 pr-16 text-lg focus:outline-none placeholder:text-zinc-600 text-white resize-none overflow-hidden max-h-48"
                                value={input}
                                onChange={(e) => {
                                    setInput(e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.value ? `${e.target.scrollHeight}px` : 'auto';
                                }}
                                onPaste={onPaste}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleChatSubmit(e);
                                    }
                                }}
                                rows={1}
                                placeholder={coachName ? `Ask ${coachName}...` : `Ask ${coachMode.charAt(0).toUpperCase() + coachMode.slice(1)}...`}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="absolute right-3 bottom-3 aspect-square bg-zinc-800 text-white rounded-lg flex items-center justify-center hover:bg-zinc-700 disabled:opacity-0 transition-all h-[44px] w-[44px]"
                            >
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg">
                                    <Send size={20} />
                                </div>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
