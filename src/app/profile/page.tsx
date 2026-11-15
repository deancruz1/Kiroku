"use client";

import { Suspense, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PageHeading } from "@/components/page-heading";
import { Section } from "@/components/section-heading";
import { FormField } from "@/components/form-field";
import { InlineMessage } from "@/components/inline-message";
import { Skeleton } from "@/components/skeleton";
import { ErrorPanel } from "@/components/error-panel";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { validatePassword, validateUsername } from "@/lib/account-validation";
import { NETWORK_ERROR_MESSAGE, requestJson } from "@/lib/fetch-json";

interface Profile {
  username: string;
  email: string | null;
  name: string;
  image: string;
  createdAt: string;
  hasPassword: boolean;
  hasDiscord: boolean;
  hasUsername: boolean;
  canUnlinkDiscord: boolean;
}

const JSON_HEADERS = { "Content-Type": "application/json" };
const FIELD = "[&_input]:h-10";
const HINT = "mt-1.5 text-sm text-muted-foreground";

// requestJson only returns the message, so the status is read on the way
// through to tell which field a server error belongs to.
async function sendJson(
  url: string,
  method: string,
  body: unknown,
  fallback: string,
) {
  let status = 0;
  const result = await requestJson(
    url,
    { method, body: JSON.stringify(body), headers: JSON_HEADERS },
    fallback,
    async (input, init) => {
      const res = await fetch(input, init);
      status = res.status;
      return res;
    },
  );
  return { result, status };
}

function ProfileSkeleton() {
  return (
    <main className="page">
      <div className="max-w-2xl">
        <PageHeading title="Profile" />
        <div
          role="status"
          aria-label="Loading your profile"
          className="mt-10 md:mt-12"
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="mb-12 border-t border-foreground pt-3">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="mt-6 h-4 w-24" />
              <Skeleton className="mt-3 h-6 w-full max-w-sm" />
              <Skeleton className="mt-6 h-10 w-36" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

function ProfileContent() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const linkError =
    searchParams.get("error") === "OAuthAccountNotLinked"
      ? "This Discord account is already linked to a different Kiroku account. To link it here, sign in to that account and unlink Discord there, or delete that account if Discord is its only way to sign in."
      : "";

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<Profile>;
    },
    enabled: status === "authenticated",
  });

  if (status === "loading") return <ProfileSkeleton />;

  if (!session) {
    return <SignInPrompt title="Profile" subject="your profile" />;
  }

  if (isError) {
    return (
      <ErrorPanel
        title="Profile"
        message="Could not load your profile."
        onRetry={() => refetch()}
      />
    );
  }

  if (isLoading || !profile) return <ProfileSkeleton />;

  function refreshProfile() {
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
  }

  return (
    <main className="page">
      <div className="max-w-2xl">
        <PageHeading title="Profile" />
        <div className="mt-10 md:mt-12">
          <AccountSection profile={profile} onChanged={refreshProfile} />
          <PasswordSection profile={profile} onChanged={refreshProfile} />
          <DiscordSection
            profile={profile}
            linkError={linkError}
            onChanged={refreshProfile}
          />
          <DeleteSection
            hasPassword={profile.hasPassword}
            hasDiscord={profile.hasDiscord}
          />
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}

function AccountSection({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: () => void;
}) {
  const [message, setMessage] = useState("");
  const isDiscordOnly = !profile.hasPassword && profile.hasDiscord;

  return (
    <Section title="Account">
      <div className="max-w-sm">
        <p className="mb-1.5 text-sm text-muted-foreground">Email</p>
        <p className="break-words">
          {isDiscordOnly
            ? "No email set. You signed in with Discord."
            : profile.email || "No email set."}
        </p>
        <UsernameForm
          key={profile.username}
          currentUsername={profile.username}
          hasUsername={profile.hasUsername}
          onSubmit={() => setMessage("")}
          onSuccess={() => {
            setMessage("Username updated.");
            onChanged();
          }}
        />
        {message && (
          <InlineMessage tone="success" className="mt-4">
            {message}
          </InlineMessage>
        )}
      </div>
    </Section>
  );
}

