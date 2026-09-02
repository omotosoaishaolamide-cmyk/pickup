# Pickup

Find a pickup game near you tonight. React + Vite + Supabase, installable as a PWA.

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of `supabase-schema.sql`, and run it.
3. Go to **Settings → API** and copy your **Project URL** and **anon public key**.

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the values from step 1.

## 3. Run locally

```bash
npm install
npm run dev
```

Open the printed localhost URL. Open it in two browser windows to see realtime updates between "two users."

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
gh repo create pickup --public --source=. --push
# or create a repo on github.com and:
# git remote add origin <your-repo-url>
# git push -u origin main
```

## 5. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo.
2. Vercel auto-detects Vite. Before deploying, add your environment variables under
   **Settings → Environment Variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Click **Deploy**. You'll get a live `your-project.vercel.app` URL in about a minute.

## 6. Install as an app (PWA)

The PWA plugin is already wired up in `vite.config.js`. Once deployed, visiting the site on a
phone and choosing "Add to Home Screen" (iOS Safari) or the install prompt (Android Chrome)
will install it like a native app. Drop your own icons at `public/icon-192.png` and
`public/icon-512.png` before shipping — placeholders aren't included.

## 7. Custom domain (optional)

Buy a domain (Namecheap, Cloudflare, etc.), then in Vercel go to **Settings → Domains** and
add it — Vercel walks you through the DNS records.

## Notes on this MVP

- Profile (name/sport/skill) is stored in the browser's `localStorage` — it's per-device, not a
  real account system. Add Supabase Auth when you want people to have accounts across devices.
- RLS policies in `supabase-schema.sql` are wide open (anyone can read/write) to keep the MVP
  simple. Before real launch, tighten them — e.g. only the joining user can add themselves to
  `joined`.
- Location is free-text, not geocoded. Real geolocation/maps is the natural next step once you
  validate people actually want this.
