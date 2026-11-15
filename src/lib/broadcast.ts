export const BROADCAST_TIME_ZONE = "Asia/Tokyo";

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export interface Broadcast {
  day?: string | null;
  time?: string | null;
  timezone?: string | null;
  string?: string | null;
}

interface DateProp {
  day?: number | null;
  month?: number | null;
  year?: number | null;
}

export interface AiringInfo {
  status?: string | null;
  aired?: {
    from?: string | null;
    to?: string | null;
    prop?: { from?: DateProp | null; to?: DateProp | null } | null;
  } | null;
  broadcast?: Broadcast | null;
}

export interface WeeklySlot {
  day: number;
  hours: number;
  minutes: number;
  timeZone: string;
}

export interface LocalSchedule {
  /** Weekday in the viewer's zone, 0 = Sunday. */
  day: number;
  time: string;
  /** Minutes after local midnight, for sorting within a day. */
  minutes: number;
  /** Next episode to count down to, or null when no upcoming episode is known. */
  next: Date | null;
}

export function parseBroadcastDay(day: string | null | undefined): number | null {
  if (!day) return null;
  const lower = day.trim().toLowerCase();
  const name = lower.endsWith("s") ? lower.slice(0, -1) : lower;
  const index = DAY_NAMES.indexOf(name);
  return index === -1 ? null : index;
}

export function parseBroadcastTime(
  time: string | null | undefined,
): { hours: number; minutes: number } | null {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  // Japanese listings sometimes write late-night slots as 24:00-29:59.
  if (hours > 29 || minutes > 59) return null;
  return { hours, minutes };
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string) {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    getFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

function zonedParts(time: number, timeZone: string) {
  const values: Record<string, number> = {};
  for (const part of getFormatter(timeZone).formatToParts(new Date(time))) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }
  const { year, month, day, minute, second } = values;
  const hour = values.hour === 24 ? 0 : values.hour;
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { year, month, day, hour, minute, second, weekday };
}

function offsetMinutes(time: number, timeZone: string) {
  const whole = Math.floor(time / 1000) * 1000;
  const p = zonedParts(whole, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (asUtc - whole) / MINUTE;
}

/** Converts a wall-clock time in `timeZone` to an instant. Day/hour overflow rolls over. */
export function zonedTimeToInstant(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  timeZone: string,
): number {
  const guess = Date.UTC(year, month - 1, day, hours, minutes);
  const first = offsetMinutes(guess, timeZone);
  const instant = guess - first * MINUTE;
  const second = offsetMinutes(instant, timeZone);
  return second === first ? instant : guess - second * MINUTE;
}

export function getWeeklySlot(
  broadcast: Broadcast | null | undefined,
): WeeklySlot | null {
  const day = parseBroadcastDay(broadcast?.day);
  const time = parseBroadcastTime(broadcast?.time);
  if (day === null || !time) return null;
  const timeZone = broadcast?.timezone || BROADCAST_TIME_ZONE;
  if (!isValidTimeZone(timeZone)) return null;
  const extraDays = Math.floor(time.hours / 24);
  return {
    day: (day + extraDays) % 7,
    hours: time.hours % 24,
    minutes: time.minutes,
    timeZone,
  };
}

/** First time the slot occurs after `from` (or at `from` when inclusive). */
export function nextOccurrence(
  slot: WeeklySlot,
  from: number,
  inclusive = false,
): number {
  const p = zonedParts(from, slot.timeZone);
  for (let offset = 0; offset <= 8; offset++) {
    const date = new Date(Date.UTC(p.year, p.month - 1, p.day + offset));
    if (date.getUTCDay() !== slot.day) continue;
    const instant = zonedTimeToInstant(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      slot.hours,
      slot.minutes,
      slot.timeZone,
    );
    if (instant > from || (inclusive && instant === from)) return instant;
  }
  return from + 7 * DAY;
}

// Jikan dates are the Japanese calendar date written as midnight UTC.
function parseAiredDate(
  value: string | null | undefined,
  prop: DateProp | null | undefined,
): { year: number; month: number; day: number } | null {
  if (!value) return null;
  if (prop && !prop.day) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function premiereStart(info: AiringInfo, timeZone: string): number | null {
  const date = parseAiredDate(info.aired?.from, info.aired?.prop?.from);
  if (!date) return null;
  return zonedTimeToInstant(date.year, date.month, date.day, 0, 0, timeZone);
}

// Allows one day of slack because a 25:00-style episode can be dated the evening before.
function airingEnd(info: AiringInfo, timeZone: string): number | null {
  const date = parseAiredDate(info.aired?.to, info.aired?.prop?.to);
  if (!date) return null;
  return zonedTimeToInstant(date.year, date.month, date.day + 2, 0, 0, timeZone);
}

export function isFinishedAiring(info: AiringInfo, now: Date): boolean {
  if (info.status === "Finished Airing") return true;
  if (info.status === "Not yet aired") return false;
  const timeZone = getWeeklySlot(info.broadcast)?.timeZone ?? BROADCAST_TIME_ZONE;
  const end = airingEnd(info, timeZone);
  return end !== null && now.getTime() >= end;
}

export function getNextEpisode(info: AiringInfo, now: Date): Date | null {
  const slot = getWeeklySlot(info.broadcast);
  if (!slot || isFinishedAiring(info, now)) return null;

  const current = now.getTime();
  const premiere = premiereStart(info, slot.timeZone);
  let next: number;
  if (premiere !== null && premiere > current) {
    next = nextOccurrence(slot, premiere, true);
  } else if (info.status === "Not yet aired" && premiere === null) {
    return null;
  } else {
    next = nextOccurrence(slot, current);
  }

  const end = airingEnd(info, slot.timeZone);
  if (end !== null && next >= end) return null;
  return new Date(next);
}

export function getLocalSchedule(
  info: AiringInfo,
  now: Date,
  viewerTimeZone: string,
): LocalSchedule | null {
  const slot = getWeeklySlot(info.broadcast);
  if (!slot || isFinishedAiring(info, now) || !isValidTimeZone(viewerTimeZone))
    return null;

  const next = getNextEpisode(info, now);
  const instant = next ? next.getTime() : nextOccurrence(slot, now.getTime());
  const local = zonedParts(instant, viewerTimeZone);
  return {
    day: local.weekday,
    time: `${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`,
    minutes: local.hour * 60 + local.minute,
    next,
  };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / MINUTE));
  const days = Math.floor(total / (24 * 60));
  const hours = Math.floor((total % (24 * 60)) / 60);
  const minutes = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
