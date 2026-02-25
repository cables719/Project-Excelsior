# Project Excelsior Backlog

## ✅ Completed Phases (1-11)

All foundational work is done: Google Sheets backend, Gemini chat integration, Clara persona, nutrition tracking, macro analytics, auth (NextAuth + Google), Cloud Run deployment, GZCLP lifting engine, Active Workout mode (with live Clara context & per-lift notes), Weekly Report Card, Eagles Peak tracking, Hydration & Wellness logging, Coach Notes (Clara memory), Exercise Normalization, safety protocols, and the automated testing platform (21 tests: Vitest + Playwright).

### 🟢 Recently Shipped
- **Exercise Normalization**: Maps variations (e.g. Dlift, Deadlift) to canonical names across the entire app.
- **Coach Notes (Memory)**: Clara saves private reminders (`[COACH_NOTE: ...]`) to a dedicated sheet tab and loads the last 10 for context.
- **Active Workout Upgrades**: Clara gets live context (exercise, weight, set, tier) during rest periods, and users can log per-lift notes.
- **Analytics Refinements**: Pullup weight logic fixed (tier-aware, no +5), and "deload" sessions are filtered out of strength graphs/PBs.
- **Feedback Routing**: All feedback now correctly routes to the admin's master sheet.

---

## 🔧 Active: Tech Debt & Refactoring

- [ ] **`appendToSheet()` helper**: Extract duplicate boilerplate from the 7 append functions in `data.ts` (~200 lines saved).
- [ ] **Delete dead `fetchUserProfile()`**: Unused function in `data.ts` — `fetchContext()` already does this work.
- [ ] **Dashboard Decomposition**: Split ~908-line `Dashboard.tsx` into tab-specific sub-components (requires safety commit first).
- [ ] **State Management**: Extract 15+ `useState` calls in `page.tsx` into `useDashboardData` hook (requires safety commit first).
- [ ] **Type Safety**: Remove remaining `any` types in `DashboardProps`, graph data, and log handlers.
- [ ] **Preferences Sync**: Single source of truth for preferences (currently split between DB and local state).
- [ ] **Mobile Optimization**: PWA / Touch targets (low priority).
- [ ] **Visual Noise Audit**: Review dashboard density and spacing.

---

## 🚀 Roadmap: Stretch Goals

- [ ] **Social Leaderboard**: "Consistency Score" comparison, read-only "Gym Buddy" view.
- [ ] **Volume Heatmap**: Per-muscle-group volume visualization.
- [ ] **Workout Versatility**: Support for different lifting styles (tempo control, RPE tracking, custom progressions beyond GZCLP).

---

## 📋 Next Session

- [ ] Push local changes to main branch and trigger Cloud Run build.
- [ ] Review Coach per-item macro breakdown (Clara sees totals but not individual items).
