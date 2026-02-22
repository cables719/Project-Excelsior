
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChatInterface } from '../components/ChatInterface';
import { Dashboard } from '../components/Dashboard';
import { SettingsModal } from '../components/SettingsModal';

import { ProfileModal } from '../components/ProfileModal';
import { LogModal } from '../components/LogModal';
import { FeedbackBox } from '../components/FeedbackBox';
import { ActiveWorkout } from '../components/ActiveWorkout';
import type { Message, WeighIn, Lift, Cardio, Nutrition, EaglesPeakLog, UserProfile, DataContext } from '@/lib/types';
import { DataContextState } from '@/lib/context';
import { calculateMovingAverage, calculateTDEE, calculateNetCalories } from '@/lib/analytics';
import { getWeeklyStats } from '@/lib/report';
import { predictNextWorkout, WorkoutPlan } from '@/lib/gzclp-engine';
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
  const [isActiveWorkoutOpen, setIsActiveWorkoutOpen] = useState(false);
  const [activeWorkoutPlan, setActiveWorkoutPlan] = useState<WorkoutPlan | null>(null);

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

  // --- Sunday Auto-Trigger for Weekly Report ---
  useEffect(() => {
    if (!dataContext || messages.length > 0) return; // Only on fresh load with data ready

    const now = new Date();
    if (now.getDay() !== 0) return; // Not Sunday

    // Build a week key like "2026-W08" to prevent re-firing on reload
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
    const weekKey = `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;

    const lastReportWeek = localStorage.getItem('excelsior_report_week');
    if (lastReportWeek === weekKey) return; // Already sent this week

    // Compute structured stats and fire the trigger invisibly
    const stats = getWeeklyStats(dataContext);
    localStorage.setItem('excelsior_report_week', weekKey);

    const triggerPrompt = `SYSTEM_EVENT: WEEKLY_REPORT_TRIGGER
Context: The user has logged in. It is Sunday (or a requested report).
Task: Generate a "Weekly Report Card" based on the following JSON stats.
Tone: Supportive, enthusiastic, fun.
Styles: Use Markdown. Use Emojis. Make it look like a receipt or a dashboard.

STATS:
${JSON.stringify(stats, null, 2)}

INSTRUCTIONS:
1. **The Headline**: Fun greeting acknowledging the week is done.
2. **Context**: State the date range of this report (e.g. "Week of Jan 21 - Jan 28").
3. **The Numbers**:
   - Show Total Lifting Volume (in lbs).
   - Show the "Lift of the Week" (Heaviest weight moved).
   - Show Cardio Minutes (if any).
4. **The Analysis**:
   - Compare "Weight Change" (using the provided 7-day rolling average difference).
   - Mention "Compliance" (Days logged / 7).
5. **The Vibes & Notes**:
   - Look at the "highlights" list in the JSON. If the user mentioned "PR", "Win", or "Hard", mention it!
   - Keep the tone hype. If volume is high (>10k), celebrate "The Grind".`;

    // Send invisibly — don't show the trigger prompt in chat, only Clara's response
    setIsLoading(true);
    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: triggerPrompt }],
        clientDate: now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        dataContext: dataContext,
      }),
    })
      .then(res => res.json())
      .then(data => {
        const reportMsg: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.role === 'assistant' ? data.content : data.text,
        };
        setMessages([reportMsg]);
      })
      .catch(err => {
        console.error('Weekly report trigger failed:', err);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataContext]);

  const handleStartWorkout = () => {
    // Predict the next workout based on history
    const plan = predictNextWorkout(lifts);
    setActiveWorkoutPlan(plan);
    setIsActiveWorkoutOpen(true);
  };

  const handleCompleteActiveWorkout = async (loggedLifts: Lift[]) => {
    setIsActiveWorkoutOpen(false);

    // We will loop over these and send to API
    const toastId = toast.loading("Saving Workout Logs...");
    try {
      for (const lift of loggedLifts) {
        await fetch('/api/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'lift',
            data: lift
          })
        });
      }
      await refreshData(true);
      toast.success("Workout saved to Google Sheets!", { id: toastId });
    } catch (e) {
      console.error("Failed to save workout logs", e);
      toast.error("Error saving workout. Some data may be lost.", { id: toastId });
      setLifts(prev => [...loggedLifts, ...prev]); // Optimistic fallback
    }
  };
  const processStats = (wLogs: WeighIn[], nLogs: Nutrition[], profile: UserProfile, cLogs: Cardio[]) => {
    if (!wLogs || wLogs.length === 0) return;

    // Sort Descending
    const sortedW = [...wLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setCurrentWeight(sortedW[0].weight);
    setCurrentBF(sortedW[0].bodyFat || '--');

    // 7 Day Moving Average for Weight & BF
    // Sort Ascending for Moving Average Calc
    const ascendingW = [...sortedW].reverse();

    // Calculate 7-day Moving Averages
    let processedPoints = calculateMovingAverage(ascendingW, 'weight', 7);
    processedPoints = calculateMovingAverage(processedPoints, 'bodyFat', 7);

    // Update Stats (Current Trend)
    if (processedPoints.length > 0) {
      const last = processedPoints[processedPoints.length - 1] as any;
      setAvgWeight(last.weightAvg || parseFloat(last.weight));
      if (last.bodyFatAvg) setAvgBF(last.bodyFatAvg);
      else if (last.bodyFat) setAvgBF(parseFloat(last.bodyFat));
    }

    // Graph Data (Last 60 days)
    const graphD = processedPoints.slice(-60).map((log: any) => ({
      date: log.date,
      weight: parseFloat(log.weight),
      bodyFat: log.bodyFat ? parseFloat(log.bodyFat) : null,
      weightAvg: log.weightAvg,
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
    const tdee = calculateTDEE(
      profile?.currentWeight as number | undefined,
      profile?.bmrOverride as number | undefined,
      profile?.tdeeOverride as number | undefined,
      profile?.activityLevel as number | undefined
    );

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
    const balance = calculateNetCalories(tdee, cals, burn, false);
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

    const newMessages = [...messages, userMsg];

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null); // Clear image after sending
    setIsLoading(true);

    // Calculate context for override
    let overrideStr = undefined; // Initialize as undefined
    if (isActiveWorkoutOpen && activeWorkoutPlan) {
      const activeSets = activeWorkoutPlan.sets;
      const currentExercise = activeSets[0] || { exercise: 'an exercise', targetWeight: 0, targetReps: 0 }; // Very rough approximation for now of what they are doing
      overrideStr = "The user is currently in the middle of a live workout, resting between sets. They are doing " + activeWorkoutPlan.dayName + ". Give brief, hyper-focused advice, form cues, or hype. Do not give long winded answers.";
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          clientDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          dataContext: dataContext,
          systemOverride: overrideStr
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
        {isActiveWorkoutOpen && (
          <ActiveWorkout
            plan={activeWorkoutPlan}
            onClose={() => setIsActiveWorkoutOpen(false)}
            onComplete={handleCompleteActiveWorkout}

            // Chat Pass-through
            messages={messages}
            input={input}
            setInput={setInput}
            handleChatSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            isLoading={isLoading}
            userAvatar={dataContext?.userProfile?.userAvatar}
            coachAvatar={dataContext?.userProfile?.customCoachAvatar}
            coachName={dataContext?.userProfile?.customCoachName}
          />
        )}

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
              onStartWorkout={handleStartWorkout}

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
