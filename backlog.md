# Project Excelsior Backlog

## ✅ Phase 1: Foundation (Backend & Data)
**Status: COMPLETE**
- [x] **Project Initialization**: Set up Node.js/TypeScript Next.js app.
- [x] **Google Sheets Integration**:
    - [x] Authenticate with Service Account.
    - [x] Implement `fetchContext` (parses weigh-ins and lifts).
- [x] **LLM Integration**:
    - [x] **PIVOT**: Migrated from OpenAI to **Google Gemini 2.0 Flash** (Free Tier).
    - [x] Set up API route `/api/chat` using Vercel AI SDK.
    - [x] Verified backend connectivity via `test-gemini-flow.ts` (Model generates text successfully).

## ✅ Phase 2: Interface & Core Loop
**Status: COMPLETE (Chat Fixed)**
- [x] **Web App Setup**: Next.js + TailwindCSS (Dark Mode aesthetic).
- [x] **Data Dashboard**: Sidebar with `recharts` for Weight/Body Fat trends.
- [x] **Activity Logging**: Card-based forms for Weigh-ins, Lifts, and Cardio.
- [x] **Bubble Height**: Reduced vertical padding for assistant messages.
    - [x] **Avatar Polish**: Fixed alignment, increased size to 125%, added custom crop, and restored colored rings.
    - [x] **Activity Log**: Added subtle date dividers for better readability.
    - [x] **Chat Rendering**:
        - [x] **Resolved**: Upgraded to `gemini-2.5-flash` (Stable) to fix intermittent timeouts.
        - [x] **Verified**: Vercel AI SDK compatibility & Memory persistence.

## 🔜 Phase 3: Persona (Clara) & Intelligence
**Status: IN PROGRESS**
- [x] **Persona Overhaul**:
    - [x] **Implemented `persona.ts`**: "Clara" voice/prompt installed (Gym partner, GZCLP context).
- [x] **Long-Term Memory**:
    - [x] **Implemented Local Persistence**: `chat_history.json` + `memory.ts`.
    - [x] **Context Injection**: API automatically loads last 10 messages.
- [x] **Context Depth**:
    - [x] **Scope Expansion**: Increased fetch window to 365 days / 5000 rows.
    - [x] **Verified**: `data.ts` now pulls full history for Gemini.

## 🍎 Phase 4: Nutrition & Intelligence
**Status: COMPLETE (Tuned)**
- [x] **Macro Tracker ("Nutrition Sniffer")**:
    - [x] **Database**: Auto-created `Nutrition` tab in Google Sheets.
    - [x] **AI Analysis**: Gemini 2.5 estimates macros from natural language.
    - [x] **UI**: Dedicated "FOOD" tab with Net Calorie Budget (BMR + Activity - Food).
- [x] **Refinements**:
    - [x] **Bug**: Activity burn isn't registering in Net Calorie math (shows 0).
    - [x] **Bug**: Date column truncation / year missing in log.
    - [x] **Bug**: Food tab hover tooltip fixed (removed AI text insertion).
    - [x] **Feature**: Lifting sessions add flat 250 Calc burn.
    - [x] **Tuning**: Calorie/Protein estimates calibrated (Best effort).
- [x] **Dynamic Persona**:
    - [x] Inject actual max lifts from spreadsheet (GZCLP aware).
    - [x] Inject **Last Session** data for context.

## 🔐 Phase 5: Production & Scaling
**Status: COMPLETE**
- [x] **User Profile & Goals**:
    - [x] **Settings UI**: Modal for Personal Stats (Height/Weight/Age/Sex).
    - [x] **Dynamic targets**: Auto-calculate BMR & Protein based on profile (Mifflin-St Jeor).
    - [x] **Storage**: Persist User Profile in a new `User` tab.
    - [x] **Dashboard Integration**: Live updates to "Net Calories" logic.
- [ ] **Multi-User / Privacy**: Secure the application and data feeds.
- [ ] **Hosting**: Deploy to production environment (Explore **Google Cloud Run** vs Vercel/Fly.io).
- [ ] **Mobile Optimization**: Progressive Web App (PWA) or mobile-first UI tweaks.
- [x] **Tech Debt**: Code cleanup, refactoring, and slimming down codebase.

## 🧠 Phase 6: Intelligence Upgrade
**Status: IN PROGRESS**
- [x] **Context Architecture**:
    - [x] **Refactor**: Split `persona.ts` into Identity (Soul) vs Data (Brain).
    - [x] **Dynamic Prompting**: Inject Real-Time TDEE/Macro status into System Prompt.
    - [x] **Timezone Awareness**: Client-side date injection fixes "Empty Log" bug.
- [x] **Behavioral Rules**:
    - [x] **Anti-panic**: Logic to handle missing data gracefully.
    - [x] **Non-repetitive**: Instructions to use data implicitly.
- [x] **Data Accuracy**: Add `currentWeight` to Settings Modal for accurate BMR.
- [ ] **Coach Customizer**: Allow user to swap "Personalities" (e.g., Drill Sergeant vs. Cheerleader).
