## Goal

Rework Needly's onboarding + dashboard around the screenshots you described, add a light/dark theme system (cream-green light, blue dark), and introduce a recommendation pop-up flow with a "What's Next For You" follow-up.

---

## 1. Theme system (light = cream/green, dark = blue)

Update `src/index.css` design tokens:

- **Light mode (cream + green)**
  - `--background`: warm cream (~`40 40% 96%`)
  - `--card`: soft off-white cream
  - `--primary`: forest/sage green (~`150 45% 38%`) with `--primary-glow` lighter green
  - `--accent`: pale green tint
  - `--gradient-hero`: green gradient
  - `--gradient-soft`: cream → pale green

- **Dark mode (blue)**
  - `--background`: deep navy (~`220 40% 8%`)
  - `--card`: slightly lighter navy
  - `--primary`: vivid blue (~`220 80% 60%`) with purple-blue glow
  - `--accent`: muted blue
  - `--gradient-hero`: blue → indigo
  - `--gradient-soft`: navy → deep blue

Add a theme provider:
- New file `src/hooks/useTheme.tsx` — context + provider that toggles a `dark` class on `<html>` and persists to `localStorage` (default: light).
- Wrap `<App />` content with `ThemeProvider` in `src/App.tsx`.
- New `src/components/needly/ThemeToggle.tsx` — sun/moon icon button.
- Mount the toggle in `AppShell` header (dashboard/saved) and in `Index` + `Auth` headers.

---

## 2. Single-page onboarding

Replace the 4-step flow with one page: `src/pages/onboarding/Profile.tsx` (other onboarding routes will redirect to it; old files removed).

Form sections (all on one scrollable page, single submit):

1. **About you** — exact `age` (number input, replaces age range), primary mode of transportation (Walking / Bike / Transit / Car / Rideshare), budget ($–$$$$).
2. **Dietary restrictions** — chip multi-select (None / Vegetarian / Vegan / Gluten-free / Halal / Kosher / Dairy-free).
3. **Interests** — chip multi-select (Gym, School, Nightlife, Sporting Events, Coffee, Outdoors, Shopping, Art, Music) plus a free-text "Other interests" input.
4. **Food preferences** — chip multi-select (Fast food, American, Italian, Mexican, Asian, Mediterranean, Healthy, Desserts).
5. **What does your week look like?** — textarea for weekly routine.
6. **Location** — "Share my location" button (browser geolocation, optional / skippable).

On submit: upsert `user_profiles` with all fields and set `onboarding_completed = true`, then `navigate("/dashboard")`.

Auth flow: after sign-up, redirect to `/onboarding` (single route).

Routing changes in `src/App.tsx`:
- Replace 4 onboarding routes with one `/onboarding` → `Profile`.
- Delete `Location.tsx`, `Schedule.tsx`, `Context.tsx` files.
- Remove `OnboardingShell` step counter usage (or keep shell with no step indicator).

---

## 3. Database

The `user_profiles` table currently has `age_range text`. We need exact age + a free-text "other interests" field.

Migration:
- Add `age integer` column (nullable).
- Add `other_interests text` column (nullable).
- Keep `age_range` for backward compatibility (unused going forward).

(Existing `interests`, `food_preferences`, `dietary_restrictions`, `weekly_schedule_context`, `latitude`, `longitude`, `onboarding_completed` are reused as-is.)

---

## 4. Dashboard rework

Rebuild `src/pages/Dashboard.tsx` with two phases:

### Phase A — Recommendation pop-up (Dialog)

- On dashboard mount (or after clicking "Find what I need"), show a centered modal with the **top recommended business** card:
  - Place name, category, short reason, distance.
  - **Heart/favorite button** → inserts into `saved_places`, fills the heart, toasts "Saved".
  - **"X" close button** in the corner → closes the modal and advances to Phase B.
- Animation: modal scales/fades in.

### Phase B — "What's Next For You"

After closing the recommendation pop-up:
- Page heading: **"What's Next For You"**.
- Quick-entry option grid built from the user's `weekly_schedule_context` + `interests` (mocked client-side selection logic, e.g. show "Head to the gym", "Grab lunch", "Coffee + study", "Run errands" based on which interests they picked).
- Final option: **"None of these"** → reveals an additional row of broader options (Explore nearby, Surprise me, Quiet spot, Something new).
- Selecting any option triggers a "scan" that returns 3 recommendation cards below.

### Card entrance animation (for the result list)

Each card slides up from `y: 40, opacity: 0` to `y: 0, opacity: 1` with `duration: 0.5`, `ease: [0.22, 1, 0.36, 1]`, staggered delays `0ms / 150ms / 300ms` (top match first). Implemented with Framer Motion `initial`/`animate` + per-card `transition.delay`.

Each result card has:
- Category chip, name, reason.
- Heart favorite (saves to `saved_places`).
- Tapping the card can re-open the pop-up modal for that place (nice-to-have).

All recommendations remain mock data for now (per hackathon scope).

---

## 5. Misc polish

- Update `Index.tsx` and `Auth.tsx` to pick up the new green/blue tokens automatically (no structural changes; just add `ThemeToggle` in the header).
- `AppShell` header gets the theme toggle.
- Keep Framer Motion transitions consistent (`ease: [0.22, 1, 0.36, 1]`, ~0.4–0.5s).

---

## Files to create / edit / delete

**Create**
- `src/hooks/useTheme.tsx`
- `src/components/needly/ThemeToggle.tsx`
- `src/components/needly/RecommendationDialog.tsx` (pop-up modal)
- `src/components/needly/WhatsNext.tsx` (quick-entry options + result list with staggered animation)
- New migration: add `age int` and `other_interests text` to `user_profiles`.

**Edit**
- `src/index.css` — new light (cream/green) and dark (blue) tokens + gradients.
- `src/App.tsx` — wrap with `ThemeProvider`, collapse onboarding to one route.
- `src/pages/Auth.tsx` — redirect to `/onboarding` after signup.
- `src/pages/onboarding/Profile.tsx` — full single-page form (age int, transport, budget, diet, interests + other, food prefs, weekly routine, geolocation).
- `src/pages/Dashboard.tsx` — pop-up flow + What's Next + staggered cards.
- `src/components/needly/AppShell.tsx` and `src/pages/Index.tsx` — add `ThemeToggle`.

**Delete**
- `src/pages/onboarding/Location.tsx`
- `src/pages/onboarding/Schedule.tsx`
- `src/pages/onboarding/Context.tsx`
- `src/components/needly/OnboardingShell.tsx` (no longer needed for multi-step) — or keep it stripped down; will decide during build.
