# Needly

Needly helps users decide what to do next and finds good nearby places.

## What it does

- Auth + onboarding
- Personalized recommendations
- Saved places
- My Day planning view
- Settings for profile, location, and preferences

## Quick start

1. Install packages:

```bash
npm install
```

2. Create `.env` in the project root:

```bash
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_URL=...
VITE_GOOGLE_MAPS_API_KEY=...
```

3. Run locally:

```bash
npm run dev
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - build for production
- `npm run preview` - preview production build
- `npm run lint` - run lint checks

## Main routes

- `/` landing page
- `/auth` sign in / sign up
- `/onboarding` profile setup
- `/dashboard` recommendations
- `/my-day` daily plan
- `/saved` saved places

## Stack

- React + TypeScript + Vite
- Tailwind CSS + Framer Motion
- Supabase (Auth, DB, Edge Functions)
- Google Maps APIs

## Notes

- DB migrations are in `supabase/migrations/`.
- Nearby place ranking logic is in `supabase/functions/places-nearby/`.
- Do not commit real secrets.
