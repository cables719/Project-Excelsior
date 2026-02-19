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
**Status: COMPLETE (Polished)**
- [x] **Web App Setup**: Next.js + TailwindCSS (Dark Mode aesthetic).
- [x] **Data Dashboard**: Sidebar with `recharts` for Weight/Body Fat trends.
- [x] **Activity Logging**: Card-based forms for Weigh-ins, Lifts, and Cardio.
- [x] **Bubble Height**: Reduced vertical padding for assistant messages.
    - [x] **Avatar Polish**: Fixed alignment, increased size to 125%, added custom crop, and restored colored rings.
    - [x] **Activity Log**: Added subtle date dividers for better readability.
    - [x] **Chat Rendering**:
        - [x] **Resolved**: Upgraded to `gemini-2.5-flash` (Stable) to fix intermittent timeouts.
        - [x] **Verified**: Vercel AI SDK compatibility & Memory persistence.
        - [x] **Fixed**: Server Error handling for JSON vs Stream response types.

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
- [x] **Multi-User / Privacy**: Secure the application and data feeds.
- [x] **Hosting**: Deploy to production environment (Explore **Google Cloud Run** vs Vercel/Fly.io).
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
- [x] **Coach Customizer**: Allow user to swap "Personalities" (e.g., Drill Sergeant vs. Cheerleader).
    - [x] **Custom Builder**: Frontend UI to let users design their own Coach (Name, Avatar, Personality Traits).
    - [x] **User Avatar**: Allow users to upload their own profile picture.
    - [x] **Refinement**: Added "Reset Custom Coach" token clearing.
    - [x] **Refinement**: Fixed TDEE Override Logic and labeling.
    - [x] **Refinement**: Fixed "Ghost Prompt" persistence bug (Sheet Clearing).
- [x] **Automated Persona Testing**: Script to "fuzz test" coach personalities (all slider combos) to ensure sanity.

## 🧹 Phase 7: Pre-Production Clean & Polish
**Status: COMPLETE**
- [x] **Tech Debt Audit**: Scanning for:
    - [x] `console.log` removal in production paths.
    - [x] Hardcoded strings / Magic numbers.
    - [x] Type safety loose ends (`any` types).
    - [x] Unused imports/files (e.g., old throw-away scripts).
- [x] **Codebase Slimming**: Removing deprecated endpoints or unused components.
- [x] **Security Prep**: Environmental variable audit.

## 🔐 Phase 8: Production & Security
**Status: PENDING**
- [x] **Privacy Protocols**: Research & implement data safety for multi-user support.
- [x] **Auth Strategy**: Google Auth / NextAuth implementation.
- [x] **Hosting**: Deploy final build.

## �️ Phase 10: Operational Safety
**Status: ESTABLISHED**
- [x] **Safety Protocol**: Implemented `.agent/workflows/safety_protocol.md` to enforce:
    - Risk Assessment.
    - Pre-work Commits.
    - Experimental Branching.

