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

2. Copy `.env.example` to `.env` in the project root and fill in your project's public Supabase settings:

```bash
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_URL=...
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

## Environment safety

- Keep `.env` and local environment files out of Git; `.gitignore` already excludes them. Commit only the placeholder `.env.example`.
- Configure `GOOGLE_MAPS_API_KEY` in the Supabase Edge Function's server-side secrets. Do not put that server key in any `VITE_` variable: Vite variables can be embedded in browser bundles. The current `places-nearby` function reads `GOOGLE_MAPS_API_KEY` on the server.
- Supabase publishable/anonymous keys are intended for client use; protect data with authentication and appropriate row-level security policies. Never put a service-role key in the frontend.
- Removing a credential from the current files does not revoke it or erase Git history. The Google Cloud project owner should review the previously committed Maps key, restrict it to the required APIs and supported application restrictions, and replace/revoke it as appropriate after checking active deployments. Also review usage and billing. Do not paste key values into issues or pull requests.
