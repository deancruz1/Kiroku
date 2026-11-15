import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  getLocalSchedule,
  getNextEpisode,
  getWeeklySlot,
  isFinishedAiring,
  parseBroadcastDay,
  parseBroadcastTime,
  type AiringInfo,
} from "@/lib/broadcast";

// Sunday 2026-11-15, 21:00 in Tokyo, 12:00 in London, 07:00 in New York.
const NOW = new Date("2026-11-15T12:00:00Z");

function airing(day: string | null, time: string | null): AiringInfo {
  return {
    status: "Currently Airing",
    aired: { from: "2026-10-04T00:00:00+00:00", to: null },
    broadcast: {
      day,
      time,
      timezone: "Asia/Tokyo",
      string: day && time ? `${day} at ${time} (JST)` : "Unknown",
    },
  };
}

function countdown(info: AiringInfo, now = NOW) {
  const next = getNextEpisode(info, now);
  return next ? formatCountdown(next.getTime() - now.getTime()) : null;
}

describe("parseBroadcastDay", () => {
  it("reads the plural names Jikan returns", () => {
    expect(parseBroadcastDay("Mondays")).toBe(1);
    expect(parseBroadcastDay("Thursdays")).toBe(4);
    expect(parseBroadcastDay("SATURDAYS")).toBe(6);
    expect(parseBroadcastDay(" sundays ")).toBe(0);
  });

  it("reads singular names", () => {
    expect(parseBroadcastDay("Monday")).toBe(1);
    expect(parseBroadcastDay("sunday")).toBe(0);
  });

  it("rejects missing or unknown days", () => {
    expect(parseBroadcastDay(null)).toBeNull();
    expect(parseBroadcastDay(undefined)).toBeNull();
    expect(parseBroadcastDay("")).toBeNull();
    expect(parseBroadcastDay("Unknown")).toBeNull();
    expect(parseBroadcastDay("Mon")).toBeNull();
  });
});

describe("parseBroadcastTime", () => {
  it("reads normal times", () => {
    expect(parseBroadcastTime("01:30")).toEqual({ hours: 1, minutes: 30 });
    expect(parseBroadcastTime("7:05")).toEqual({ hours: 7, minutes: 5 });
    expect(parseBroadcastTime("23:59:00")).toEqual({ hours: 23, minutes: 59 });
  });

  it("allows late-night times up to 29:59", () => {
    expect(parseBroadcastTime("25:30")).toEqual({ hours: 25, minutes: 30 });
    expect(parseBroadcastTime("24:00")).toEqual({ hours: 24, minutes: 0 });
  });

  it("rejects malformed times", () => {
    expect(parseBroadcastTime(null)).toBeNull();
    expect(parseBroadcastTime("")).toBeNull();
    expect(parseBroadcastTime("30:00")).toBeNull();
    expect(parseBroadcastTime("12:60")).toBeNull();
    expect(parseBroadcastTime("ab:cd")).toBeNull();
    expect(parseBroadcastTime("1230")).toBeNull();
  });
});

describe("getWeeklySlot", () => {
  it("rolls a 25:30 slot into the next day", () => {
    expect(getWeeklySlot({ day: "Sundays", time: "25:30" })).toEqual({
      day: 1,
      hours: 1,
      minutes: 30,
      timeZone: "Asia/Tokyo",
    });
    expect(getWeeklySlot({ day: "Saturdays", time: "24:15" })?.day).toBe(0);
  });

  it("assumes Japan time when the timezone is missing", () => {
    expect(getWeeklySlot({ day: "Mondays", time: "10:00", timezone: null })?.timeZone).toBe(
      "Asia/Tokyo",
    );
  });

  it("returns null for missing or malformed data", () => {
    expect(getWeeklySlot(null)).toBeNull();
    expect(getWeeklySlot({ day: null, time: null, timezone: null, string: "Unknown" })).toBeNull();
    expect(getWeeklySlot({ day: "Mondays", time: null })).toBeNull();
    expect(getWeeklySlot({ day: null, time: "10:00" })).toBeNull();
    expect(getWeeklySlot({ day: "Mondays", time: "10:00", timezone: "Mars/Base" })).toBeNull();
  });
});