function UsernameForm({
  currentUsername,
  hasUsername,
  onSubmit,
  onSuccess,
}: {
  currentUsername: string;
  hasUsername: boolean;
  onSubmit: () => void;
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState(currentUsername || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const hint = [
    !error && "3 to 20 letters, numbers or underscores.",
    !hasUsername &&
      "You have not saved a username yet. With a username and a password you can sign in without Discord.",
  ]
    .filter(Boolean)
    .join(" ");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    onSubmit();
    setError("");
    const check = validateUsername(username);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setSaving(true);
    const result = await requestJson(
      "/api/user/profile",
      {
        method: "PATCH",
        body: JSON.stringify({ username: check.value }),
        headers: JSON_HEADERS,
      },
      "Failed to update username.",
    );
    setSaving(false);
    if (result.ok) {
      onSuccess();
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSave} noValidate className="mt-6">
      <FormField
        className={FIELD}
        label="Username"
        type="text"
        name="username"
        autoComplete="username"
        aria-describedby={hint ? "username-hint" : undefined}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={error}
        required
      />
      {hint && (
        <p id="username-hint" className={HINT}>
          {hint}
        </p>
      )}
      <Button
        type="submit"
        variant="outline"
        size="lg"
        className="mt-5"
        disabled={saving || (hasUsername && username === currentUsername)}
      >
        {saving ? "Saving..." : "Save username"}
      </Button>
    </form>
  );
}

function PasswordSection({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: () => void;
}) {
  const [message, setMessage] = useState("");

  return (
    <Section title="Password">
      <div className="max-w-sm">
        {profile.hasPassword ? (
          <ChangePasswordForm
            onSubmit={() => setMessage("")}
            onSuccess={() => setMessage("Password updated.")}
          />
        ) : (
          <>
            <p>
              {profile.hasDiscord
                ? "No password set. You can only sign in with Discord."
                : "No password set."}
            </p>
            <SetPasswordForm
              onSubmit={() => setMessage("")}
              onSuccess={() => {
                setMessage("Password set.");
                onChanged();
              }}
            />
          </>
        )}
        {message && (
          <InlineMessage tone="success" className="mt-4">
            {message}
          </InlineMessage>
        )}
      </div>
    </Section>
  );
}

function ChangePasswordForm({
  onSubmit,
  onSuccess,
}: {
  onSubmit: () => void;
  onSuccess: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string }>(
    {},
  );
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    onSubmit();
    setFormError("");
    const check = validatePassword(newPassword);
    const nextErrors = {
      current: currentPassword ? undefined : "Current password is required.",
      next: check.ok ? undefined : check.error,
    };
    setErrors(nextErrors);
    if (nextErrors.current || nextErrors.next) return;

    setSaving(true);
    const { result, status } = await sendJson(
      "/api/user/password",
      "PATCH",
      { currentPassword, newPassword },
      "Failed to update password.",
    );
    setSaving(false);
    if (result.ok) {
      onSuccess();
      setCurrentPassword("");
      setNewPassword("");
    } else if (status === 403) {
      setErrors({ current: result.error });
    } else {
      setFormError(result.error);
    }
  }

  return (
    <form onSubmit={handleSave} noValidate>
      <div className="flex flex-col gap-5">
        <FormField
          className={FIELD}
          label="Current password"
          type="password"
          name="current-password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          error={errors.current}
          required
        />
        <div>
          <FormField
            className={FIELD}
            label="New password"
            type="password"
            name="new-password"
            autoComplete="new-password"
            aria-describedby={errors.next ? undefined : "new-password-hint"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.next}
            required
          />
          {!errors.next && (
            <p id="new-password-hint" className={HINT}>
              At least 8 characters.
            </p>
          )}
        </div>
      </div>
      {formError && <InlineMessage className="mt-4">{formError}</InlineMessage>}
      <Button
        type="submit"
        variant="outline"
        size="lg"
        className="mt-5"
        disabled={saving}
      >
        {saving ? "Changing password..." : "Change password"}
      </Button>
    </form>
  );
}

