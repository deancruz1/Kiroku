import { BROADCAST_TIME_ZONE } from "@/lib/broadcast";
import { genreKind } from "@/lib/mal-genres";
import { MAL_NAME } from "@/lib/upstream";
import type { SeasonAnime } from "@/lib/season";
import type { JikanCharacter, JikanRecommendation } from "@/types/anime";

interface MalPicture {
  medium?: string;
  large?: string;
}

// v2 leaves a key out when the value is unknown, so every field is optional.
export interface MalNode {
  id: number;
  title: string;
  main_picture?: MalPicture;
  alternative_titles?: { synonyms?: string[]; en?: string; ja?: string };
  start_date?: string;
  end_date?: string;
  synopsis?: string;
  background?: string;
  mean?: number;
  genres?: { id: number; name: string }[];
  media_type?: string;
  status?: string;
  num_episodes?: number;
  start_season?: { year: number; season: string };
  broadcast?: { day_of_the_week?: string; start_time?: string };
  average_episode_duration?: number;
  rating?: string;
  studios?: { id: number; name: string }[];
  related_anime?: {
    node: MalNode;
    relation_type: string;
    relation_type_formatted?: string;
  }[];
  recommendations?: { node: MalNode; num_recommendations: number }[];
  videos?: { id: number; title: string; url: string; thumbnail?: string }[];
}

export interface MalPaging {
  next?: string;
  previous?: string;
}

export interface MalCharacterEdge {
  node: {
    id: number;
    first_name?: string;
    last_name?: string;
    main_picture?: MalPicture;
  };
  role?: string;
}

// Things this source cannot supply. A caller shows them as unavailable
// instead of empty.
export type MalGap =
  | "reviews"
  | "voiceActors"
  | "total"
  | "lastPage"
  | "page"
  | "query"
  | "episodeVideos"
  | "musicVideos";

export interface FromMal {
  source: "mal";
  unavailable: MalGap[];
}

export function fromMal<T extends object>(value: T, unavailable: MalGap[] = []): T & FromMal {
  return { ...value, source: "mal", unavailable };
}

// For pages, which get either source's reply from the same function.
export function isUnavailable(value: unknown, gap: MalGap) {
  return (
    !!value &&
    typeof value === "object" &&
    "unavailable" in value &&
    Array.isArray(value.unavailable) &&
    value.unavailable.includes(gap)
  );
}

export class MalShapeError extends Error {
  constructor() {
    super(`Unexpected response from ${MAL_NAME}`);
    this.name = "MalShapeError";
  }
}

export function readNode(data: unknown): MalNode {
  const node = data as MalNode | null;
  if (!node || typeof node !== "object" || typeof node.id !== "number") {
    throw new MalShapeError();
  }
  return node;
}

// List replies wrap each row as { node }. Rows without an id are dropped.
export function readList(data: unknown): { nodes: MalNode[]; paging: MalPaging } {
  const body = data as { data?: unknown; paging?: MalPaging } | null;
  if (!body || !Array.isArray(body.data)) throw new MalShapeError();
  const nodes = (body.data as { node?: MalNode }[])
    .map((row) => row?.node)
    .filter((node): node is MalNode => typeof node?.id === "number");
  return { nodes, paging: body.paging ?? {} };
}

export function readCharacters(data: unknown): {
  edges: MalCharacterEdge[];
  paging: MalPaging;
} {
  const body = data as { data?: unknown; paging?: MalPaging } | null;
  if (!body || !Array.isArray(body.data)) throw new MalShapeError();
  const edges = (body.data as MalCharacterEdge[]).filter(
    (edge) => typeof edge?.node?.id === "number",
  );
  return { edges, paging: body.paging ?? {} };
}

// The strings below are the ones Tenrai sends, checked against its replies.
const STATUS = new Map([
  ["finished_airing", "Finished Airing"],
  ["currently_airing", "Currently Airing"],
  ["not_yet_aired", "Not yet aired"],
]);

const MEDIA_TYPE = new Map([
  ["tv", "TV"],
  ["ona", "ONA"],
  ["ova", "OVA"],
  ["movie", "Movie"],
  ["special", "Special"],
  ["tv_special", "TV Special"],
  ["music", "Music"],
  ["pv", "PV"],
  ["cm", "CM"],
]);

const RATING = new Map([
  ["g", "G - All Ages"],
  ["pg", "PG - Children"],
  ["pg_13", "PG-13 - Teens 13 or older"],
  ["r", "R - 17+ (violence & profanity)"],
  ["r+", "R+ - Mild Nudity"],
  ["rx", "Rx - Hentai"],
]);

