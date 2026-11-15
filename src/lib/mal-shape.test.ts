import { describe, expect, it, vi } from "vitest";
import tenraiShows from "@/lib/fixtures/tenrai/compare-shows.json";
import tenraiUpcoming from "@/lib/fixtures/tenrai/top-upcoming-p1.json";
import tenraiGenres from "@/lib/fixtures/tenrai/genres-anime.json";
import tenraiRelations from "@/lib/fixtures/tenrai/fmab-5114-relations.json";
import tenraiVideos from "@/lib/fixtures/tenrai/fmab-5114-videos.json";
import tenraiRecommendations from "@/lib/fixtures/tenrai/fmab-5114-recommendations.json";
import tenraiCharacters from "@/lib/fixtures/tenrai/fmab-5114-characters.json";
import onePiece from "@/lib/fixtures/mal/details-21-long-runner.json";
import fmab from "@/lib/fixtures/mal/details-5114-finished.json";
import fmabVideos from "@/lib/fixtures/mal/details-5114-videos.json";
import yourName from "@/lib/fixtures/mal/details-32281-movie.json";
import spyFamily from "@/lib/fixtures/mal/details-50265-empty-english.json";
import frieren from "@/lib/fixtures/mal/details-52991-finished.json";
import apothecary from "@/lib/fixtures/mal/details-61987-show-page.json";
import golden from "@/lib/fixtures/mal/details-63816-2027-10.json";
import dandadan from "@/lib/fixtures/mal/details-62516-2027.json";
import bocchi from "@/lib/fixtures/mal/details-61006-no-date.json";
import chainsaw from "@/lib/fixtures/mal/details-63143-type-unknown.json";
import fmabCharacters from "@/lib/fixtures/mal/characters-5114-p1.json";
import frierenCharacters from "@/lib/fixtures/mal/characters-52991-fields.json";
import { THEMES, genreKind, isKnownGenreId } from "@/lib/mal-genres";
import {
  MalShapeError,
  characterName,
  formatDuration,
  isListed,
  mapMalAnime,
  mapMalCharacters,
  mapMalRecommendations,
  mapMalRelations,
  mapMalVideos,
  readCharacters,
  readList,
  readNode,
  type MalNode,
} from "@/lib/mal-shape";
import { mapJikanAnime, parseDurationMinutes, isStale } from "@/lib/anime-shape";
import { getNextEpisode, getWeeklySlot, isFinishedAiring } from "@/lib/broadcast";
import { belongsOnCalendar, toSeasonAnime, type SeasonAnime } from "@/lib/season";

vi.mock("@/lib/axios", () => ({ jikanApi: { get: vi.fn() } }));

type TenraiShow = (typeof tenraiShows.data)[number];

const PAIRS: [MalNode, number][] = [
  [onePiece, 21],
  [fmab, 5114],
  [yourName, 32281],
  [spyFamily, 50265],
  [frieren, 52991],
  [apothecary, 61987],
];

function tenrai(id: number): TenraiShow {
  return tenraiShows.data.find((a) => a.mal_id === id)!;
}

const ids = (list: { mal_id: number }[]) => list.map((g) => g.mal_id);

// Everything the app reads from a show, in the Tenrai shape.
function comparable(a: {
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string | null;
  episodes: number | null;
  status: string;
  aired: { from: string | null; to: string | null; prop?: unknown; string?: string | null };
  duration: string;
  rating: string | null;
  score: number | null;
  season: string | null;
  year: number | null;
  broadcast: unknown;
  studios: { mal_id: number; name: string }[];
  genres: { mal_id: number; name: string }[];
  explicit_genres: { mal_id: number }[];
  themes: { mal_id: number }[];
  demographics: { mal_id: number }[];
  synopsis: string | null;
}) {
  return {
    title: a.title,
    title_english: a.title_english,
    title_japanese: a.title_japanese,
    type: a.type,
    episodes: a.episodes,
    status: a.status,
    aired: a.aired,
    duration: a.duration,
    rating: a.rating,
    score: a.score,
    season: a.season,
    year: a.year,
    broadcast: a.broadcast,
    studios: a.studios.map((s) => ({ mal_id: s.mal_id, name: s.name })),
    genres: a.genres.map((g) => ({ mal_id: g.mal_id, name: g.name })),
    explicit_genres: ids(a.explicit_genres),
    themes: ids(a.themes),
    demographics: ids(a.demographics),
    synopsis: a.synopsis,
  };
}

