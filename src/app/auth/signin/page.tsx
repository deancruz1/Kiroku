"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/account-validation";
import { NETWORK_ERROR_MESSAGE, requestJson } from "@/lib/fetch-json";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error === "CredentialsSignin") {
        setError("Invalid email or password.");
      } else if (!result?.ok || result.error) {
        setError("Sign in failed. Please try again.");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError("");
    setRegSuccess("");

    for (const result of [
      validateUsername(regUsername),
      validateEmail(regEmail),
      validatePassword(regPassword),
    ]) {
      if (!result.ok) {
        setRegError(result.error);
        return;
      }
    }

    setRegLoading(true);

    const result = await requestJson(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          username: regUsername,
          email: regEmail,
          password: regPassword,
        }),
        headers: { "Content-Type": "application/json" },
      },
      "Registration failed.",
    );

    setRegLoading(false);

    if (!result.ok) {
      setRegError(result.error);
      return;
    }

    setRegSuccess("Account created! You may now sign in.");
    setRegUsername("");
    setRegEmail("");
    setRegPassword("");
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Welcome to Kiroku
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="signin" className="flex-1">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1">
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleLogin} className="space-y-3">
                <Input
                  type="text"
                  placeholder="Email or Username"
                  aria-label="Email or username"
                  name="username"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="Password"
                  aria-label="Password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  signIn("discord", { callbackUrl: "/" }).catch(() =>
                    setError(NETWORK_ERROR_MESSAGE),
                  )
                }
              >
                Sign in with Discord
              </Button>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-3">
                <Input
                  type="text"
                  placeholder="Username (3-20 letters, numbers or _)"
                  aria-label="Username"
                  name="username"
                  autoComplete="username"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email"
                  aria-label="Email"
                  name="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  required
                />
                <Input
                  type="password"
                  placeholder="Password (min 8 characters)"
                  aria-label="Password"
                  name="new-password"
                  autoComplete="new-password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                />
                {regError && (
                  <p role="alert" className="text-sm text-destructive">
                    {regError}
                  </p>
                )}
                {regSuccess && (
                  <p role="status" className="text-sm text-green-500">
                    {regSuccess}
                  </p>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={regLoading || !!regSuccess}
                >
                  {regLoading
                    ? "Creating account..."
                    : regSuccess
                      ? "Account Created!"
                      : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