const RELATION = new Map([
  ["sequel", "Sequel"],
  ["prequel", "Prequel"],
  ["alternative_setting", "Alternative Setting"],
  ["alternative_version", "Alternative Version"],
  ["side_story", "Side Story"],
  ["parent_story", "Parent Story"],
  ["summary", "Summary"],
  ["full_story", "Full Story"],
  ["spin_off", "Spin-Off"],
  ["character", "Character"],
  ["other", "Other"],
]);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const WEEKDAYS = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

// Rankings ignore the nsfw parameter, and search and season are asked with
// nsfw=true so all-ages "gray" shows are not lost. Dropping these two ratings
// gives the same season set as Tenrai's sfw filter.
const UNLISTED_RATINGS = new Set(["r+", "rx"]);

export function isListed(node: Pick<MalNode, "rating">) {
  return !node.rating || !UNLISTED_RATINGS.has(node.rating);
}

export interface MalNamed {
  mal_id: number;
  type: "anime";
  name: string;
}

interface DateProp {
  day: number | null;
  month: number | null;
  year: number | null;
}

export type MalAnime = SeasonAnime & {
  aired: SeasonAnime["aired"] & {
    prop: { from: DateProp; to: DateProp };
    string: string | null;
  };
  broadcast: SeasonAnime["broadcast"] & {
    timezone: string | null;
    string: string | null;
  };
  duration: string;
  rating: string | null;
  background: string | null;
  genres: MalNamed[];
  explicit_genres: MalNamed[];
  themes: MalNamed[];
  demographics: MalNamed[];
  studios: MalNamed[];
};

// v2 sends one file per picture, usually .jpg. It goes in both slots rather
// than guessing at a .webp or small variant that may not exist.
export function imageSet(picture: MalPicture | undefined) {
  const image = picture?.medium ?? picture?.large ?? "";
  const large = picture?.large ?? image;
  const set = { image_url: image, small_image_url: image, large_image_url: large };
  return { jpg: { ...set }, webp: { ...set } };
}

const UNKNOWN_DATE: DateProp = { day: null, month: null, year: null };

// v2 dates are "2026-10-02", "2027-10" or "2027".
function parseDate(value: string | undefined): DateProp | null {
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value ?? "");
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: match[2] ? Number(match[2]) : null,
    day: match[3] ? Number(match[3]) : null,
  };
}

// Jikan writes full dates as midnight UTC and keeps partial dates as sent.
function airedValue(value: string, prop: DateProp) {
  return prop.day ? `${value}T00:00:00+00:00` : value;
}

function formatDate({ day, month, year }: DateProp) {
  if (!month) return `${year}`;
  return day ? `${MONTHS[month - 1]} ${day}, ${year}` : `${MONTHS[month - 1]} ${year}`;
}

function mapAired(node: MalNode): MalAnime["aired"] {
  const from = parseDate(node.start_date);
  const end = parseDate(node.end_date);
  // A one-day release has the same start and end; Jikan lists only the start.
  const sameDay = !!from && !!end && node.start_date === node.end_date;
  const to = sameDay ? null : end;
  const single = node.num_episodes === 1 || node.media_type === "movie";

  let text: string | null = null;
  if (from) {
    if (to) text = `${formatDate(from)} to ${formatDate(to)}`;
    else if (sameDay || single) text = formatDate(from);
    else text = `${formatDate(from)} to ?`;
  }

  return {
    from: from ? airedValue(node.start_date!, from) : null,
    to: to ? airedValue(node.end_date!, to) : null,
    prop: { from: from ?? { ...UNKNOWN_DATE }, to: to ?? { ...UNKNOWN_DATE } },
    string: text,
  };
}

// Jikan's text for the same values: "24 min per ep", "24 min", "1 hr 46 min".
// Minutes are rounded down, which matched Jikan on every show compared.
export function formatDuration(seconds: number | undefined, episodes: number | undefined) {
  if (!seconds || seconds <= 0) return "Unknown";
  let text: string;
  if (seconds < 60) {
    text = `${seconds} sec`;
  } else {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    text = [hours ? `${hours} hr` : "", minutes % 60 ? `${minutes % 60} min` : ""]
      .filter(Boolean)
      .join(" ");
  }
  return episodes && episodes > 1 ? `${text} per ep` : text;
}

// v2 times are Japan time with no zone given. "other" is not a weekday.
function mapBroadcast(broadcast: MalNode["broadcast"]): MalAnime["broadcast"] {
  const day = broadcast?.day_of_the_week?.toLowerCase();
  if (!day || !WEEKDAYS.has(day)) {
    return { day: null, time: null, timezone: null, string: null };
  }
  const label = `${day[0].toUpperCase()}${day.slice(1)}s`;
  const time = broadcast?.start_time || null;
  return {
    day: label,
    time,
    timezone: BROADCAST_TIME_ZONE,
    string: time ? `${label} at ${time} (JST)` : null,
  };
}

