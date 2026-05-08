# OceanFleet UI — Coding Rules

## Stack

| Layer | Library / Version |
|---|---|
| Bundler | Vite 8 |
| UI | React 19 |
| Language | TypeScript 6 (`strict`-equivalent via `noUnusedLocals`, `noUnusedParameters`) |
| Styling | Tailwind CSS 4 + `@tailwindcss/postcss` |
| Routing | React Router 7 |
| Icons | Lucide React 1 |
| Font | Plus Jakarta Sans (Google Fonts) |

---

## TypeScript

- **No `React` default import** — JSX transform is `react-jsx`; import only named exports (`useState`, `useEffect`, etc.). The compiler flags unused imports as errors (`noUnusedLocals`).
- **No `React.FC`** — declare components as plain named functions with explicit prop interfaces.
- **Interfaces for props and data shapes, `type` for unions.**
  ```ts
  // ✅
  interface Employee { id: number; name: string; status: EmployeeStatus }
  type EmployeeStatus = 'Active' | 'Inactive' | 'On Leave' | 'Onboarding'

  // ❌
  type Employee = { id: number; ... }
  const Employee: React.FC<Props> = ...
  ```
- **`verbatimModuleSyntax` is on** — use `import type` for type-only imports to avoid runtime artifacts.
- **No unused variables or parameters** — the compiler rejects them. Prefix intentionally unused params with `_`.
- All async functions that suspend UI must handle loading and error states explicitly.

---

## Component Conventions

- **Named exports only** — no default exports except `App` (the router root).
  ```ts
  // ✅
  export function Employee() { ... }

  // ❌
  export default function Employee() { ... }
  ```
- **One component per file** unless a sub-component is private to that file and under ~30 lines (e.g., `AddEmployeeDialog` lives inside `Employee.tsx`).
- **Props interface directly above the function**, not at the top of the file.
- **Co-locate types with their component** — don't create a separate `types.ts` unless a type is shared by 3+ files.

---

## File Structure

```
src/
  App.tsx                      # Router only — no UI logic here
  main.tsx                     # Entry point, StrictMode wrapper
  index.css                    # Tailwind import + global resets + keyframes + @layer components
  types/
    auth.ts                    # User, AuthContextType
    hrm.ts                     # Employee, LeaveRequest, PayrollRecord, AttendanceRecord, Candidate, KanbanColumn, ClockRecord
    fleet.ts                   # Vehicle, Driver, Trip (+ status union types)
    crm.ts                     # Contact, Deal (+ union types)
  services/
    auth.ts                    # frappeLogin() — Frappe REST API call
  hooks/
    usePageLoad.ts             # Loading delay hook (900ms default)
    useAuth.ts                 # Auth state hook — import from here, NOT from context/
  context/
    AuthContext.tsx            # AuthProvider + AuthContext export (do not import useAuth from here)
  components/
    layout/                    # AppShell, Sidebar, Header (structural, rendered once)
    ui/                        # Reusable primitives: Badge, StatCard, PageHeader, Skeleton
  pages/
    auth/                      # Login, ForgotPassword
    hrm/                       # Employee, Leave, Payrolls, Recruitment, ShiftAttendance, ClockInOut
    fleet/                     # Vehicles, Drivers, Trips
    crm/                       # Contacts, Deals, Reports
```

- **Page files live in the domain folder** that matches their route segment (`/hrm/employees` → `src/pages/hrm/Employee.tsx`).
- **New reusable UI goes in `components/ui/`**, not inline in a page.
- **New hooks go in `src/hooks/`** as `use<Name>.ts` (`.ts`, not `.tsx` unless they return JSX).
- **New API functions go in `src/services/`** — one file per backend domain (e.g. `services/hrm.ts`, `services/fleet.ts`).
- **Domain types go in `src/types/<domain>.ts`** — use `import type` when importing them. Form-local or dialog-private types stay in the component file.

---

## Routing

- Routes are declared in `App.tsx` only — no `useNavigate` for structural navigation between app sections.
- Protect all non-auth routes with `ProtectedRoute`. Public routes (login, forgot-password) use `PublicRoute` to redirect authenticated users to `/dashboard`.
- Route paths use kebab-case: `/hrm/clock-in-out`, not `/hrm/clockInOut`.

---

