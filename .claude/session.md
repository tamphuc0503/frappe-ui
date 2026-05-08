# Session Summary — OceanFleet ERP Dashboard

**Date:** 2026-05-08  
**Project:** `/home/phuckool/aprilsea/oceanfleet/ui`  
**Stack:** Vite 8 · React 19 · TypeScript 6 · Tailwind CSS 4 · React Router 7 · Lucide React 1

---

## What Was Built

### Initial Scaffold & Routing
- Bootstrapped Vite + React + TypeScript project
- Installed and configured **Tailwind CSS v4** with `@tailwindcss/postcss` plugin
- Replaced default `App.tsx` with full React Router v7 setup (`BrowserRouter`, protected/public routes, `AppShell` layout with `Outlet`)
- Rewrote `index.css` for Tailwind v4 (`@import "tailwindcss"` replaces the three `@tailwind` directives; base resets written as plain CSS outside any layer)

### Authentication
- `/login` — email + password form, remember me, error handling. Demo credentials: any email + `password123`
- `/forgot-password` — reset flow UI
- `AuthContext` — localStorage persistence, derived name/initials from email
- `ProtectedRoute` / `PublicRoute` guards

### App Shell
- `Sidebar` — collapsible (icon-only + tooltip mode), auto-opens active submenu, state persisted in localStorage
- `Header` — live date display, notifications dropdown, user menu with logout
- `AppShell` — fixed sidebar + header, scrollable main content area offset correctly

### Pages Built

| Route | Page |
|---|---|
| `/dashboard` | Stats cards, activity feed, fleet summary |
| `/live-news` | Category-filtered news card grid |
| `/hrm/employees` | Employee table with Add dialog |
| `/hrm/leave` | Leave requests table |
| `/hrm/payrolls` | Payroll records with summary stats |
| `/hrm/recruitment` | Kanban board (Screening → Interview → Offer → Hired) |
| `/hrm/attendance` | Shift & Attendance with week bar + table |
| `/hrm/clock-in-out` | Clock In/Out with live clock + monthly calendar |
| `/fleet/vehicles` | Vehicle registry table |
| `/fleet/drivers` | Driver table with avatar |
| `/fleet/trips` | Trip log table |
| `/crm/contacts` | Contact directory |
| `/crm/deals` | Deal pipeline table |
| `/crm/reports` | Revenue stats + bar chart + table |

---

## Features Added

### Clock In / Out Page (`/hrm/clock-in-out`)
- Live ticking clock (updates every second via `setInterval`)
- Clock In / Clock Out button — green when not clocked in, red when clocked in, with pulsing status badge and live running duration
- 4 stat cards: Today's hours, This week total, Days worked this month, Avg. start time
- Monthly calendar — color-coded (green = complete, amber = in progress, red = absent, blue = today), shows clock-in/out times inside each cell, prev/next month navigation
- Day detail panel + recent activity list (last 5 records)
- All records persisted in `localStorage` under key `oceanfleet_clock_records`
- Seeded with April–May 2026 sample data

### Skeleton Loading System
- `@keyframes shimmer` in `index.css` — moving gradient light sweep, 1.6s loop
- `usePageLoad(ms?)` hook — simulates loading delay (default 900ms)
- `src/components/ui/Skeleton.tsx` — 14 reusable primitives:
  `Sk`, `SkPageHeader`, `SkStatCard`, `SkStatCards`, `SkTable` (with `hasAvatar` variant),
  `SkNewsCard`, `SkKanbanColumn`, `SkWeekBar`, `SkCalendarGrid`, `SkClockPanel`,
  `SkActivityItem`, `SkBarChart`, `SkToolbar`
- Every page (13 total) wired with page-appropriate skeleton layout

### Add Employee Dialog
- **Sheet-from-top animation** — slides in from fully off-screen above (`translateY(-100%)`) with `cubic-bezier(0.22, 1, 0.36, 1)` spring easing; backdrop fades in simultaneously
- `rounded-b-2xl` only (no top corners) — looks attached to top edge
- **Form fields:** Full Name, Email, Phone (optional), Department (select), Position, Status (select), Join Date
- **Status options:** Onboarding (default for new), Active, Inactive, On Leave
- **Live avatar preview** removed (per user request — clean form only)
- **Validation** — inline red error messages on required fields
- **Shake animation** on failed fields — `@keyframes field-shake` 7-step horizontal wobble (400ms, ease-in-out); applied per-field wrapper via `shakingFields: Set<keyof FormData>`; self-clears via `onAnimationEnd`; re-triggers on repeated invalid submits
- **Fake API simulation** — 1400ms `setTimeout` on submit; spinner (`Loader2 animate-spin`) + "Adding..." in button; `min-w-[140px]` prevents button width jump; Cancel + backdrop + Escape blocked during submission
- Employee list is stateful (`useState`) — newly added employees appear immediately with auto-derived initials and cycling avatar color

---

## Typography
- Font: **Plus Jakarta Sans** (Google Fonts, weights 300–800 + italic)
  — replaced Inter for a more modern geometric feel
- Applied globally via `body`, `h1–h6`, and `tailwind.config.js` `fontFamily.sans`

---

## Key Files

```
src/
  App.tsx                          # Router + auth guards
  index.css                        # Tailwind v4 + shimmer + shake + dialog animations
  hooks/
    usePageLoad.ts                 # Loading delay hook
  components/
    layout/
      AppShell.tsx                 # Layout shell with Outlet
      Sidebar.tsx                  # Collapsible nav with tooltips
      Header.tsx                   # Top bar with notifications + user menu
    ui/
      Skeleton.tsx                 # 14 skeleton primitives
      Badge.tsx                    # Pill badges (green/yellow/red/blue/gray/purple)
      StatCard.tsx                 # Metric card with trend
      PageHeader.tsx               # Page title + action slot
  context/
    AuthContext.tsx                # Auth state + localStorage persistence
  pages/
    auth/Login.tsx
    auth/ForgotPassword.tsx
    Dashboard.tsx
    LiveNews.tsx
    hrm/Employee.tsx               # Full Add dialog with animations
    hrm/Leave.tsx
    hrm/Payrolls.tsx
    hrm/Recruitment.tsx
    hrm/ShiftAttendance.tsx
    hrm/ClockInOut.tsx
    fleet/Vehicles.tsx
    fleet/Drivers.tsx
    fleet/Trips.tsx
    crm/Contacts.tsx
    crm/Deals.tsx
    crm/Reports.tsx
```

---

## Dev Server
```
npm run dev   →  http://localhost:5174
npm run build →  dist/ (clean, no TS errors)
```
