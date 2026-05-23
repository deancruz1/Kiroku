Built to consolidate anime tracking into a single responsive web app. Integrates external API data with a persistent PostgreSQL database on Supabase.

• Implemented dual authentication with Discord OAuth for quick sign-in and email/password registration using bcrypt hashing and JWT session tokens.

• Built full CRUD operations for watch list management: add anime with status tracking, update episode progress and star ratings inline, and delete entries with cascade cleanup.

• Developed a 7-day seasonal broadcast calendar with episode countdown timers, expand/collapse animations via Framer Motion, broadcast time sorting, and genre-aware filtering with a tracked-only toggle that cross-references the user's watch list.

• Created a personalized recommendation engine that analyzes watch history against genre data, queries the Jikan API, filters out already-watched shows and anything rated below 7, and surfaces results with "Because you liked" attribution.

• Visualized user stats with a Spotify Wrapped-inspired bento-grid layout featuring summary cards for total anime, episodes watched, watch time, average rating, and completion rate, plus a Recharts donut chart for status distribution, all with dynamic genre-based color palettes and personality-driven copy.

• Built custom collections with create, rename, delete, and add/remove functionality including per-list "already in list" indicators and animated card removal.

• Designed each anime detail page to pull extensive data via parallel API requests: trailers, character rosters with voice actors, related anime, and community reviews with expand/collapse animations

• Built a profile settings page with username editing, email display, password management with current-password verification, Discord link/unlink with password-guarded unlinking to prevent lockout, and irreversible account deletion with confirmation input.

• Handled all edge cases including Jikan API rate limiting with exponential backoff retry logic, duplicate entry prevention with database constraints, broadcast data parsing for both "Friday" and "Fridays" formats, and passwordless Discord accounts with guarded unlinking.

• Made the entire app fully responsive across mobile, tablet, and desktop with a hamburger navigation menu, horizontal scroll rows for seasonal shows and characters, a collapsible bento grid, and scaled typography and spacing throughout.

• Deployed on Vercel with a serverless-friendly architecture using the pg driver adapter, Prisma 7, and environment-based configuration for all third-party services including Discord OAuth, Supabase, and the Jikan API.
