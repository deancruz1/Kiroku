# Kiroku | 記録

A full-stack anime tracker built with Next.js and PostgreSQL. Features dual authentication, full CRUD, a seasonal broadcast calendar, personalized recommendations, and an interactive stats dashboard — powered by the Jikan API.

## Features
- **Dual authentication**: Discord OAuth and email/password registration with bcrypt hashing and JWT session tokens.
- **Full CRUD watch list**: Add anime with status tracking, update episode progress and star ratings inline, and delete entries with cascade cleanup.
- **Seasonal broadcast calendar**: 7-day grid with episode countdown timers, expand/collapse animations via Framer Motion, and genre-aware filtering.
- **Personalized recommendations**: Genre-based recommendation engine that analyzes watch history, filters out already-watched shows, and surfaces results with "Because you liked" attribution.
- **Bento-grid stats dashboard**: Spotify Wrapped-inspired layout with summary cards, a Recharts donut chart for status distribution, and dynamic genre-based color palettes.
- **Custom collections**: Create, rename, delete, and add/remove anime with per-list "already in list" indicators.
- **Anime detail pages**: Trailers, character rosters with voice actors, related anime, and community reviews with expand/collapse animations.
- **Profile settings**: Username editing, password management with current-password verification, Discord link/unlink with password-guarded unlinking, and irreversible account deletion.
- **Fully responsive**: Hamburger navigation menu, horizontal scroll rows for seasonal shows and characters, and scaled typography across mobile, tablet, and desktop.

## Technologies Used
- **Next.js 16**: App Router with React Server Components
- **TypeScript**: Type-safe development
- **Prisma**: ORM for PostgreSQL database management
- **PostgreSQL**: Relational database hosted on Supabase
- **Tailwind CSS**: Utility-first styling with shadcn/ui components
- **NextAuth.js**: Authentication with Discord OAuth and credentials provider
- **TanStack Query**: Server state management with caching and optimistic updates
- **Recharts**: Interactive charting for the stats dashboard
- **Framer Motion**: Animations for calendar expand/collapse and page transitions
- **Jikan API**: External anime data (search, seasons, characters, reviews)
- **Vercel**: Deployment with serverless functions

## Project Structure

