export const EMAIL_MAX_LENGTH = 254;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;

export function normalizeEmail(input: unknown): string {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export function validateEmail(input: unknown): ValidationResult {
  const email = normalizeEmail(input);
  if (!email) return { ok: false, error: "Email is required." };
  if (email.length > EMAIL_MAX_LENGTH) {
    return {
      ok: false,
      error: `Email must be ${EMAIL_MAX_LENGTH} characters or fewer.`,
    };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return { ok: true, value: email };
}

export function validateUsername(input: unknown): ValidationResult {
  const username = typeof input === "string" ? input.trim() : "";
  if (!username) return { ok: false, error: "Username is required." };
  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    return {
      ok: false,
      error: `Username must be ${USERNAME_MIN_LENGTH} to ${USERNAME_MAX_LENGTH} characters.`,
    };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      error: "Username can only contain letters, numbers and underscores.",
    };
  }
  return { ok: true, value: username };
}

export function passwordByteLength(password: string): number {
  return new TextEncoder().encode(password).length;
}

// Passwords are never trimmed. Bcrypt silently ignores bytes past 72, so the
// upper limit is in UTF-8 bytes while the lower limit is in characters.
export function validatePassword(input: unknown): ValidationResult {
  if (typeof input !== "string" || input.length === 0) {
    return { ok: false, error: "Password is required." };
  }
  if ([...input].length < PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`,
    };
  }
  if (passwordByteLength(input) > PASSWORD_MAX_BYTES) {
    return {
      ok: false,
      error: `Password is too long. The limit is ${PASSWORD_MAX_BYTES} bytes, and some characters count as more than one.`,
    };
  }
  return { ok: true, value: input };
}

export function normalizeLogin(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

export function sameIdentifier(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.toLowerCase() === b.toLowerCase();
}

// Order: exact email, email ignoring case, exact username, username ignoring
// case. An email match always wins so a username cannot shadow someone's email.
export function pickLoginMatch<
  T extends { email: string | null; username: string | null },
>(users: T[], login: string): T | null {
  if (!login) return null;
  return (
    users.find((u) => u.email === login) ??
    users.find((u) => sameIdentifier(u.email, login)) ??
    users.find((u) => u.username === login) ??
    users.find((u) => sameIdentifier(u.username, login)) ??
    null
  );
}

export function canUnlinkDiscord(user: {
  hasPassword: boolean;
  username: string | null;
  email: string | null;
}): boolean {
  return user.hasPassword && !!(user.username || user.email);
}