describe("mapMalAnime against Tenrai", () => {
  it.each(PAIRS)("maps v2 show %# to the same fields Tenrai has", (node, id) => {
    const mapped = comparable(mapMalAnime(node));
    const expected = comparable(tenrai(id));
    expect(mapped).toEqual(expected);
  });

  it("differs from Tenrai only in the picture file type and small size", () => {
    for (const [node, id] of PAIRS) {
      const mapped = mapMalAnime(node);
      const images = tenrai(id).images;
      // v2 sends one file per picture; Tenrai offers jpg and webp in three sizes.
      expect(mapped.images.jpg.large_image_url).toBe(node.main_picture!.large);
      expect(mapped.images.webp.large_image_url).toBe(node.main_picture!.large);
      expect(mapped.images.webp.image_url).toBe(node.main_picture!.medium);
      const sameFile = (url: string) => url.replace(/\.(jpg|webp)$/, "");
      expect(sameFile(mapped.images.webp.large_image_url)).toBe(
        sameFile(images.webp.large_image_url),
      );
      expect(sameFile(mapped.images.jpg.image_url)).toBe(sameFile(images.jpg.image_url));
    }
  });

  it("stores the same row as Tenrai apart from the picture URL", () => {
    const now = new Date("2026-11-16T00:00:00Z");
    for (const [node, id] of PAIRS) {
      const fromMal = mapJikanAnime(mapMalAnime(node), now);
      const fromTenrai = mapJikanAnime(tenrai(id), now);
      expect({ ...fromMal, imageUrl: null }).toEqual({ ...fromTenrai, imageUrl: null });
      expect(fromMal.imageUrl).toBe(node.main_picture!.large);
    }
  });
});

describe("unknown and partial values", () => {
  const upcoming = (id: number) => tenraiUpcoming.data.find((a) => a.mal_id === id)!;

  it.each([
    [golden, 63816],
    [dandadan, 62516],
    [bocchi, 61006],
    [chainsaw, 63143],
  ] as [MalNode, number][])("maps not-yet-aired show %# as Tenrai does", (node, id) => {
    const mapped = mapMalAnime(node);
    const expected = upcoming(id);
    expect({
      type: mapped.type,
      episodes: mapped.episodes,
      status: mapped.status,
      aired: mapped.aired,
      duration: mapped.duration,
      rating: mapped.rating,
      score: mapped.score,
      season: mapped.season,
      year: mapped.year,
      broadcast: mapped.broadcast,
    }).toEqual({
      type: expected.type,
      episodes: expected.episodes,
      status: expected.status,
      aired: expected.aired,
      duration: expected.duration,
      rating: expected.rating,
      score: expected.score,
      season: expected.season,
      year: expected.year,
      broadcast: expected.broadcast,
    });
  });

  it("maps 0 episodes, 0 seconds, an empty English title and missing keys to unknown", () => {
    const mapped = mapMalAnime({
      id: 1,
      title: "Show",
      alternative_titles: { en: "", ja: "" },
      num_episodes: 0,
      average_episode_duration: 0,
    });
    expect(mapped).toMatchObject({
      title_english: null,
      title_japanese: null,
      episodes: null,
      duration: "Unknown",
      score: null,
      rating: null,
      type: null,
      season: null,
      year: null,
      synopsis: null,
      aired: { from: null, to: null, string: null },
      broadcast: { day: null, time: null, timezone: null, string: null },
    });
    expect(mapped.images.webp.large_image_url).toBe("");
  });

  it("leaves titles and synopses exactly as sent", () => {
    expect(mapMalAnime(fmab).synopsis).toBe(fmab.synopsis);
    expect(mapMalAnime(spyFamily).title_japanese).toBe(spyFamily.alternative_titles.ja);
  });
});

