# Project Excelsior Backlog

## ✅ Completed Phases (1-10)

All foundational work is done: Google Sheets backend, Gemini chat integration, Clara persona, nutrition tracking, macro analytics, auth (NextAuth + Google), Cloud Run deployment, GZCLP lifting engine, Active Workout mode, Weekly Report Card, Eagles Peak tracking, Hydration & Wellness logging, safety protocols, and the automated testing platform (21 tests: Vitest + Playwright).

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

---

## 📋 Next Session

- [ ] Push local changes to main branch and trigger Cloud Run build.
- [ ] Review Coach per-item macro breakdown (Clara sees totals but not individual items).
