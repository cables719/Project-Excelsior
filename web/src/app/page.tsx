
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatInterface } from '../components/ChatInterface';
import { Dashboard } from '../components/Dashboard';
import { SettingsModal } from '../components/SettingsModal';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ProfileModal } from '../components/ProfileModal';
import { LogModal } from '../components/LogModal';
import { FeedbackBox } from '../components/FeedbackBox';
import type { Message, WeighIn, Lift, Cardio, Nutrition, EaglesPeakLog, UserProfile, DataContext } from '@/lib/types';
import { DataContextState } from '@/lib/context';
import { calculateMovingAverage } from '@/lib/analytics';
import { Settings, UserCircle, MessageSquare, LayoutDashboard, Plus } from 'lucide-react';
import { generateText, generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { Toaster, toast } from 'react-hot-toast';

const google = createGoogleGenerativeAI({
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_GEMINI_API_KEY || '',
});

export default function Page() {
  // Mobile Tab State
  const [mobileTab, setMobileTab] = useState<'chat' | 'dashboard'>('chat');

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logModalType, setLogModalType] = useState<'weigh-in' | 'lift' | 'cardio' | 'nutrition' | 'eagles-peak'>('weigh-in');

  // Data State
  const [weighIns, setWeighIns] = useState<WeighIn[]>([]);
  const [lifts, setLifts] = useState<Lift[]>([]);
  const [cardio, setCardio] = useState<Cardio[]>([]);
  const [nutrition, setNutrition] = useState<Nutrition[]>([]);
  const [eaglesPeakLogs, setEaglesPeakLogs] = useState<EaglesPeakLog[]>([]); // New State

  // Derived Statistics State
  const [currentWeight, setCurrentWeight] = useState('--');
  const [currentBF, setCurrentBF] = useState('--');
  const [avgWeight, setAvgWeight] = useState(0);
  const [avgBF, setAvgBF] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [graphData, setGraphData] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nutritionGraphData, setNutritionGraphData] = useState<any[]>([]);

  // Macros / Targets
  const [netCalories, setNetCalories] = useState(0);
  const [caloriesIn, setCaloriesIn] = useState(0);
  const [proteinIn, setProteinIn] = useState(0);
  const [proteinTarget, setProteinTarget] = useState(180); // Default
  const [activityBurn, setActivityBurn] = useState(0);

  // Context for AI
  const [dataContext, setDataContext] = useState<DataContext | null>(null);

  // REFS for scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Initial Data Load ---
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async (force: boolean = false) => {
    console.log("Refreshing data...", force ? "(Forced)" : "");
    try {
      const response = await fetch(`/api/data${force ? '?refresh=true' : ''}`);
      const data = await response.json();
      console.log("Data received:", data);

      if (data.weighIns) setWeighIns(data.weighIns);
      if (data.lifts) setLifts(data.lifts);
      if (data.cardio) setCardio(data.cardio);
      if (data.nutrition) setNutrition(data.nutrition);
      if (data.eaglesPeakLogs) setEaglesPeakLogs(data.eaglesPeakLogs);

      // Process Stats
      processStats(data.weighIns, data.nutrition, data.userProfile, data.cardio);

      // Build Context String
      // Build Context String
      const context: DataContext = {
        weighIns: data.weighIns || [],
        lifts: data.lifts || [],
        cardio: data.cardio || [],
        nutrition: data.nutrition || [],
        eaglesPeakLogs: data.eaglesPeakLogs || [],
        hydrationLogs: data.hydrationLogs || [], // Add
        wellnessLogs: data.wellnessLogs || [], // Add
        userProfile: data.userProfile,
        formattedString: `Current Weight: ${data.weighIns?.[0]?.weight || 'N/A'} lbs.`
      };
      setDataContext(context);

      // Check for User Profile Name
      if (!data.userProfile?.name) {
        // Only open if strictly necessary, maybe just show a subtle indicator instead of popping up
        // setIsProfileOpen(true);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data.");
    }
  };

  // --- Weekly Report Trigger ---
  const handleGenerateReport = async (forceToday = false) => {
    if (!dataContext) return;

    // Check if it's Sunday (0) or if forced
    const today = new Date();
    if (today.getDay() !== 0 && !forceToday) {
      toast.error("Weekly reports are generated on Sundays.");
      return;
    }

    const toastId = toast.loading("Generating Weekly Report...");
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [
            ...messages,
            { role: 'user', content: "Generate the Weekly Progress Report now." }
          ],
          dataContext: dataContext, // Send full context
          systemOverride: "You are generating a Weekly Progress Report. Focus on trends, achievements, and opportunities for improvement based on the last week's data. Be encouraging but analytical."
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error("Report generation failed");

      // consume stream or text 
      // For simplicity reusing the chat structure, but standard chat might handle it 
      // if we just push the user message. 
      // Actually, let's just push the user message to the chat flow and let it handle it?
      // But we want a specific system prompt. 

      // Let's just manually trigger a chat turn with a hidden system prompt override if possible
      // Or just append the user message and let standard persona handle it if they are smart enough
      // The prompt "Generate the Weekly Progress Report" is usually enough for a persona.

      sendMessage("It's Sunday! Generate my Weekly Progress Report please.");
      toast.dismiss(toastId);

    } catch (e) {
      console.error(e);
      toast.error("Failed to generate report", { id: toastId });
    }
  };


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processStats = (wLogs: WeighIn[], nLogs: Nutrition[], profile: UserProfile, cLogs: Cardio[]) => {
    if (!wLogs || wLogs.length === 0) return;

    // Sort Descending
    const sortedW = [...wLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setCurrentWeight(sortedW[0].weight);
    setCurrentBF(sortedW[0].bodyFat || '--');

    // 7 Day Moving Average for Weight & BF
    // We need to map dates to values to fill gaps or just take recent entries
    const now = new Date();
    const last30Days = [];
    let wSum = 0;
    let bfSum = 0;
    let wCount = 0;
    let bfCount = 0;

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(); // Simple matching

      // Find log for this day (or closest previous?) -> effectively simplest is just match
      // But logs have time... assume YYYY-MM-DD or MM/DD/YYYY
      // Data usually sorted desc, let's just map simplified dates

      // Better approach for specific graph data:
      // Use the actual logs, average them if multiple per day (rare)
    }

    // --- Data Processing for Graph & Stats ---
    // Sort Ascending for Moving Average Calc
    const ascendingW = [...sortedW].reverse();

    // Calculate 7-day Moving Averages
    // Note: We use 7 *entries*. For a weight logger, this effectively smooths the trend.
    // We cast to any to handle the dynamic property addition in the helper if strict types complain, 
    // but the helper returns T & { [key: string]: number }.
    let processedPoints = calculateMovingAverage(ascendingW, 'weight', 7);
    processedPoints = calculateMovingAverage(processedPoints, 'bodyFat', 7);

    // Update Stats (Current Trend)
    if (processedPoints.length > 0) {
      const last = processedPoints[processedPoints.length - 1];
      // @ts-ignore - dynamic prop
      setAvgWeight(last.weightAvg || parseFloat(last.weight));
      // @ts-ignore
      if (last.bodyFatAvg) setAvgBF(last.bodyFatAvg);
      else if (last.bodyFat) setAvgBF(parseFloat(last.bodyFat));
    }

    // Graph Data (Last 60 days)
    const graphD = processedPoints.slice(-60).map(log => ({
      date: log.date,
      weight: parseFloat(log.weight),
      bodyFat: log.bodyFat ? parseFloat(log.bodyFat) : null,
      // @ts-ignore
      weightAvg: log.weightAvg,
      // @ts-ignore
      bodyFatAvg: log.bodyFatAvg
    }));
    setGraphData(graphD);


    // --- Nutrition Stats (Today) ---
    // Filter nLogs for Today
    const todayStr = new Date().toLocaleDateString(); // MM/DD/YYYY typically in JS if US locale
    // Need to match format from Google Sheets. Assuming MM/DD/YYYY or YYYY-MM-DD
    // Let's rely on standard string includes or normalized date objects

    // Normalize today to check against logs
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const todaysLogs = nLogs.filter(log => {
      const logDate = new Date(log.date);
      logDate.setHours(0, 0, 0, 0);
      return logDate.getTime() === todayDate.getTime();
    });

    const cals = todaysLogs.reduce((acc, curr) => acc + parseFloat(curr.calories || '0'), 0);
    const prot = todaysLogs.reduce((acc, curr) => acc + parseFloat(curr.protein || '0'), 0);
    const carb = todaysLogs.filter(l => l.item.toLowerCase().includes('carb')).length; // Dummy

    setCaloriesIn(cals);
    setProteinIn(prot);

    // Targets
    // BMR + Activity logic could go here. For now, static or profile based.
    // If profile has BMR override...
    let bmr = 2000;
    if (profile?.bmrOverride) bmr = profile.bmrOverride;
    else if (profile?.currentWeight) bmr = profile.currentWeight * 11; // Rough est

    // TDEE (Total Daily Energy Expenditure)
    // Default to Sedentary (1.2) if not specified
    // Use activityLevel from profile if available (e.g. 1.55)
    const activityScalar = Number(profile?.activityLevel || 1.2);
    const tdee = Number(profile?.tdeeOverride || (bmr * activityScalar));

    // Activity Burn (Today) from Cardio
    const todaysCardio = cLogs.filter(log => {
      const d = new Date(log.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === todayDate.getTime();
    });
    // Simplified: Estimate burn if not provided (rarely provided in types yet)
    // Assume 10 cals / min for now as placeholder or 0
    // If we add 'calories' to cardio type later
    const burn = todaysCardio.reduce((acc, curr) => acc + (parseFloat(curr.duration || '0') * 8), 0); // Approx 8 cal/min
    setActivityBurn(burn);

    // Net Calculation
    // TDEE Approach: Target = TDEE (+ optional Cardio burn if not included in activity level)
    // User requested TDEE (e.g. 2883) to be the budget.
    // We will assume TDEE includes baseline activity.
    // If we want to add *extra* burn, we can: const balance = (tdee + burn) - cals;
    // For now, let's stick to the requested TDEE base.
    const balance = tdee - cals;
    setNetCalories(balance);
    setProteinTarget(profile?.proteinOverride || (profile?.goalWeight ? profile.goalWeight : 180));


    // Nutrition Graph Data (Last 14 Days)
    // Map last 14 dates, fill with sum of logs
    // ... (omitted for brevity, assume processed in future)
    // Quick Hack: Just take last 14 unique days from logs
    const dailyNutrition: { [key: string]: { calories: number, protein: number, date: string } } = {};
    nLogs.forEach(log => {
      const d = new Date(log.date).toLocaleDateString();
      if (!dailyNutrition[d]) dailyNutrition[d] = { calories: 0, protein: 0, date: d };
      dailyNutrition[d].calories += parseFloat(log.calories || '0');
      dailyNutrition[d].protein += parseFloat(log.protein || '0');
    });
    const nutGraph = Object.values(dailyNutrition)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14)
      .map(d => ({
        ...d,
        shortDate: d.date.split('/').slice(0, 2).join('/'),
        target: tdee // Use TDEE as the limit line
      }));
    setNutritionGraphData(nutGraph);

  };


  // Image State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // --- Chat Logic ---
  const sendMessage = async (text: string) => {
    if ((!text.trim() && !selectedImage) || isLoading || !dataContext) return;

    // Create message with optional image
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      images: selectedImage ? [selectedImage] : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null); // Clear image after sending
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          dataContext: dataContext,
          clientDate: new Date().toLocaleDateString('en-US')
        }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      const assistantMsg: Message = { id: Date.now().toString(), role: 'assistant', content: data.role === 'assistant' ? data.content : data.text };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Chat Error:', error);
      toast.error("Clara is having trouble connecting.");
      setMessages(prev => [...prev, { id: 'error', role: 'assistant', content: "I'm having trouble connecting to the server. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    // Reset val
    e.target.value = '';
  };


  // --- Log Handlers ---
  const handleOpenLogModal = (type: 'weigh-in' | 'lift' | 'cardio' | 'nutrition' | 'eagles-peak') => {
    setLogModalType(type);
    setIsLogModalOpen(true);
  };

  const handleLogSubmit = async (data: any) => {
    const toastId = toast.loading("Saving...");
    try {
      const response = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.type,
          data: data
        })
      });

      if (!response.ok) throw new Error('Failed to log');

      // Refresh Data
      await refreshData(true);
      setIsLogModalOpen(false);
      toast.success("Log saved!", { id: toastId });

      // AI Reaction? (Optional)
      // sendMessage(`I just logged my ${logModalType}. Analysis?`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save log.", { id: toastId });
    }
  };

  const handleProfileSave = async () => {
    await refreshData(true);
    setIsProfileOpen(false);
    setIsSettingsOpen(false); // They might be in settings
    toast.success("Profile updated.");
  };

  const handleSettingsSave = async () => {
    await refreshData(true); // Reload prefs
    setIsSettingsOpen(false);
    toast.success("Settings saved.");
  }

  // --- Wellness Handlers ---
  // --- Wellness Handlers ---
  const handleLogHydration = async (amount: number) => {
    const now = new Date();
    const date = now.toLocaleDateString('en-US'); // Ensure matching locale with other logs
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Optimistic Update
    const newLog: any = { date, time, amount: amount.toString(), source: 'Quick Add' };
    if (dataContext) {
      setDataContext({
        ...dataContext,
        hydrationLogs: [...(dataContext.hydrationLogs || []), newLog]
      });
    }

    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'hydration',
          data: {
            date,
            time,
            amount,
            source: 'Quick Add'
          }
        })
      });
      // Background refresh to confirm
      refreshData(true);
    } catch (e) {
      console.error("Failed to log hydration", e);
      toast.error("Failed to save hydration. Refreshing...");
      refreshData(true); // Revert on failure
    }
  };

  const handleLogWellness = async (mood: number, energy: number, notes: string) => {
    const date = new Date().toLocaleDateString('en-US');
    await fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'wellness',
        data: {
          date,
          mood,
          energy,
          notes
        }
      })
    });
    await refreshData(true);
  };

  return (
    <div className="flex fixed inset-0 bg-[#050505] text-white overflow-hidden font-sans selection:bg-emerald-500/30">
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#18181b',
          color: '#fff',
          border: '1px solid #27272a',
        },
      }} />

      {/* MODALS */}
      <DataContextState.Provider value={dataContext}>
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          currentProfile={dataContext?.userProfile}
          onSave={handleSettingsSave}
          hasHistory={messages.length > 0}
        />
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentProfile={dataContext?.userProfile}
          onSave={handleProfileSave}
        />
        <LogModal
          isOpen={isLogModalOpen}
          onClose={() => setIsLogModalOpen(false)}
          type={logModalType}
          onSave={handleLogSubmit}
          preferences={dataContext?.userProfile?.preferences}
          lifts={lifts}
        />

        {/* Mobile Tab Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-900 border-t border-zinc-800 z-50 flex justify-around items-center">
          <button onClick={() => setMobileTab('chat')} className={`flex flex-col items-center ${mobileTab === 'chat' ? 'text-white' : 'text-zinc-500'}`}>
            <MessageSquare size={20} />
            <span className="text-[10px] uppercase font-bold mt-1">Chat</span>
          </button>
          <button onClick={() => setIsLogModalOpen(true)} className="bg-emerald-500 text-black p-3 rounded-full -mt-6 border-4 border-[#050505]">
            <Plus size={24} />
          </button>
          <button onClick={() => setMobileTab('dashboard')} className={`flex flex-col items-center ${mobileTab === 'dashboard' ? 'text-white' : 'text-zinc-500'}`}>
            <LayoutDashboard size={20} />
            <span className="text-[10px] uppercase font-bold mt-1">Stats</span>
          </button>
        </div>

        {/* Desktop Layout */}
        <div className="flex w-full h-full">

          {/* LEFT: Chat Interface (Hidden on mobile unless tab active) */}
          <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 h-full relative`}>
            <ChatInterface
              messages={messages}
              input={input}
              setInput={setInput}
              handleChatSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              isLoading={isLoading}
              selectedImage={selectedImage}
              onImageSelect={handleImageSelect}

              messagesEndRef={messagesEndRef}
              coachMode={dataContext?.userProfile?.coachMode}
              userAvatar={dataContext?.userProfile?.userAvatar}
              coachAvatar={dataContext?.userProfile?.customCoachAvatar}
              coachName={dataContext?.userProfile?.customCoachName}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenProfile={() => setIsProfileOpen(true)}
            />
          </div>

          {/* RIGHT: Dashboard (Hidden on mobile unless tab active) */}
          <div className={`${mobileTab === 'dashboard' ? 'flex' : 'hidden'} md:flex w-full md:w-[600px] h-full z-20`}>
            <Dashboard
              currentWeight={currentWeight}
              currentBF={currentBF}
              avgWeight={avgWeight}
              avgBF={avgBF}
              graphData={graphData}
              nutritionGraphData={nutritionGraphData}
              onOpenLogModal={handleOpenLogModal}

              netCalories={netCalories}
              caloriesIn={caloriesIn}
              proteinIn={proteinIn}
              proteinTarget={proteinTarget}
              activityBurn={activityBurn}
              filteredActivity={cardio}

              lifts={lifts}
              eaglesPeakLogs={eaglesPeakLogs}
              cardio={cardio}
              weighIns={weighIns}
              nutrition={nutrition}
              preferences={dataContext?.userProfile?.preferences}

              // [NEW] Wellness Props
              hydrationLogs={dataContext?.hydrationLogs || []}
              wellnessLogs={dataContext?.wellnessLogs || []}
              onLogHydration={handleLogHydration}
              onLogWellness={handleLogWellness}
            />
          </div>

        </div>
      </DataContextState.Provider>

      <FeedbackBox />
    </div>
  );
}