describe("getLocalSchedule", () => {
  it("moves a Sunday 01:00 JST show to Saturday for a zone behind Japan", () => {
    const schedule = getLocalSchedule(airing("Sundays", "01:00"), NOW, "Europe/London");
    expect(schedule).toEqual({
      day: 6,
      time: "16:00",
      minutes: 16 * 60,
      next: new Date("2026-11-21T16:00:00Z"),
    });
  });

  it("moves a Saturday 23:30 JST show to Sunday for a zone ahead of Japan", () => {
    const schedule = getLocalSchedule(airing("Saturdays", "23:30"), NOW, "Pacific/Auckland");
    expect(schedule?.day).toBe(0);
    expect(schedule?.time).toBe("03:30");
    expect(schedule?.next).toEqual(new Date("2026-11-21T14:30:00Z"));
  });

  it("keeps the day when the shift stays inside it", () => {
    const schedule = getLocalSchedule(airing("Fridays", "23:00"), NOW, "America/New_York");
    expect(schedule?.day).toBe(5);
    expect(schedule?.time).toBe("09:00");
  });

  it("is unchanged for a viewer in Japan", () => {
    const schedule = getLocalSchedule(airing("Wednesdays", "00:30"), NOW, "Asia/Tokyo");
    expect(schedule?.day).toBe(3);
    expect(schedule?.time).toBe("00:30");
  });

  it("follows daylight saving in the viewer's zone", () => {
    const info = airing("Mondays", "10:00");
    const summer = getLocalSchedule(info, new Date("2026-10-20T12:00:00Z"), "America/New_York");
    const winter = getLocalSchedule(info, NOW, "America/New_York");
    expect(summer?.day).toBe(0);
    expect(summer?.time).toBe("21:00");
    expect(winter?.day).toBe(0);
    expect(winter?.time).toBe("20:00");
  });

  it("counts down correctly across a daylight saving change", () => {
    const before = new Date("2026-10-31T12:00:00Z");
    const info = airing("Mondays", "10:00");
    const schedule = getLocalSchedule(info, before, "America/New_York");
    expect(schedule?.next).toEqual(new Date("2026-11-02T01:00:00Z"));
    expect(schedule?.time).toBe("20:00");
    expect(countdown(info, before)).toBe("1d 13h");
  });

  it("places a 25:30 Sunday slot on Monday morning in Japan", () => {
    const info = airing("Sundays", "25:30");
    expect(getLocalSchedule(info, NOW, "Asia/Tokyo")?.day).toBe(1);
    const london = getLocalSchedule(info, NOW, "Europe/London");
    expect(london?.day).toBe(0);
    expect(london?.time).toBe("16:30");
    expect(countdown(info)).toBe("4h 30m");
  });

  it("returns null without a usable slot or viewer zone", () => {
    expect(getLocalSchedule({ broadcast: null }, NOW, "Europe/London")).toBeNull();
    expect(getLocalSchedule(airing(null, null), NOW, "Europe/London")).toBeNull();
    expect(getLocalSchedule(airing("Mondays", "10:00"), NOW, "Not/AZone")).toBeNull();
  });
});

describe("countdown", () => {
  it("targets later today when the slot has not passed", () => {
    expect(getNextEpisode(airing("Sundays", "22:00"), NOW)).toEqual(
      new Date("2026-11-15T13:00:00Z"),
    );
    expect(countdown(airing("Sundays", "22:00"))).toBe("1h 0m");
  });

  it("targets next week when today's slot has passed", () => {
    expect(getNextEpisode(airing("Sundays", "20:00"), NOW)).toEqual(
      new Date("2026-11-22T11:00:00Z"),
    );
    expect(countdown(airing("Sundays", "20:00"))).toBe("6d 23h");
  });

  it("shows minutes in the last hour", () => {
    expect(countdown(airing("Sundays", "21:45"))).toBe("45m");
    expect(countdown(airing("Sundays", "21:45"), new Date("2026-11-15T12:00:30Z"))).toBe("45m");
    expect(countdown(airing("Sundays", "21:01"))).toBe("1m");
  });

  it("moves on to next week once the episode starts", () => {
    expect(countdown(airing("Sundays", "21:00"))).toBe("7d 0h");
  });

  it("has no countdown for missing data", () => {
    expect(countdown({ broadcast: null })).toBeNull();
    expect(countdown(airing(null, null))).toBeNull();
    expect(countdown(airing("Funday", "10:00"))).toBeNull();
  });
});

