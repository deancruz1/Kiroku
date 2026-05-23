"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession, signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Key, Shield, Trash2, AlertTriangle, Mail } from "lucide-react";

interface Profile {
  username: string;
  email: string;
  name: string;
  image: string;
  createdAt: string;
  hasPassword: boolean;
  hasDiscord: boolean;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<Profile>;
    },
    enabled: !!session,
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

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground text-sm sm:text-base">
            Sign in to view your profile.
          </p>
          <Link href="/auth/signin">
            <Button>Sign in</Button>
          </Link>
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

  const isDiscordOnly = !profile.hasPassword && profile.hasDiscord;

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-2xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-center sm:text-left">
          Profile Settings
        </h1>

        {message && (
          <div
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
          {/* Username */}
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
                onSuccess={(msg) => {
                  setMessage({ type: "success", text: msg });
                  clearMessage();
                  queryClient.invalidateQueries({
                    queryKey: ["user-profile"],
                  });
                }}
                onError={(msg) => {
                  setMessage({ type: "error", text: msg });
                  clearMessage();
                }}
              />
            </CardContent>
          </Card>

          {/* Email */}
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

          {/* Password */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Key className="h-4 w-4" />
                Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isDiscordOnly ? (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Password management is unavailable for Discord-only accounts.
                </p>
              ) : profile.hasPassword ? (
                <PasswordForm
                  onSuccess={(msg) => {
                    setMessage({ type: "success", text: msg });
                    clearMessage();
                  }}
                  onError={(msg) => {
                    setMessage({ type: "error", text: msg });
                    clearMessage();
                  }}
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    No password set. You can only sign in with Discord.
                  </p>
                  <SetPasswordForm
                    onSuccess={(msg) => {
                      setMessage({ type: "success", text: msg });
                      clearMessage();
                      queryClient.invalidateQueries({
                        queryKey: ["user-profile"],
                      });
                    }}
                    onError={(msg) => {
                      setMessage({ type: "error", text: msg });
                      clearMessage();
                    }}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discord */}
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
                    {!profile.hasPassword && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        You must set a password before unlinking Discord.
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer text-xs w-full sm:w-auto"
                    disabled={!profile.hasPassword}
                    onClick={async () => {
                      const res = await fetch("/api/user/discord", {
                        method: "DELETE",
                      });
                      const data = await res.json();
                      if (res.ok) {
                        setMessage({
                          type: "success",
                          text: "Discord unlinked.",
                        });
                        clearMessage();
                        queryClient.invalidateQueries({
                          queryKey: ["user-profile"],
                        });
                      } else {
                        setMessage({
                          type: "error",
                          text: data.error || "Failed to unlink Discord.",
                        });
                        clearMessage();
                      }
                    }}
                  >
                    Unlink Discord
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
                    onClick={() => signIn("discord")}
                  >
                    Link Discord
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DeleteAccountForm
                onSuccess={() => {
                  signOut();
                }}
                onError={(msg) => {
                  setMessage({ type: "error", text: msg });
                  clearMessage();
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function UsernameForm({
  currentUsername,
  onSuccess,
  onError,
}: {
  currentUsername: string;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [username, setUsername] = useState(currentUsername || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!username.trim()) return;
    setSaving(true);
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ username: username.trim() }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (res.ok) {
      onSuccess("Username updated.");
    } else {
      onError(data.error || "Failed to update username.");
    }
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="flex-1 text-xs sm:text-sm h-9"
        autoComplete="off"
        name="username"
      />
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || !username.trim() || username === currentUsername}
        className="h-9 cursor-pointer text-xs shrink-0"
      >
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
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

  async function handleSave() {
    if (!currentPassword || !newPassword) return;
    setSaving(true);
    const res = await fetch("/api/user/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword, newPassword }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (res.ok) {
      onSuccess("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } else {
      onError(data.error || "Failed to update password.");
    }
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      <Input
        type="password"
        placeholder="Current password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        className="w-full text-xs sm:text-sm h-9"
        autoComplete="new-password"
      />
      <div className="flex items-center gap-2">
        <Input
          type="password"
          placeholder="New password (min 6 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="flex-1 text-xs sm:text-sm h-9"
          autoComplete="new-password"
        />
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !currentPassword || newPassword.length < 6}
          className="h-9 cursor-pointer text-xs shrink-0"
        >
          {saving ? "Updating..." : "Update Password"}
        </Button>
      </div>
    </div>
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

  async function handleSave() {
    if (!newPassword || newPassword.length < 6) return;
    setSaving(true);
    const res = await fetch("/api/user/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "",
        newPassword,
        setInitial: true,
      }),
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    if (res.ok) {
      onSuccess("Password set.");
      setNewPassword("");
    } else {
      onError(data.error || "Failed to set password.");
    }
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="password"
        placeholder="New password (min 6 characters)"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="flex-1 text-xs sm:text-sm h-9"
        autoComplete="new-password"
      />
      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving || newPassword.length < 6}
        className="h-9 cursor-pointer text-xs shrink-0"
      >
        {saving ? "Setting..." : "Set Password"}
      </Button>
    </div>
  );
}

function DeleteAccountForm({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleting(true);
    const res = await fetch("/api/user/delete", { method: "DELETE" });
    if (res.ok) {
      onSuccess();
    } else {
      const data = await res.json();
      onError(data.error || "Failed to delete account.");
    }
    setDeleting(false);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs sm:text-sm text-muted-foreground">
        Type <strong>DELETE</strong> to confirm. This action is irreversible.
      </p>
      <div className="flex items-center gap-2">
        <Input
          placeholder='Type "DELETE" to confirm'
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="flex-1 text-xs sm:text-sm h-9"
          autoComplete="off"
        />
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleting || confirmText !== "DELETE"}
          className="h-9 cursor-pointer text-xs shrink-0"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {deleting ? "Deleting..." : "Delete Account"}
        </Button>
      </div>
    </div>
  );
}