describe("status, type and rating strings", () => {
  const map = (fields: Partial<MalNode>) => mapMalAnime({ id: 1, title: "x", ...fields });

  it("uses the strings the app compares against", () => {
    expect(map({ status: "finished_airing" }).status).toBe("Finished Airing");
    expect(map({ status: "currently_airing" }).status).toBe("Currently Airing");
    expect(map({ status: "not_yet_aired" }).status).toBe("Not yet aired");

    const types = ["tv", "ona", "ova", "movie", "special", "tv_special", "music", "pv", "cm", "unknown"];
    expect(types.map((t) => map({ media_type: t }).type)).toEqual([
      "TV", "ONA", "OVA", "Movie", "Special", "TV Special", "Music", "PV", "CM", null,
    ]);

    const ratings = ["g", "pg", "pg_13", "r", "r+", "rx"];
    expect(ratings.map((r) => map({ rating: r }).rating)).toEqual([
      "G - All Ages",
      "PG - Children",
      "PG-13 - Teens 13 or older",
      "R - 17+ (violence & profanity)",
      "R+ - Mild Nudity",
      "Rx - Hentai",
    ]);
  });

  it("works with isStale and the airing helpers", () => {
    const now = new Date("2026-11-16T00:00:00Z");
    const fetchedAt = new Date("2026-11-10T00:00:00Z");
    expect(isStale({ status: mapMalAnime(fmab).status, fetchedAt }, now)).toBe(false);
    expect(isStale({ status: mapMalAnime(apothecary).status, fetchedAt }, now)).toBe(true);
    expect(isFinishedAiring(mapMalAnime(fmab), now)).toBe(true);
    expect(getNextEpisode(mapMalAnime(apothecary), now)).toEqual(
      getNextEpisode(tenrai(61987), now),
    );
  });
});

describe("dates, duration and broadcast", () => {
  const map = (fields: Partial<MalNode>) => mapMalAnime({ id: 1, title: "x", ...fields });

  it("writes Jikan's aired text", () => {
    expect(map({ start_date: "2026-10-02", num_episodes: 12 }).aired.string).toBe("Oct 2, 2026 to ?");
    expect(map({ start_date: "2027-10" }).aired.string).toBe("Oct 2027 to ?");
    expect(map({ start_date: "2027", media_type: "movie", num_episodes: 1 }).aired.string).toBe("2027");
    expect(map({ start_date: "2009-04-05", end_date: "2010-07-04" }).aired.string).toBe(
      "Apr 5, 2009 to Jul 4, 2010",
    );
    // A season released on one day is shown as one date, like a movie.
    const oneDay = map({ start_date: "2026-10-20", end_date: "2026-10-20", num_episodes: 10 });
    expect(oneDay.aired).toMatchObject({ string: "Oct 20, 2026", to: null });
  });

  it("keeps partial dates as Jikan does", () => {
    const aired = map({ start_date: "2027-10" }).aired;
    expect(aired.from).toBe("2027-10");
    expect(aired.prop.from).toEqual({ day: null, month: 10, year: 2027 });
    expect(getNextEpisode({ ...map({ start_date: "2027-10" }), status: "Not yet aired" }, new Date())).toBeNull();
  });

  it("rounds minutes down", () => {
    expect(formatDuration(1470, 28)).toBe("24 min per ep");
    expect(formatDuration(1440, 0)).toBe("24 min");
    expect(formatDuration(6391, 1)).toBe("1 hr 46 min");
    expect(formatDuration(7200, 1)).toBe("2 hr");
    expect(formatDuration(45, 12)).toBe("45 sec per ep");
    expect(parseDurationMinutes(formatDuration(1470, 28))).toBe(24);
  });

  it("gives the broadcast in Japan time and drops 'other'", () => {
    expect(map({ broadcast: { day_of_the_week: "friday", start_time: "23:00" } }).broadcast).toEqual({
      day: "Fridays",
      time: "23:00",
      timezone: "Asia/Tokyo",
      string: "Fridays at 23:00 (JST)",
    });
    expect(map({ broadcast: { day_of_the_week: "other", start_time: "12:00" } }).broadcast.day).toBeNull();
    expect(getWeeklySlot(mapMalAnime(apothecary).broadcast)).toEqual(
      getWeeklySlot(tenrai(61987).broadcast),
    );
  });
});