## �🚀 Phase 11: Future Roadmap (Stretch Goals)
**Status: BRAINSTORMING**
- [ ] **Social Leaderboard**:
    - [ ] Compare "Consistency Score" with friends.
    - [ ] "Gym Buddy" view (read-only access to a friend's logs).
- [x] **Lifting Analytics**:
    - [x] 1RM estimated trend lines (Epley formula).
    - [x] Tier-based Filtering (GZCLP T1/T2).
    - [x] "Smart History" Context (Last T1/T2 display).
    - [ ] Volume per muscle group visualization (Heatmap).
- [ ] **Visual Progress ("The Mirror")**:
    - [ ] Side-by-side photo comparison tool.
    - [ ] AI body composition estimation from photos.
- [ ] **Gamification**:
    - [x] **Concept Phase**: "Gamification" was considered but rejected by user (1/30). Replaced by "Eagles Peak" Specialized Tracking.
    - [ ] **Eagles Peak**:
        - [ ] Dedicated Data Entry Form.
        - [ ] Visualization of Ascent/HR/Zone data.
- [x] **Advanced Coaching**:
    - [x] "Weekly Report Card": AI generates a Sunday summary of compliance and progress.
    - [ ] "Macro Cycling": Auto-adjust targets for Rest vs Training days.
- [ ] **Social Circles**: Optional leaderboard or "Workout Buddy" grouping for trusted friends.
- [ ] **Mobile Optimization**: PWA / Touch targets. (Note: Low priority as testing devices are limited).
- [x] **Unified Dashboard View**:
    - [x] Group Graphs + Data Entry by domain (Biomech + Body, Lift + Lifts, etc).
    - [x] Simplify navigation model (reduce tab switching).
    - [x] **Visual De-clutter**:
        - [x] Remove redundant "Current Weight" displays (Stats vs Forms).
        - [ ] Audit generic visual noise/density.

## 🛠 Phase 10: Tech Debt & Design v2 (Proposed)
**Status: PROPOSED**

### Technical Refactoring
- [ ] **Dashboard Decomposition**: Split the ~900 line `Dashboard.tsx` into sub-components (`BiometricsSection`, `ExerciseSection`, `NutritionSection`, `RecentActivityList`) to improve maintainability.
- [ ] **Type Safety**: Strictly define interfaces for `DashboardProps` and `LogEntry` to remove `any` types and prevent regression.
- [ ] **State Management**: Lift form state to a Context or Custom Hook (`useDashboardState`) to reduce prop-drilling in `page.tsx`.

### Design v2 / Simplification
- [ ] **"Input Mode" vs "View Mode"**:
    - **Current**: Inputs are always visible (visual noise).
    - **Proposed**: Global "Log +" FAB (Floating Action Button) or Header Button that opens a unified logging modal. Clears 40% screen space for data visualization.
- [ ] **Desktop Grid**: Move `Biometrics` and `Nutrition` to a side-by-side masonry layout on larger screens (currently single column).
- [ ] **Unified Time Control**: Move the date picker out of individual forms and into the Global Header, acting as a "Time Machine" for the entire dashboard view.

## 🔜 Next Session
- **Tech Debt**: Refactor the "Preferences" logic to be a single source of truth (Database first) to avoid the "Triangle of Death" sync issues.
- **Social**: Check in with other users to gauge engagement and verify the "Sunday Report" impact.
- **Production Deployment**: Push local changes to main branch and trigger **Google Cloud Run** build.
- **Polish**: Coach sees total daily macros but not per-item breakdown. (Consider adding if detailed feedback is needed).

### Completed Fixes (Feb 17)
- [x] **Nutrition UI**: Extracted "Daily Budget" & "Protein Goal" from Log Activity form into a dedicated `NutritionOverview` component on the Dashboard for better visibility.
- [x] **Code Cleanup**: Removed unused props and legacy code from `LogForms` and `LogModal`.

### Completed Fixes (Jan 30)
- [x] **New Feature**: "Eagles Peak" Tracking - Dedicated tab, form, and graph for hiking stats.

### Completed Fixes (Jan 28)
- [x] **New Feature**: "Weekly Report Card" - Auto-triggered Sunday summary of Volume, PRs, and Consistency.
- [x] **Highlights Engine**: Backend now extracts "PR", "Win", "Max" notes for Coach awareness.
- [x] **UI Polish**: Fixed "System Ready" graphic persisting while Coach is typing.
- [x] **Analytics**: Implemented 7-Day Rolling Average for weight change in reports.

### Completed Fixes (Jan 26)
- [x] **Data Robustness**: Fixed graph "rolling average" logic to handle large time gaps gracefully (Time-based Window).
- [x] **Coach Awareness**: Fixed bug where Coach could not see Nutrition logs (added explicit labeling and robust date parsing).
- [x] **CRITICAL FIX**: Cloud Run Environment Variables (Chat & Sync are broken). (Verified).
- [x] **Data Isolation**: Fix LLM Chat seeing Admin data for other users (Verified).
- [x] **Data Contamination**: Fix Profile Settings overwriting Admin Sheet (Verified).
- [x] **Google Drive Sync**: Investigate/Fix inability of web version to sync with Google Drive (Confirmed Working).
