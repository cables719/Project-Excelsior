'use client';

import React, { useState, useRef, useEffect } from 'react';
import { DataContext, Message } from '@/lib/types';
import { ChatInterface } from '@/components/ChatInterface';
import { Dashboard } from '@/components/Dashboard';
import { SettingsModal } from '@/components/SettingsModal';
import { Settings } from 'lucide-react';

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dataContext, setDataContext] = useState<DataContext | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // UI State - Forms
  const [logType, setLogType] = useState<'weigh-in' | 'lift' | 'cardio' | 'nutrition'>('weigh-in');
  const [weighInForm, setWeighInForm] = useState({ weight: '', bodyFat: '', notes: '' });
  const [liftForm, setLiftForm] = useState({ exercise: '', sets: '', reps: '', weight: '', notes: '' });
  const [cardioForm, setCardioForm] = useState({ activity: '', duration: '', distance: '', heartRate: '', notes: '' });

  // Nutrition State
  const [foodInput, setFoodInput] = useState('');
  const [foodAnalysis, setFoodAnalysis] = useState<{ calories: number, protein: number, item_name: string, reasoning?: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  // --- Data Fetching ---
  const refreshData = () => {
    fetch('/api/data')
      .then(async res => {
        if (res.status === 428) {
          window.location.href = '/onboarding';
          return null;
        }
        if (res.status === 401) {
          window.location.href = '/login';
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (data) setDataContext(data);
      })
      .catch(console.error);
  };

  useEffect(() => {
    refreshData();
  }, []);

  // --- Derived Stats (7 Day Avg) ---
  const currentWeight = dataContext?.weighIns[dataContext.weighIns.length - 1]?.weight || '--';
  const currentBF = dataContext?.weighIns[dataContext.weighIns.length - 1]?.bodyFat || '--';

  const get7DayAvg = (field: 'weight' | 'bodyFat') => {
    if (!dataContext?.weighIns) return 0;
    const recent = dataContext.weighIns.slice(-7);
    const sum = recent.reduce((acc, curr) => acc + (parseFloat(curr[field]) || 0), 0);
    return recent.length ? sum / recent.length : 0;
  };

  const avgWeight = get7DayAvg('weight');
  const avgBF = get7DayAvg('bodyFat');

  // --- Dynamic Metabolism Engine ---
  const profile = dataContext?.userProfile;
  const metrics = (() => {
    // 1. Get Base BMR
    let bmr = 1850; // Default fallback

    if (profile?.bmrOverride) {
      bmr = Number(profile.bmrOverride);
    } else if (profile?.height && profile?.age && profile?.sex && (profile?.currentWeight || profile?.goalWeight)) {
      // Mifflin-St Jeor
      const w = Number(profile.currentWeight || profile.goalWeight) * 0.453592;
      const h = Number(profile.height);
      const a = Number(profile.age);
      const s = profile.sex === 'F' ? -161 : 5;
      bmr = (10 * w) + (6.25 * h) - (5 * a) + s;
    }

    // 2. Activity Multiplier
    const mult = Number(profile?.activityLevel || 1.2);

    // 3. TDEE
    const tdee = bmr * mult;

    return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
  })();

  const dailyBudget = metrics.tdee;
  const proteinTarget = profile?.proteinOverride || Math.round((Number(profile?.goalWeight || profile?.currentWeight || 150)) * 1.0); // Default 1g/lb

  // --- Net Calories Logic ---
  const today = new Date();

  // Helper: check if date string matches local "today"
  const isToday = (dateString: string) => {
    if (!dateString) return false;
    const todayStr = today.toLocaleDateString('en-US'); // e.g. "1/23/2026"
    if (dateString === todayStr) return true;

    // specialized handling for ISO-like "YYYY-MM-DD" often in sheets
    if (dateString.includes('-')) {
      const parts = dateString.split('-').map(Number);
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return d === today.getDate() && (m - 1) === today.getMonth() && y === today.getFullYear();
      }
    }

    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  const dailyNutrition = dataContext?.nutrition.filter(n => isToday(n.date)) || [];
  const dailyCardio = dataContext?.cardio.filter(c => isToday(c.date)) || [];
  const dailyLifts = dataContext?.lifts.filter(l => isToday(l.date)) || [];

  const caloriesIn = dailyNutrition.reduce((acc, n) => acc + (parseInt(n.calories) || 0), 0);
  const proteinIn = dailyNutrition.reduce((acc, n) => acc + (parseInt(n.protein) || 0), 0);

  const cardioBurn = dailyCardio.reduce((acc, c) => {
    const dur = parseInt(c.duration) || 0;
    const activityLower = c.activity.toLowerCase();
    const isIntense = /run|hike|stair|upland/i.test(activityLower);
    return acc + (dur * (isIntense ? 12 : 6));
  }, 0);

  const liftBurn = dailyLifts.length > 0 ? 250 : 0; // Flat estimate for lifting
  const activityBurn = cardioBurn + liftBurn;

  // Net Calories = TDEE - Food
  // We DO NOT add activityBurn here because the user's "Activity Level" (TDEE modifier) 
  // already accounts for their exercise regimen. Adding it again would be double counting.
  const netCalories = dailyBudget - caloriesIn;

  // --- Graph Data Prep ---
  const graphData = dataContext?.weighIns.map((w, index, arr) => {
    const start = Math.max(0, index - 6);
    const windowSlice = arr.slice(start, index + 1);
    const wSum = windowSlice.reduce((a, c) => a + (parseFloat(c.weight) || 0), 0);
    const wAvg = wSum / windowSlice.length;
    const bfSum = windowSlice.reduce((a, c) => a + (parseFloat(c.bodyFat) || 0), 0);
    const bfAvg = bfSum / windowSlice.length;
    const shortDate = w.date.includes('/') ? w.date.split('/').slice(0, 2).join('/') : w.date;

    return {
      date: shortDate,
      weight: parseFloat(w.weight),
      weightAvg: wAvg,
      bodyFat: parseFloat(w.bodyFat),
      bodyFatAvg: bfAvg
    };
  }) || [];

  // --- Recent Activity Sort & Filter ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recentActivity: any[] = dataContext ? [
    ...dataContext.weighIns.map(i => ({ ...i, type: 'weigh-in' })),
    ...dataContext.lifts.map(i => ({ ...i, type: 'lift' })),
    ...dataContext.cardio.map(i => ({ ...i, type: 'cardio' })),
    ...dataContext.nutrition.map(i => ({ ...i, type: 'nutrition' }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

  const filteredActivity = recentActivity.filter(item => item.type === logType).slice(0, 50);

  // --- Chat Handlers ---
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          clientDate: new Date().toISOString()
        }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const assistantId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamedContent = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          streamedContent += chunk;
          setMessages(prev => prev.map(m =>
            m.id === assistantId ? { ...m, content: streamedContent } : m
          ));
        }
      }

      if (!streamedContent) {
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: '[No response received from server]' } : m
        ));
      }
    } catch (error) {
      console.error('Chat Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.content) {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: `[Error: ${errorMessage}]` } : m);
        } else {
          return [...prev, { id: Date.now().toString(), role: 'assistant', content: `[Error: ${errorMessage}]` }];
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Log / Analyze Handlers ---
  const handleAnalyzeFood = async () => {
    if (!foodInput.trim()) return;
    setIsAnalyzing(true);
    setFoodAnalysis(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ text: foodInput }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFoodAnalysis(data);
    } catch (e) {
      alert('Analysis failed. Try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const today = new Date().toLocaleDateString('en-US');
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    let payload;
    if (logType === 'weigh-in') payload = { type: 'weigh-in', data: { date: today, ...weighInForm } };
    else if (logType === 'lift') payload = { type: 'lift', data: { date: today, ...liftForm } };
    else if (logType === 'cardio') payload = { type: 'cardio', data: { date: today, ...cardioForm } };
    else if (logType === 'nutrition' && foodAnalysis) {
      payload = {
        type: 'nutrition',
        data: {
          date: today,
          time,
          item: foodAnalysis.item_name,
          calories: foodAnalysis.calories.toString(),
          protein: foodAnalysis.protein.toString(),
          notes: `${foodInput}`
        }
      };
    }

    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to log data');

      setWeighInForm({ weight: '', bodyFat: '', notes: '' });
      setLiftForm({ exercise: '', sets: '', reps: '', weight: '', notes: '' });
      setCardioForm({ activity: '', duration: '', distance: '', heartRate: '', notes: '' });
      setFoodInput('');
      setFoodAnalysis(null);

      refreshData();
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-purple-900 selection:text-white">

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentProfile={dataContext?.userProfile}
        onSave={refreshData}
      />

      {/* LEFT COLUMN: Chat Interface */}
      <div className="flex-1 flex flex-col relative min-w-[500px] min-h-0">
        {/* Modern Blur Header with Settings Button */}
        <div className="absolute top-0 w-full p-6 flex justify-between items-center z-10 bg-gradient-to-b from-[#050505] via-[#050505]/80 to-transparent backdrop-blur-[2px]">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]"></div>
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white/90">PROJECT: EXCELSIOR</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <Settings size={18} />
            </button>
            <div className="text-[10px] font-mono text-zinc-600 bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800/50">
              V2.2 • GEMINI 2.5
            </div>
          </div>
        </div>

        <ChatInterface
          messages={messages}
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          handleChatSubmit={handleChatSubmit}
          bottomRef={bottomRef}
          coachMode={profile?.coachMode}
          userAvatar={profile?.userAvatar}
          coachAvatar={profile?.customCoachAvatar}
        />
      </div>

      {/* RIGHT COLUMN: Dashboard */}
      <Dashboard
        currentWeight={currentWeight}
        currentBF={currentBF}
        avgWeight={avgWeight}
        avgBF={avgBF}
        graphData={graphData}

        logType={logType} setLogType={setLogType}
        weighInForm={weighInForm} setWeighInForm={setWeighInForm}
        liftForm={liftForm} setLiftForm={setLiftForm}
        cardioForm={cardioForm} setCardioForm={setCardioForm}
        foodInput={foodInput} setFoodInput={setFoodInput}
        foodAnalysis={foodAnalysis} setFoodAnalysis={setFoodAnalysis}
        isAnalyzing={isAnalyzing} handleAnalyzeFood={handleAnalyzeFood}
        isSubmitting={isSubmitting} handleLogSubmit={handleLogSubmit}

        netCalories={netCalories}
        caloriesIn={caloriesIn}
        proteinIn={proteinIn}
        proteinTarget={proteinTarget}
        activityBurn={activityBurn} // We now rely on dailyBudget being the 'Target', so netCalories is calculated with it. 
        // Note: The Dashboard component might expect 'activityBurn' only. 
        // We pass 'activityBurn' + 0 here? 
        // Wait, the UI card says "Total Budget". In the old code we passed "BMR + Activity" as 'activityBurn'?
        // No, let's look at Dashboard:
        // const totalBudget = 1850 + activityBurn;
        // The Dashboard assumes a hardcoded 1850 BMR inside it? I should check.
        // If Dashboard has hardcoded 1850, we need to pass the dynamic BMR/TDEE.
        // Let's pass 'dailyBudget + activityBurn' as a prop hack if Dashboard is dumb,
        // OR we should open Dashboard and make it smart.
        // Checking previous 'page.tsx' replacement attempt:
        // activityBurn={activityBurn + dailyBudget} took the hack approach. 
        // But 'activityBurn' prop in Dashboard might just be displayed as "Activity".
        // Let's check Dashboard quickly.
        // Let's check Dashboard quickly.
        filteredActivity={filteredActivity}
        preferences={dataContext?.userProfile?.preferences}
      />
    </div>
  );
}