describe("genre split", () => {
  it("matches Tenrai's genre lists exactly", () => {
    const expectKind = (list: { mal_id: number }[], kind: string) =>
      expect(list.filter((g) => genreKind(g.mal_id) !== kind)).toEqual([]);
    expectKind(tenraiGenres.genres, "genres");
    expectKind(tenraiGenres.explicit_genres, "genres");
    expectKind(tenraiGenres.themes, "themes");
    expectKind(tenraiGenres.demographics, "demographics");

    const all = Object.values(tenraiGenres).flat();
    expect(all.every((g) => isKnownGenreId(g.mal_id))).toBe(true);
    expect(new Set(all.map((g) => g.mal_id)).size).toBe(all.length);
    expect(THEMES.size).toBe(tenraiGenres.themes.length);
  });

  it("treats an unknown id as a theme", () => {
    expect(genreKind(999)).toBe("themes");
  });

  it("keeps themes and demographics out of genres", () => {
    const mapped = mapMalAnime(fmab);
    expect(mapped.genres.map((g) => g.name)).toEqual(["Action", "Adventure", "Drama", "Fantasy"]);
    expect(mapped.themes.map((g) => g.name)).toEqual(["Military"]);
    expect(mapped.demographics.map((g) => g.name)).toEqual(["Shounen"]);
  });
});

describe("details extras", () => {
  it("maps recommendations with their votes", () => {
    const recs = mapMalRecommendations(fmab);
    expect(recs).toHaveLength(10);
    expect(recs[0]).toEqual({
      entry: {
        mal_id: 11061,
        title: "Hunter x Hunter (2011)",
        images: expect.objectContaining({
          webp: expect.objectContaining({
            large_image_url: "https://cdn.myanimelist.net/images/anime/1337/99013l.jpg",
          }),
        }),
      },
      votes: 79,
    });
    // Tenrai counts a day older, so votes are close but not equal.
    const tenraiTop = tenraiRecommendations.data.slice(0, 2).map((r) => r.entry.mal_id);
    expect(recs.slice(0, 2).map((r) => r.entry.mal_id)).toEqual(tenraiTop);
  });

  it("groups relations under Tenrai's labels", () => {
    const groups = mapMalRelations(fmab);
    const byLabel = (list: { relation: string; entry: { mal_id: number }[] }[]) =>
      Object.fromEntries(list.map((g) => [g.relation, ids(g.entry).sort()]));
    const tenraiAnime = tenraiRelations.data
      .map((g) => ({ ...g, entry: g.entry.filter((e) => e.type === "anime") }))
      .filter((g) => g.entry.length > 0);

    expect(byLabel(groups)).toEqual(byLabel(tenraiAnime));
    // Group order follows v2, which differs from Tenrai's.
    expect(groups.map((g) => g.relation)).toEqual(["Alternative Version", "Side Story", "Spin-Off"]);
    expect(groups[1].entry[0]).toEqual({
      mal_id: 6421,
      type: "anime",
      name: "Fullmetal Alchemist: Brotherhood Specials",
    });
  });

  it("uses Tenrai's label for every relation type v2 sends", () => {
    const relation = (type: string) =>
      mapMalRelations({
        id: 1,
        title: "x",
        related_anime: [{ node: { id: 2, title: "y" }, relation_type: type }],
      })[0].relation;
    expect(
      ["sequel", "prequel", "alternative_setting", "parent_story", "summary", "full_story", "character", "other"].map(relation),
    ).toEqual(["Sequel", "Prequel", "Alternative Setting", "Parent Story", "Summary", "Full Story", "Character", "Other"]);
  });

  it("maps the videos to the promo list Tenrai has", () => {
    const videos = mapMalVideos(fmabVideos);
    expect(videos.promo.map((v) => [v.title, v.trailer.youtube_id])).toEqual(
      tenraiVideos.data.promo.map((v) => [v.title, v.trailer.youtube_id]),
    );
    expect(videos.promo[0].trailer.images.large_image_url).toBeNull();
    expect(videos.promo[0].trailer.images.medium_image_url).toBe(
      "https://i.ytimg.com/vi/1ac3_YdSSy0/mqdefault.jpg",
    );
    expect(videos.episodes).toEqual([]);
  });

  it("skips videos that are not on YouTube", () => {
    const videos = mapMalVideos({
      id: 1,
      title: "x",
      videos: [{ id: 1, title: "PV", url: "https://example.com/pv" }],
    });
    expect(videos.promo).toEqual([]);
  });
});

