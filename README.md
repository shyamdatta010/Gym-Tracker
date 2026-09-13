# Iron Log — deploy this to get a shareable link

This folder is a complete, self-contained web app. It needs no build step,
no backend, and no database — just static files. Once it's hosted anywhere,
your friends can open the link, and optionally "install" it to their home
screen like a real app.

## Fastest way to get a live link (no account needed)

1. Go to **https://app.netlify.com/drop**
2. Drag this whole folder onto the page.
3. Netlify gives you a live URL in a few seconds (e.g. `random-name-123.netlify.app`).
4. Share that link. Done.

That link is permanent as long as the Netlify Drop site exists (it's free,
no time limit, but it is anonymous — if you want to edit it later or keep
it under your control long-term, use one of the options below instead).

## Better for long-term ownership (still free)

**Option A — Netlify (with an account)**
1. Sign up at netlify.com (free).
2. "Add new site" → "Deploy manually" → drag this folder in.
3. You get a link you can rename and redeploy anytime.

**Option B — GitHub Pages**
1. Create a new GitHub repo, upload these files to it.
2. Repo Settings → Pages → set source to the `main` branch, root folder.
3. GitHub gives you a link like `yourname.github.io/repo-name`.

**Option C — Vercel**
1. Sign up at vercel.com (free).
2. "Add New Project" → drag/upload this folder (or connect the GitHub repo).
3. You get a `your-project.vercel.app` link.

Any of these work equally well — pick whichever you're comfortable with.

## What your friends will experience

- Open the link in any mobile or desktop browser.
- On phones, the browser will offer "Add to Home Screen" (Android/Chrome)
  or they can do it manually via the Share menu (iPhone/Safari) — this
  installs it like a real app icon, launching full-screen with no browser bar.
- After the first visit, the app is cached by a service worker, so it keeps
  working with **no internet connection at all** — true airplane-mode use.
- Each person's data lives only in their own browser (`localStorage`) —
  nobody shares a workout log with anybody else. No accounts, no sign-in.

## Important note on data

Because everyone's data is local to their own device/browser, there's no
sync between devices or people. If your friend clears their browser data
or switches phones, their history is gone unless they used
Settings → Export data first. That's the trade-off for "fully offline,
no account, no server" — it's the same privacy model the in-Claude version had.

## Files in this folder

- `index.html` — the page shell (loads React + this app)
- `app.jsx` — the entire app (all screens, logic, styling)
- `manifest.json` — makes it installable as a PWA
- `sw.js` — service worker, enables true offline use after first load
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — app icons