### Root Layout (`src/app/layout.tsx`)
The root layout wraps the entire app with providers for session management and server state. It sets metadata for SEO and Open Graph, and includes the responsive navbar that appears on every page.
```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/app/providers/query-provider";
import { SessionProvider } from "@/app/providers/session-provider";
import { Navbar } from "@/components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Kiroku | Anime Watch Tracker",
    template: "%s | Kiroku",
  },
  description:
    "Track your anime, discover seasonal shows, get personalized recommendations, and visualize your watching habits.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <SessionProvider>
          <QueryProvider>
            <Navbar />
            {children}
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

### Folder Structure
```
kiroku/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── public/
│   ├── favicon.ico
│   └── og-image.webp
├── src/
│   ├── app/
│   │   ├── anime/[id]/         # Anime detail page with add, back, collection buttons, reviews section
│   │   ├── api/                # All API routes (auth, entries, lists, profile, stats, etc.)
│   │   ├── auth/               # Sign-in and error pages
│   │   ├── list/               # Watch list with CRUD tabs
│   │   ├── lists/              # Collections overview and detail pages
│   │   ├── profile/            # Profile settings
│   │   ├── recommendations/    # Personalized recommendations
│   │   ├── search/             # Search results with pagination
│   │   ├── season/             # Seasonal broadcast calendar
│   │   ├── stats/              # Bento-grid stats dashboard
│   │   ├── top/                # Top anime rankings
│   │   ├── providers/          # Query, session, and theme context providers
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── anime-card.tsx
│   │   ├── navbar.tsx          # Responsive nav with search and mobile menu
│   │   ├── pagination.tsx      # First/Prev/Next/Last with jump-to-page
│   │   ├── season-anime-card.tsx
│   │   ├── season-calendar.tsx # 7-day grid with expand/collapse animations
│   │   ├── season-content.tsx  # Season filters and controls
│   │   └── season-grid.tsx
│   ├── hooks/
│   │   └── use-entries.ts
│   ├── lib/
│   │   ├── auth.ts             # NextAuth config (Discord + credentials)
│   │   ├── axios.ts            # Axios instance with rate-limit retry logic
│   │   ├── jikan.ts            # Jikan API wrapper functions
│   │   └── prisma.ts
│   └── types/
│       └── anime.ts
├── .env
├── next.config.ts
├── package.json
├── prisma.config.ts
└── tsconfig.json
```
### Navigation Structure
The navbar includes links to:
- Home (Kiroku | 記録 logo)
- Top Shows (/top)
- Season (/season)
- Watch List (/list)
- For You (/recommendations)
- My Stats (/stats)
- Collections (/lists)
- Profile (user icon)
- Search (expandable search bar)
- Sign In / Sign Out

### Key Components
- **Navbar:** Sticky navigation with responsive breakpoints. Full labels on desktop, icons only on tablet, hamburger menu on mobile. Expandable search bar with animated icon.
- **AnimeCard:** Reusable card used across search, top shows, recommendations, and collections. Displays poster, title, rating, genre tags, and optional "Because you liked" reason text.
- **SeasonCalendar:** 7-column grid on desktop with expand/collapse per day and Framer Motion animations. Horizontal scroll rows on mobile and tablet.
- **SeasonAnimeCard:** Card variant for the seasonal calendar. Displays broadcast time, countdown timer, and tracked status badge.
- **AnimeEntryCard:** Watch list card with inline editing for status, episode count, and star rating. Displays total episode progress.
- **Pagination:** Reusable pagination component with First/Prev/Next/Last buttons and a jump-to-page input with validation.
- **AddButton:** Dropdown button on anime detail pages to add shows to watch list with status selection. Detects already-tracked shows.
- **CollectionButton:** Dropdown button to add anime to custom collections with "already in list" indicators and inline collection creation.
- **ReviewsSection:** Expandable reviews with Framer Motion animations. Shows 2 reviews initially with "Show more" functionality.

### API Routes
- api/auth/[...nextauth] - NextAuth.js catch-all handler
- api/auth/register - User registration with bcrypt hashing
- api/anime/entry - Create watch list entries
- api/user/entries/[id] - Update and delete watch list entries
- api/user/lists - Create and fetch custom collections
- api/user/lists/[id] - Rename and delete collections
- api/user/lists/[id]/anime - Add and remove anime from collections
- api/user/profile - Fetch and update user profile
- api/user/password - Change password with current-password verification
- api/user/discord - Unlink Discord account
- api/user/delete - Delete user account with cascade cleanup
- api/user/stats - Aggregated user statistics
- api/user/recommendations - Genre-based personalized recommendations

### Data Flow
- **Authentication:** NextAuth.js handles Discord OAuth and credentials login. JWT tokens stored in httpOnly cookies. Session data accessed via useSession() on the client and auth() on the server.
- **External API:** Jikan API provides all anime data (search, seasons, details, characters, reviews). Axios instance configured with base URL, timeout, and exponential backoff retry logic for rate limiting.
- **Database:** Prisma ORM manages PostgreSQL schema and queries. Models include User, Account, Session, AnimeEntry, Review, CustomList, and ListAnime.
- **Server State:** TanStack Query manages caching, background refetching, and optimistic updates for all data fetching. Cache invalidation on mutations keeps the UI in sync.

## Deployment
This website is hosted on Vercel with a Supabase PostgreSQL database. You can view the live version at:
[https://kiroku-nyaa.vercel.app](https://kiroku-nyaa.vercel.app/)

## Usage
Kiroku has the following main sections:
- **Home:** Landing page with search bar and link to browse the current season.
- **Top Shows:** Rankings filtered by popularity, airing status, or most favorited with pagination.
- **Season:** Current season anime in a 7-day broadcast calendar. Past seasons available via dropdown with grid view.
- **Watch List:** Personal anime tracking with tabs for Watching, Plan to Watch, Completed, and Dropped. Inline editing for status, episodes, and ratings.
- **For You:** Personalized recommendations based on your watch history and top genres.
- **My Stats:** Spotify Wrapped-inspired bento dashboard with total anime, watch time, top genre, favorite show, status breakdown donut chart, completion rate, and average rating.
- **Collections:** Custom groupings of anime with create, rename, delete, and image previews from your collection.
- **Anime Detail:** Complete anime information with synopsis, trailer, add-to-list buttons, recommendations, characters with voice actors, related anime, and reviews.
- **Profile:** Account settings with username editing, email display, password management, Discord link/unlink, and account deletion.

## Contact Information
If you'd like to get in touch with me, here are the best ways to reach me:
- **Email:** [deancruzgg@gmail.com](mailto:deancruzgg@gmail.com)
- **GitHub:** [https://github.com/deancruz1](https://github.com/deancruz1)
- **LinkedIn:** [https://www.linkedin.com/in/dean-cruz/](https://www.linkedin.com/in/dean-cruz/)
- **Location:** Singapore, SG