describe("characters", () => {
  it("writes names as Jikan does", () => {
    expect(characterName("Alphonse", "Elric")).toBe("Elric, Alphonse");
    expect(characterName("Frieren", "")).toBe("Frieren");
    expect(characterName("", "Scar")).toBe("Scar");
  });

  it("orders main characters first, then by name, as Tenrai does", () => {
    const { edges } = readCharacters(fmabCharacters);
    const mapped = mapMalCharacters(edges);
    const expected = tenraiCharacters.data.slice(0, 12);
    expect(mapped.slice(0, 12).map((c) => [c.character.mal_id, c.character.name, c.role])).toEqual(
      expected.map((c) => [c.character.mal_id, c.character.name, c.role]),
    );
    expect(mapped[0].character.images.jpg.image_url).toBe(expected[0].character.images.jpg.image_url);
    expect(mapped.every((c) => c.voice_actors.length === 0)).toBe(true);
  });

  it("maps the fields of the characters reply", () => {
    const [first] = mapMalCharacters(readCharacters(frierenCharacters).edges);
    expect(first).toEqual({
      character: {
        mal_id: 184947,
        name: "Frieren",
        images: {
          jpg: { image_url: "https://cdn.myanimelist.net/images/characters/7/525105.jpg" },
          webp: { image_url: "https://cdn.myanimelist.net/images/characters/7/525105.jpg" },
        },
      },
      role: "Main",
      voice_actors: [],
    });
  });
});

describe("reading replies", () => {
  it("rejects bodies that are not v2 replies", () => {
    expect(() => readNode({ message: "", error: "not_found" })).toThrow(MalShapeError);
    expect(() => readNode("<html>parked</html>")).toThrow("Unexpected response from MyAnimeList");
    expect(() => readList({ data: null })).toThrow(MalShapeError);
    expect(() => readCharacters(null)).toThrow(MalShapeError);
  });

  it("drops rows without an id", () => {
    const { nodes } = readList({ data: [{ node: { id: 1, title: "a" } }, { node: {} }, null] });
    expect(nodes.map((n) => n.id)).toEqual([1]);
  });

  it("lists everything except R+ and Rx", () => {
    expect(["g", "pg", "pg_13", "r", undefined].every((rating) => isListed({ rating }))).toBe(true);
    expect(isListed({ rating: "r+" })).toBe(false);
    expect(isListed({ rating: "rx" })).toBe(false);
  });

  it("feeds the season helpers", () => {
    const slim: SeasonAnime = toSeasonAnime(mapMalAnime(apothecary));
    expect(belongsOnCalendar(slim)).toBe(true);
    expect(slim.broadcast).toEqual(tenrai(61987).broadcast);
    expect(belongsOnCalendar(toSeasonAnime(mapMalAnime(yourName)))).toBe(false);
  });
});