function splitGenres(genres: MalNode["genres"]) {
  const lists: Record<"genres" | "themes" | "demographics", MalNamed[]> = {
    genres: [],
    themes: [],
    demographics: [],
  };
  for (const genre of genres ?? []) {
    lists[genreKind(genre.id)].push({ mal_id: genre.id, type: "anime", name: genre.name });
  }
  return lists;
}

export function mapMalAnime(node: MalNode): MalAnime {
  const { genres, themes, demographics } = splitGenres(node.genres);
  return {
    mal_id: node.id,
    title: node.title,
    title_english: node.alternative_titles?.en || null,
    title_japanese: node.alternative_titles?.ja || null,
    images: imageSet(node.main_picture),
    type: MEDIA_TYPE.get(node.media_type ?? "") ?? null,
    synopsis: node.synopsis || null,
    background: node.background || null,
    // 0 means unknown for episodes.
    episodes: node.num_episodes || null,
    status: STATUS.get(node.status ?? "") ?? "",
    aired: mapAired(node),
    duration: formatDuration(node.average_episode_duration, node.num_episodes),
    rating: RATING.get(node.rating ?? "") ?? null,
    score: typeof node.mean === "number" ? node.mean : null,
    season: node.start_season?.season ?? null,
    year: node.start_season?.year ?? null,
    broadcast: mapBroadcast(node.broadcast),
    studios: (node.studios ?? []).map((s) => ({ mal_id: s.id, type: "anime", name: s.name })),
    genres,
    explicit_genres: [],
    themes,
    demographics,
  };
}

export function mapMalRecommendations(node: MalNode): JikanRecommendation[] {
  return (node.recommendations ?? []).map((rec) => ({
    entry: {
      mal_id: rec.node.id,
      title: rec.node.title,
      images: imageSet(rec.node.main_picture),
    },
    votes: rec.num_recommendations,
  }));
}

export interface MalRelationGroup {
  relation: string;
  entry: { mal_id: number; type: "anime"; name: string }[];
}

// v2 sends one row per related show; Jikan groups them by relation. Groups
// keep the order in which v2 first names them.
export function mapMalRelations(node: MalNode): MalRelationGroup[] {
  const groups = new Map<string, MalRelationGroup>();
  for (const rel of node.related_anime ?? []) {
    const label =
      RELATION.get(rel.relation_type) ?? rel.relation_type_formatted ?? rel.relation_type;
    let group = groups.get(label);
    if (!group) {
      group = { relation: label, entry: [] };
      groups.set(label, group);
    }
    group.entry.push({ mal_id: rel.node.id, type: "anime", name: rel.node.title });
  }
  return [...groups.values()];
}

export interface MalPromo {
  title: string;
  trailer: {
    youtube_id: string;
    url: string;
    embed_url: null;
    images: { medium_image_url: string | null; large_image_url: null };
  };
}

export interface MalVideos {
  promo: MalPromo[];
  episodes: never[];
  music_videos: never[];
}

const YOUTUBE_ID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/))([\w-]{11})/;

// v2 gives a youtu.be link and a medium thumbnail. The large thumbnail is
// left empty so the page uses its own fallback.
export function mapMalVideos(node: MalNode): MalVideos {
  const promo: MalPromo[] = [];
  for (const video of node.videos ?? []) {
    const id = YOUTUBE_ID.exec(video.url ?? "")?.[1];
    if (!id) continue;
    promo.push({
      title: video.title,
      trailer: {
        youtube_id: id,
        url: video.url,
        embed_url: null,
        images: { medium_image_url: video.thumbnail ?? null, large_image_url: null },
      },
    });
  }
  return { promo, episodes: [], music_videos: [] };
}

// Jikan writes names as "Last, First", or one name alone.
export function characterName(first: string | undefined, last: string | undefined) {
  const given = first?.trim();
  const family = last?.trim();
  if (given && family) return `${family}, ${given}`;
  return family || given || "";
}

// v2 lists characters by id. Jikan lists main characters first, then the
// rest, each group by name.
export function mapMalCharacters(edges: MalCharacterEdge[]): JikanCharacter[] {
  const characters = edges.map((edge) => {
    const image = edge.node.main_picture?.medium ?? edge.node.main_picture?.large ?? "";
    return {
      character: {
        mal_id: edge.node.id,
        name: characterName(edge.node.first_name, edge.node.last_name),
        images: { jpg: { image_url: image }, webp: { image_url: image } },
      },
      role: edge.role ?? "",
      voice_actors: [],
    };
  });
  const rank = (role: string) => (role === "Main" ? 0 : 1);
  return characters.sort(
    (a, b) =>
      rank(a.role) - rank(b.role) || a.character.name.localeCompare(b.character.name, "en"),
  );
}