## Styling (Tailwind CSS 4)

- **`@import "tailwindcss"`** replaces the old three `@tailwind` directives — do not add them back.
- **No `@layer base`** — write base/reset CSS as plain rules outside any layer to avoid the PostCSS warning.
- **Reusable multi-class patterns go in `@layer components`** inside `index.css` using `@apply`:
  ```css
  /* index.css */
  @layer components {
    .card { @apply bg-white rounded-xl border border-gray-100 shadow-sm; }
    .btn-primary { @apply ... ; }
  }
  ```
- **Utility classes available in this project:** `.card`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.sidebar-link`, `.sidebar-link-active`, `.sidebar-link-inactive`, `.table-th`, `.table-td`, `.form-input`, `.status-dot`.
- **Do not use arbitrary values** (`w-[237px]`) when a standard Tailwind scale value fits.
- **Dynamic class names must be complete strings** — Tailwind v4 cannot detect `bg-${color}-500`. Use a lookup object instead:
  ```ts
  const bgMap = { red: 'bg-red-500', blue: 'bg-blue-500' }
  ```

---

## Animation

All keyframes live in `index.css`. Current animations:

| Class | Effect | Used for |
|---|---|---|
| `.skeleton` | Shimmer sweep (1.6s loop) | Skeleton loading |
| `.field-shake` | Horizontal wobble (0.4s) | Failed form validation |
| `.dialog-enter` | Slide from top + fade (0.45s spring) | Dialog/sheet open |
| `.backdrop-enter` | Fade in (0.25s) | Dialog backdrop |

- Add new keyframes in `index.css` alongside the existing ones.
- Use `onAnimationEnd` to clean up one-shot animation classes (see `shakingFields` in `Employee.tsx`).
- Prefer CSS animations over JS-driven transitions for entrance/exit effects.

---

## Skeleton Loading

Every page must use `usePageLoad()` to show a skeleton before rendering real content.

```tsx
import { usePageLoad } from '../../hooks/usePageLoad'
import { SkPageHeader, SkTable } from '../../components/ui/Skeleton'

