# Kiroku | 記録

Kiroku is an anime watch tracker I built with Next.js, PostgreSQL and Prisma. You can browse and search shows, follow the current season on a weekly calendar in your own time zone, keep a watch list with progress and ratings, group shows into collections, and see stats and recommendations based on what you have logged.

Live site: [https://kiroku-nyaa.vercel.app](https://kiroku-nyaa.vercel.app/)

## Features

- **Browsing**: search by title, and top shows ranked by popularity, currently airing, upcoming or most favourited, with paging and a jump-to-page box.
- **Show pages**: details, synopsis, trailer, characters with voice actors, related anime, recommendations from MyAnimeList users and community reviews (spoilers hidden until you ask). From here you add the show to your watch list or to a collection.
- **Season**: the current and upcoming seasons appear as a weekly calendar. Japanese broadcast slots (JST) are converted to your browser's time zone, and each show counts down to its next episode. Past seasons appear as a paged list. You can filter by title, by genre, and to shows on your watch list.
- **Watch list**: tabs for All, Watching, Plan to watch, Completed and Dropped. Each entry has a status, an episode count (capped at the show's total when it is known) and a rating from 1 to 10. Edits and removals show at once and roll back if the server rejects them.
- **Collections**: create, rename and delete collections, and add or remove shows. The show page marks the collections a show is already in and lets you create a new one on the spot.
- **Stats**: shows logged, episodes watched, an estimate of watch time from each show's episode length, a status breakdown, genre counts, a rating distribution, your average rating, episodes by status, and your favourite and most-watched shows. The charts are plain HTML and CSS.
- **For you**: up to 10 recommendations from your top three genres, weighted by your ratings. Each one says which genre or show it came from, and shows already on your list are left out.
- **Accounts**: sign in with Discord, or register with a username, email and password and sign in with either the email or the username. The profile page lets you change your username, set or change a password, link or unlink Discord, and delete your account. Discord cannot be unlinked until the account has a password and a username or email, so you cannot lock yourself out.
- **Design**: a serif, ruled-line layout with light and dark themes. The theme follows your system setting until you pick one with the toggle, and an inline script applies it before the first paint so the page does not flash.

## Stack

Versions are the ones in `package.json`.

- Next.js 16.2 (App Router) with React 19.2 and TypeScript 5
- PostgreSQL through Prisma 7.8, using the `pg` driver adapter
- NextAuth (Auth.js) 5.0.0-beta.31 with the Prisma adapter, a Discord provider and a credentials provider; sessions are JWTs and passwords are hashed with bcryptjs
- TanStack Query 5 for client data fetching and optimistic updates
- Axios 1.16 for requests to the show data API
- Tailwind CSS 4, shadcn/ui components on Radix, and Lucide icons
- Fonts: Newsreader and Shippori Mincho, loaded with `next/font/google`
- Vitest 4.1 for tests
- Umami for page-view counts, loaded by a script tag in the root layout
- Hosted on Vercel

## Architecture

**Where show data comes from.** Show data is MyAnimeList data served by Tenrai (`https://api.tenrai.org/v1`), an unofficial API that follows the Jikan v4 response schema. I switched to it after the Jikan API shut down. `src/lib/upstream.ts` is the one place that names the API, its base URL and its limits; the `jikan*` modules and types keep their names because they describe the response schema. All requests to it are made on the server.

**How requests are limited.** Every request goes through one Axios instance (`src/lib/axios.ts`) with the policy in `src/lib/jikan-client.ts` and `src/lib/jikan-policy.ts`:

- each attempt times out after 4 seconds, and a request gets 10 seconds in total across its attempts;
- up to 3 attempts, retrying only on 429, 502, 503, 504 and timeouts or dropped connections, with exponential backoff and jitter (500 ms doubling to at most 4 s);
- a `Retry-After` header on a 429 or 503 is honoured, and a 429 also holds back later requests for the same wait;
- a rate scheduler (`src/lib/rate-scheduler.ts`) spaces requests to at most 3 per 1.1 seconds and 100 per minute, below Tenrai's documented 4 per second and 120 per minute.

Search, top, genre and season requests ask for safe-for-work results only.

**What is cached.** Replies are cached on the server with Next's `unstable_cache` (`src/lib/upstream-cache.ts`, `src/lib/jikan.ts`, `src/lib/season.ts`). Errors are never stored, and empty replies are returned but not stored, so a bad moment upstream does not stick. Cache times range from 10 minutes for searches (only the first 5 pages of queries up to 50 characters) to a day for things that rarely change, such as characters and past seasons. The current season's calendar is cached for 3 hours. Loading it fetches every page of the season, and if that runs too long the page shows what loaded so far and says it is incomplete.

**What is stored.** Postgres holds users, Auth.js accounts, watch list entries, collections, and an `Anime` table of show details (title, image, episodes, genres, score, status, episode length, season) keyed by MyAnimeList id. The watch list, collections, stats and recommendations read show details from that table instead of calling the API once per entry. Missing or stale rows are refreshed lazily in a single batch request of up to 25 ids (`src/lib/anime-store.ts`). Airing shows go stale after a day and finished shows after 30 days. If the API fails, stored rows are used as they are and refreshes pause for a minute.

**Writes.** Watch list and collection writes are validated on the server (`src/lib/entry-validation.ts`): known statuses only, whole episode counts no higher than the show's total, ratings from 1 to 10 and collection names up to 60 characters. Account input is validated in `src/lib/account-validation.ts`: usernames are 3 to 20 letters, numbers or underscores, and passwords are at least 8 characters and at most 72 bytes, which is bcrypt's limit.

## Running it locally

You need Node.js 20.9 or later (the minimum for Next.js 16) and a PostgreSQL database. Discord sign-in also needs a Discord application.

1. Install dependencies. This also runs `prisma generate`.
   ```
   npm install
   ```
2. Create `.env.local` with these variables:
   - `DATABASE_URL`: the Postgres connection string
   - `AUTH_SECRET`: a long random string. Auth.js reads it itself, so it does not appear in the source.
   - `AUTH_DISCORD_ID` and `AUTH_DISCORD_SECRET`: from your Discord application. Add `http://localhost:3000/api/auth/callback/discord` as a redirect URL there.

   `prisma.config.ts` loads `.env`, not `.env.local`, so for the Prisma CLI either put `DATABASE_URL` in `.env` as well or set it in your shell.
3. Apply the migrations in `prisma/migrations/`:
   ```
   npx prisma migrate deploy
   ```
4. Start the dev server and open http://localhost:3000:
   ```
   npm run dev
   ```

## Scripts

| Script | What it runs |
| --- | --- |
| `npm run dev` | `next dev` |
| `npm run build` | `next build` |
| `npm start` | `next start` |
| `npm run lint` | `eslint` |
| `npm test` | `vitest run` |
| `postinstall` | `prisma generate` |

## Tests

`npm test` runs 256 tests in 20 files with Vitest. They cover the request policy, rate scheduler and cache wrapper, the API wrappers, season loading, broadcast times and countdowns, stored-show refreshing, stats, recommendations, and input validation. They use mocks and recorded API replies in `src/lib/fixtures/tenrai/`, so they need no database or network.

## Project structure

```
prisma/
  schema.prisma
  migrations/
public/
  og-image.webp
src/
  app/
    page.tsx              home
    anime/[id]/           show page
    search/  top/  season/
    list/                 watch list
    lists/  lists/[id]/   collections
    stats/  recommendations/  profile/
    auth/signin/  auth/error/
    api/auth/             NextAuth handler and registration
    api/anime/entry/      add to watch list
    api/user/             entries, lists, profile, password, discord, delete, stats, recommendations
    providers/            TanStack Query and session providers
  components/             shared components, with shadcn/ui primitives in ui/
  hooks/                  use-entries, use-lists
  lib/                    API client, caching, stored shows, validation, stats, recommendations, tests
  types/                  response types
```

## Known limitations

- Tenrai is an unofficial third-party API. It can change or go away, and the app depends on it for everything except the user's own records.
- Images are not optimised by Next (`images.unoptimized` in `next.config.ts`); posters load straight from MyAnimeList's CDN.
- The rate scheduler, the in-flight request sharing and the outage pause all live in one server instance's memory. Separate serverless instances do not coordinate, so several busy instances behind one IP could still go over Tenrai's limits.
- The first visit to a season that is not cached loads every page of it in turn, which can take a while; a slow API gives a partial calendar.
- The schema has a `Review` model and notes and date fields on watch list entries that the interface does not use yet.
- The Umami script in `src/app/layout.tsx` carries my site's id, so a fork should remove or replace it.

## Credits

- Show data comes from [MyAnimeList](https://myanimelist.net) through Tenrai (`https://api.tenrai.org/v1`).
- Fonts: [Newsreader](https://fonts.google.com/specimen/Newsreader) and [Shippori Mincho](https://fonts.google.com/specimen/Shippori+Mincho) from Google Fonts.

## Contact

- **Email:** [deancruzgg@gmail.com](mailto:deancruzgg@gmail.com)
- **GitHub:** [https://github.com/deancruz1](https://github.com/deancruz1)
- **LinkedIn:** [https://www.linkedin.com/in/dean-cruz/](https://www.linkedin.com/in/dean-cruz/)
- **Location:** Singapore, SG
