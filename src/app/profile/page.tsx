"use client";

import { Suspense } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Key, Shield, Trash2, AlertTriangle, Mail } from "lucide-react";
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

function ProfileContent() {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [unlinking, setUnlinking] = useState(false);

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

  useEffect(() => {
    if (authError === "OAuthAccountNotLinked") {
      queueMicrotask(() => {
        setMessage({
          type: "error",
          text: "This Discord account is already associated with a different Kiroku account. If you want to link it to this account, you must first sign in to the other account and unlink Discord from there. If it is a Discord only account, you must delete that account first.",
        });
        clearMessage();
      });
    }
  }, [authError]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm sm:text-base">Loading...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-sm sm:text-base">
            Sign in to view your profile.
          </p>
          <Button asChild>
            <Link href="/auth/signin">Sign in</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p
            role="alert"
            className="text-muted-foreground text-sm sm:text-base"
          >
            Could not load your profile.
          </p>
          <Button onClick={() => refetch()}>Try again</Button>
        </div>
      </main>
    );
  }

  if (isLoading || !profile) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm sm:text-base">Loading...</p>
      </main>
    );
  }

  function clearMessage() {
    setTimeout(() => setMessage(null), 5000);
  }

  function showSuccess(text: string) {
    setMessage({ type: "success", text });
    clearMessage();
  }

  function showError(text: string) {
    setMessage({ type: "error", text });
    clearMessage();
  }

  function refreshProfile() {
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
  }

  async function handleUnlinkDiscord() {
    setUnlinking(true);
    const result = await requestJson(
      "/api/user/discord",
      { method: "DELETE" },
      "Failed to unlink Discord.",
    );
    setUnlinking(false);
    if (result.ok) {
      showSuccess("Discord unlinked.");
      refreshProfile();
    } else {
      showError(result.error);
    }
  }

  const isDiscordOnly = !profile.hasPassword && profile.hasDiscord;

  const unlinkRequirements = [
    !profile.hasPassword && "a password",
    !profile.hasUsername && !profile.email && "a username",
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center sm:text-left">
          Profile Settings
        </h1>

        {message && (
          <div
            role={message.type === "error" ? "alert" : "status"}
            className={`mb-4 p-3 rounded-md text-xs sm:text-sm ${
              message.type === "success"
                ? "bg-green-500/10 text-green-500 border border-green-500/20"
                : "bg-red-500/10 text-red-500 border border-red-500/20"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Username
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UsernameForm
                key={profile.username}
                currentUsername={profile.username}
                hasUsername={profile.hasUsername}
                onSuccess={(msg) => {
                  showSuccess(msg);
                  refreshProfile();
                }}
                onError={showError}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {isDiscordOnly
                  ? "No email set. You signed in with Discord."
                  : profile.email || "No email set."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.hasPassword ? (
                <PasswordForm onSuccess={showSuccess} onError={showError} />
              ) : (
                <div className="space-y-3">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {profile.hasDiscord
                      ? "No password set. You can only sign in with Discord."
                      : "No password set."}
                  </p>
                  <SetPasswordForm
                    onSuccess={(msg) => {
                      showSuccess(msg);
                      refreshProfile();
                    }}
                    onError={showError}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Discord Connection
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.hasDiscord ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Discord is linked to your account.
                    </p>
                    {unlinkRequirements.length > 0 && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        You must set {unlinkRequirements.join(" and ")} before
                        unlinking Discord.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer text-xs w-full sm:w-auto"
                    disabled={!profile.canUnlinkDiscord || unlinking}
                    onClick={handleUnlinkDiscord}
                  >
                    {unlinking ? "Unlinking..." : "Unlink Discord"}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Discord is not linked.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer text-xs w-full sm:w-auto"
                    onClick={() =>
                      signIn("discord").catch(() =>
                        showError(NETWORK_ERROR_MESSAGE),
                      )
                    }
                  >
                    Link Discord
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DeleteAccountForm
                hasPassword={profile.hasPassword}
                onSuccess={() => signOut({ redirectTo: "/" })}
                onError={showError}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background flex items-center justify-center px-4">
          <p className="text-muted-foreground text-sm sm:text-base">
            Loading...
          </p>
        </main>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

function UsernameForm({
  currentUsername,
  hasUsername,
  onSuccess,
  onError,
}: {
  currentUsername: string;
  hasUsername: boolean;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [username, setUsername] = useState(currentUsername || "");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const check = validateUsername(username);
    if (!check.ok) {
      onError(check.error);
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
      onSuccess("Username updated.");
    } else {
      onError(result.error);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="flex-1 text-xs sm:text-sm h-9"
          aria-label="Username"
          autoComplete="username"
          name="username"
        />
        <Button
          type="submit"
          size="sm"
          disabled={
            saving ||
            !username.trim() ||
            (hasUsername && username === currentUsername)
          }
          className="h-9 cursor-pointer text-xs shrink-0"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
      {!hasUsername && (
        <p className="text-[10px] sm:text-xs text-muted-foreground">
          You have not saved a username yet. Save one to sign in without
          Discord.
        </p>
      )}
    </form>
  );
}

function PasswordForm({
  onSuccess,
  onError,
}: {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) return;
    const check = validatePassword(newPassword);
    if (!check.ok) {
      onError(check.error);
      return;
    }
    setSaving(true);
    const result = await requestJson(
      "/api/user/password",
      {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
        headers: JSON_HEADERS,
      },
      "Failed to update password.",
    );
    setSaving(false);
    if (result.ok) {
      onSuccess("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } else {
      onError(result.error);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <Input
        type="password"
        placeholder="Current password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        className="w-full text-xs sm:text-sm h-9"
        aria-label="Current password"
        name="current-password"
        autoComplete="current-password"
      />
      <div className="flex items-center gap-2">
        <Input
          type="password"
          placeholder="New password (min 8 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="flex-1 text-xs sm:text-sm h-9"
          aria-label="New password"
          name="new-password"
          autoComplete="new-password"
        />
        <Button
          type="submit"
          size="sm"
          disabled={saving || !currentPassword || !newPassword}
          className="h-9 cursor-pointer text-xs shrink-0"
        >
          {saving ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </form>
  );
}

function SetPasswordForm({
  onSuccess,
  onError,
}: {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const check = validatePassword(newPassword);
    if (!check.ok) {
      onError(check.error);
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
      onSuccess("Password set.");
      setNewPassword("");
    } else {
      onError(result.error);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex items-center gap-2">
      <Input
        type="password"
        placeholder="New password (min 8 characters)"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="flex-1 text-xs sm:text-sm h-9"
        aria-label="New password"
        name="new-password"
        autoComplete="new-password"
      />
      <Button
        type="submit"
        size="sm"
        disabled={saving || !newPassword}
        className="h-9 cursor-pointer text-xs shrink-0"
      >
        {saving ? "Setting..." : "Set Password"}
      </Button>
    </form>
  );
}

function DeleteAccountForm({
  hasPassword,
  onSuccess,
  onError,
}: {
  hasPassword: boolean;
  onSuccess: () => Promise<unknown>;
  onError: (msg: string) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText === "DELETE" && (!hasPassword || !!password);

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!canDelete) return;
    setDeleting(true);
    const result = await requestJson(
      "/api/user/delete",
      {
        method: "DELETE",
        body: JSON.stringify(hasPassword ? { password } : {}),
        headers: JSON_HEADERS,
      },
      "Failed to delete account.",
    );
    if (!result.ok) {
      onError(result.error);
      setDeleting(false);
      return;
    }
    // On success the sign-out redirects away, so deleting stays true.
    try {
      await onSuccess();
    } catch {
      onError(
        "Your account was deleted, but signing out failed. Reload the page.",
      );
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleDelete} className="space-y-3">
      <p className="text-xs sm:text-sm text-muted-foreground">
        Type <strong>DELETE</strong> to confirm. This action is irreversible.
      </p>
      {hasPassword && (
        <Input
          type="password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full text-xs sm:text-sm h-9"
          aria-label="Password"
          name="current-password"
          autoComplete="current-password"
        />
      )}
      <div className="flex items-center gap-2">
        <Input
          placeholder='Type "DELETE" to confirm'
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="flex-1 text-xs sm:text-sm h-9"
          aria-label="Type DELETE to confirm"
          autoComplete="off"
        />
        <Button
          type="submit"
          variant="destructive"
          size="sm"
          disabled={deleting || !canDelete}
          className="h-9 cursor-pointer text-xs shrink-0"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {deleting ? "Deleting..." : "Delete Account"}
        </Button>
      </div>
    </form>
  );
}