export function MyPage() {
  const loading = usePageLoad()        // 900ms default
  if (loading) return <><SkPageHeader /><SkTable rows={8} cols={6} hasToolbar /></>
  return <div>...</div>
}
```

- Build the skeleton to match the real page's layout (same number of stat cards, same table column count, etc.).
- Add new skeleton primitives to `src/components/ui/Skeleton.tsx` — do not write one-off shimmer divs inline.

---

## Forms & Dialogs

- **Validate on submit**, not on blur — set errors in state, display inline below each field.
- **Required field errors trigger the `.field-shake` animation** — apply via `shakingFields: Set<keyof FormData>` state + `onAnimationEnd` cleanup (pattern established in `Employee.tsx`).
- **Fake API calls use `setTimeout` wrapped in a `Promise`** until real endpoints exist. Show a `Loader2` spinner in the submit button; block Cancel, backdrop click, and Escape during submission.
- **Sheet-from-top dialogs** use `fixed inset-x-0 top-0` container + `rounded-b-2xl` panel + `.dialog-enter` class. The backdrop uses `.backdrop-enter`.
- Close on Escape via `window.addEventListener('keydown', ...)` in a `useEffect` — clean up on unmount.

---

## Icons

Use **Lucide React** exclusively. Import only what you use (tree-shaken automatically by Vite):

```ts
import { Plus, Loader2, X } from 'lucide-react'
```

Standard sizes: `w-4 h-4` for inline/button icons, `w-5 h-5` for nav/header, `w-8 h-8` or `w-10 h-10` for decorative stat icons.

---

## State Management

- **Local `useState`** for UI state scoped to a single component.
- **`AuthContext`** for authentication — access via `useAuth()`. Do not read `localStorage` directly for auth state.
- **`localStorage`** is acceptable for persisting UI preferences (sidebar collapsed state, clock records). Use a namespaced key: `oceanfleet_<feature>`.
- No external state library (Redux, Zustand, etc.) — introduce one only if context + prop drilling becomes genuinely unmanageable.

---

## Verification

Before committing, run:

```bash
npx tsc --noEmit   # must produce no output (zero errors)
npm run build      # must end with ✓ built in Xms
```

The build script is `tsc -b && vite build` — TypeScript errors fail the build.

---

## Claude Session Standards

### Before Starting Any Task

1. **Read before writing** — always `Read` the target file(s) before editing. Never assume content from context alone.
2. **Check the existing pattern** — if adding a new page, read one existing page in the same domain (e.g., read `Leave.tsx` before adding a new HRM page). Match its structure exactly.
3. **Check `index.css` for existing utilities** before adding new CSS. Use `.card`, `.btn-primary`, `.table-th`, `.table-td`, `.form-input`, etc.
4. **Run `npx tsc --noEmit`** after any non-trivial change to catch type errors before they compound.

### Communication Style

- **Short responses** — one sentence per update. No trailing summaries ("I've completed X, Y, and Z"). The diff speaks.
- **State what changed, not what you did** — "Added `SkDriverCard` to `Skeleton.tsx`" not "I went ahead and added a new skeleton primitive for the driver card component".
- **Flag blockers immediately** — if a file is missing, a type is ambiguous, or a pattern is unclear, say so in one sentence before writing any code.
- **No filler** — no "Great!", "Sure!", "Of course!", or "I'll be happy to help". Start with the action.

### Code Quality Checklist

Before marking any task complete:

- [ ] Zero TypeScript errors (`npx tsc --noEmit` produces no output)
- [ ] No unused imports or variables
- [ ] No `React` default import (JSX transform handles it)
- [ ] No `React.FC` — plain named function with explicit prop interface
- [ ] All `import type` used for type-only imports
- [ ] Dynamic class names use lookup objects, not template literals
- [ ] New pages use `usePageLoad()` with a matching skeleton
- [ ] New skeleton primitives added to `Skeleton.tsx`, not inlined
- [ ] No `console.log` left in committed code
- [ ] No TODO comments — either implement it or don't

### Adding New Pages

Every new page follows this checklist:

1. Create file in correct domain folder (`hrm/`, `fleet/`, `crm/`)
2. Named export (not default)
3. `usePageLoad()` at top — return skeleton while loading
4. `PageHeader` component with title and optional action button
5. Add route in `App.tsx` inside the `ProtectedRoute` block
6. Add nav entry in `Sidebar.tsx` under correct parent
7. Run `npx tsc --noEmit` — zero errors required

### Adding New Components

- Reusable UI → `src/components/ui/`
- Layout (renders once per app) → `src/components/layout/`
- Hooks → `src/hooks/use<Name>.ts`
- Never create `utils.ts`, `helpers.ts`, or `constants.ts` unless 3+ files share the same value

### Performance

- **No premature optimization** — don't add `useMemo`/`useCallback` unless profiling shows a real problem.
- **No large deps** — check `npm ls <package>` before installing. Prefer what's already in the bundle (Lucide is tree-shaken; use it instead of a second icon library).
- **Lazy-load pages** with `React.lazy` only if the bundle analyzer shows a meaningful split is needed.

### Accessibility (minimum bar)

- All interactive elements reachable by keyboard (`tabIndex`, no `div onClick` without role)
- Form fields have associated `<label>` (use `htmlFor` + matching `id`)
- Icon-only buttons get `aria-label`
- Color is never the sole indicator of state (pair color with text or icon)

### Security

- Never interpolate user input into `dangerouslySetInnerHTML`
- Never store sensitive data (tokens, passwords) in `localStorage` — auth tokens belong in memory via `AuthContext`
- Validate and sanitize at the boundary — form inputs that reach any kind of API call must be trimmed and type-checked
- No hardcoded secrets or API keys anywhere in source

### Handling Ambiguity

- **Single-screen tasks** (add a button, fix a layout bug): proceed immediately.
- **Multi-file tasks with clear precedent** (new page that mirrors an existing one): proceed, match the pattern.
- **New patterns with no precedent** (first use of a new library, architectural change): state the approach in one sentence and ask before writing.
- **Destructive actions** (delete a file, drop a data structure, change a shared type): always confirm first regardless of how obvious it seems.

### localStorage Keys

All keys must be namespaced:

| Key | Purpose |
|---|---|
| `oceanfleet_auth` | Auth state (user object) |
| `sidebar_collapsed` | Sidebar collapse state |
| `oceanfleet_clock_records` | Clock In/Out records |
| `oceanfleet_<feature>` | Any future feature persistence |