describe("shows off a weekly schedule", () => {
  it("never counts down for a finished show", () => {
    const info = { ...airing("Sundays", "22:00"), status: "Finished Airing" };
    expect(isFinishedAiring(info, NOW)).toBe(true);
    expect(getNextEpisode(info, NOW)).toBeNull();
    expect(getLocalSchedule(info, NOW, "Europe/London")).toBeNull();
  });

  it("treats a show whose end date has passed as finished", () => {
    const info: AiringInfo = {
      ...airing("Sundays", "22:00"),
      aired: {
        from: "2026-07-05T00:00:00+00:00",
        to: "2026-11-01T00:00:00+00:00",
        prop: { from: { day: 5 }, to: { day: 1 } },
      },
    };
    expect(isFinishedAiring(info, NOW)).toBe(true);
    expect(getNextEpisode(info, NOW)).toBeNull();
  });

  it("counts down to a final episode near its end date but not past it", () => {
    const aired = {
      from: "2026-07-05T00:00:00+00:00",
      to: "2026-11-14T00:00:00+00:00",
      prop: { from: { day: 5 }, to: { day: 14 } },
    };
    const tonight: AiringInfo = { ...airing("Sundays", "22:00"), aired };
    const passed: AiringInfo = { ...airing("Sundays", "20:00"), aired };
    expect(getNextEpisode(tonight, NOW)).toEqual(new Date("2026-11-15T13:00:00Z"));
    expect(getNextEpisode(passed, NOW)).toBeNull();
  });

  it("ignores an end date without a day", () => {
    const info: AiringInfo = {
      ...airing("Sundays", "22:00"),
      aired: {
        from: "2026-07-05T00:00:00+00:00",
        to: "2026-11-01T00:00:00+00:00",
        prop: { from: { day: 5 }, to: { day: null, month: 11, year: 2026 } },
      },
    };
    expect(isFinishedAiring(info, NOW)).toBe(false);
    expect(countdown(info)).toBe("1h 0m");
  });

  it("counts down to the premiere of a show that has not aired", () => {
    const info: AiringInfo = {
      status: "Not yet aired",
      aired: {
        from: "2027-01-10T00:00:00+00:00",
        to: null,
        prop: { from: { day: 10, month: 1, year: 2027 } },
      },
      broadcast: { day: "Sundays", time: "01:00", timezone: "Asia/Tokyo" },
    };
    const schedule = getLocalSchedule(info, NOW, "Europe/London");
    expect(schedule?.next).toEqual(new Date("2027-01-09T16:00:00Z"));
    expect(schedule?.day).toBe(6);
    expect(schedule?.time).toBe("16:00");
  });

  it("places an unscheduled premiere on its day without a countdown", () => {
    const info: AiringInfo = {
      status: "Not yet aired",
      aired: { from: null, to: null },
      broadcast: { day: "Sundays", time: "01:00", timezone: "Asia/Tokyo" },
    };
    const schedule = getLocalSchedule(info, NOW, "Europe/London");
    expect(schedule?.next).toBeNull();
    expect(schedule?.day).toBe(6);
  });

  it("has no countdown when only the premiere month is known", () => {
    const info: AiringInfo = {
      status: "Not yet aired",
      aired: {
        from: "2027-01-01T00:00:00+00:00",
        to: null,
        prop: { from: { day: null, month: 1, year: 2027 } },
      },
      broadcast: { day: "Fridays", time: "23:00", timezone: "Asia/Tokyo" },
    };
    expect(getNextEpisode(info, NOW)).toBeNull();
  });

  it("falls back to the weekly slot when the status lags behind the premiere", () => {
    const info: AiringInfo = {
      status: "Not yet aired",
      aired: { from: "2026-11-01T00:00:00+00:00", to: null },
      broadcast: { day: "Sundays", time: "22:00", timezone: "Asia/Tokyo" },
    };
    expect(getNextEpisode(info, NOW)).toEqual(new Date("2026-11-15T13:00:00Z"));
  });
});

describe("formatCountdown", () => {
  it("formats each range", () => {
    expect(formatCountdown(0)).toBe("0m");
    expect(formatCountdown(30 * 1000)).toBe("1m");
    expect(formatCountdown(59 * 60 * 1000)).toBe("59m");
    expect(formatCountdown(60 * 60 * 1000)).toBe("1h 0m");
    expect(formatCountdown((23 * 60 + 59) * 60 * 1000)).toBe("23h 59m");
    expect(formatCountdown(24 * 60 * 60 * 1000)).toBe("1d 0h");
    expect(formatCountdown((6 * 24 + 4) * 60 * 60 * 1000)).toBe("6d 4h");
  });
});