function SetPasswordForm({
  onSubmit,
  onSuccess,
}: {
  onSubmit: () => void;
  onSuccess: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    onSubmit();
    setError("");
    const check = validatePassword(newPassword);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setSaving(true);
    const result = await requestJson(
      "/api/user/password",
      {
        method: "PATCH",
        body: JSON.stringify({ newPassword }),
        headers: JSON_HEADERS,
      },
      "Failed to set password.",
    );
    setSaving(false);
    if (result.ok) {
      onSuccess();
      setNewPassword("");
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={handleSave} noValidate className="mt-6">
      <FormField
        className={FIELD}
        label="New password"
        type="password"
        name="new-password"
        autoComplete="new-password"
        aria-describedby={error ? undefined : "set-password-hint"}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        error={error}
        required
      />
      {!error && (
        <p id="set-password-hint" className={HINT}>
          At least 8 characters.
        </p>
      )}
      <Button
        type="submit"
        variant="outline"
        size="lg"
        className="mt-5"
        disabled={saving}
      >
        {saving ? "Setting password..." : "Set password"}
      </Button>
    </form>
  );
}

function DiscordSection({
  profile,
  linkError,
  onChanged,
}: {
  profile: Profile;
  linkError: string;
  onChanged: () => void;
}) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const unlinkRequirements = [
    !profile.hasPassword && "a password",
    !profile.hasUsername && !profile.email && "a username",
  ].filter(Boolean);

  async function handleUnlink() {
    if (pending) return;
    setMessage("");
    setError("");
    setPending(true);
    const result = await requestJson(
      "/api/user/discord",
      { method: "DELETE" },
      "Failed to unlink Discord.",
    );
    setPending(false);
    if (result.ok) {
      setMessage("Discord unlinked.");
      onChanged();
    } else {
      setError(result.error);
    }
  }

  function handleLink() {
    if (pending) return;
    setMessage("");
    setError("");
    setPending(true);
    signIn("discord").catch(() => {
      setError(NETWORK_ERROR_MESSAGE);
      setPending(false);
    });
  }

  const shownError = error || (message ? "" : linkError);

  return (
    <Section title="Discord">
      <div className="max-w-sm">
        {profile.hasDiscord ? (
          <>
            <p>Discord is linked to your account.</p>
            {unlinkRequirements.length > 0 && (
              <p id="unlink-reason" className="mt-1.5 text-muted-foreground">
                Discord is your only way to sign in, so it cannot be unlinked
                until you set {unlinkRequirements.join(" and ")}.
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mt-5"
              disabled={!profile.canUnlinkDiscord || pending}
              aria-describedby={
                unlinkRequirements.length > 0 ? "unlink-reason" : undefined
              }
              onClick={handleUnlink}
            >
              {pending ? "Unlinking..." : "Unlink Discord"}
            </Button>
          </>
        ) : (
          <>
            <p>Discord is not linked.</p>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="mt-5"
              disabled={pending}
              onClick={handleLink}
            >
              {pending ? "Opening Discord..." : "Link Discord"}
            </Button>
          </>
        )}
        {shownError && (
          <InlineMessage className="mt-4">{shownError}</InlineMessage>
        )}
        {message && (
          <InlineMessage tone="success" className="mt-4">
            {message}
          </InlineMessage>
        )}
      </div>
    </Section>
  );
}

function DeleteSection({
  hasPassword,
  hasDiscord,
}: {
  hasPassword: boolean;
  hasDiscord: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>(
    {},
  );
  const [formError, setFormError] = useState("");
  const [deleting, setDeleting] = useState(false);

  function handleOpenChange(next: boolean) {
    if (deleting) return;
    setOpen(next);
    if (!next) {
      setConfirmText("");
      setPassword("");
      setErrors({});
      setFormError("");
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (deleting) return;
    setFormError("");
    const nextErrors = {
      password:
        hasPassword && !password
          ? "Enter your password to delete your account."
          : undefined,
      confirm: confirmText === "DELETE" ? undefined : "Type DELETE to confirm.",
    };
    setErrors(nextErrors);
    if (nextErrors.password || nextErrors.confirm) return;

    setDeleting(true);
    const { result, status } = await sendJson(
      "/api/user/delete",
      "DELETE",
      hasPassword ? { password } : {},
      "Failed to delete account.",
    );
    if (!result.ok) {
      if (hasPassword && (status === 400 || status === 403)) {
        setErrors({ password: result.error });
      } else {
        setFormError(result.error);
      }
      setDeleting(false);
      return;
    }
    // On success the sign-out redirects away, so deleting stays true.
    try {
      await signOut({ redirectTo: "/" });
    } catch {
      setFormError(
        "Your account was deleted, but signing out failed. Reload the page.",
      );
      setDeleting(false);
    }
  }

  return (
    <Section title="Delete account">
      <p className="max-w-xl">
        Deleting your account also deletes your watch list and collections.
        It cannot be undone.
      </p>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="lg" className="mt-5">
            Delete account
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your Kiroku account, every show on your
              watch list with its status, episode count, rating, dates, notes
              and review, and all of your collections
              {hasDiscord ? ", and removes the link to your Discord account" : ""}
              . It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDelete} noValidate className="grid gap-5">
            {hasPassword && (
              <FormField
                className={FIELD}
                label="Password"
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                required
              />
            )}
            <FormField
              className={FIELD}
              label="Type DELETE to confirm"
              type="text"
              name="confirm"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              error={errors.confirm}
              required
            />
            {formError && <InlineMessage>{formError}</InlineMessage>}
            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant="destructive"
                size="lg"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Section>
  );
}
