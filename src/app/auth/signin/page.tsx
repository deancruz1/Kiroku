"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";
import { FormField } from "@/components/form-field";
import { InlineMessage } from "@/components/inline-message";
import {
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/account-validation";
import { NETWORK_ERROR_MESSAGE, requestJson } from "@/lib/fetch-json";

type Mode = "signin" | "register";

type RegisterErrors = {
  username?: string;
  email?: string;
  password?: string;
};

const FIELD = "[&_input]:h-10";
// The capture scripts find the sign-in fields by their placeholders, so the
// placeholders stay in the markup but are not shown.
const SIGNIN_FIELD = "[&_input]:h-10 [&_input]:placeholder:text-transparent";

export default function SignInPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [switched, setSwitched] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginErrors, setLoginErrors] = useState<{
    login?: string;
    password?: string;
  }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState("");

  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regErrors, setRegErrors] = useState<RegisterErrors>({});
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  useEffect(() => {
    if (switched) firstFieldRef.current?.focus();
  }, [mode, switched]);

  function switchMode(next: Mode) {
    setMode(next);
    setSwitched(true);
    setError("");
    setLoginErrors({});
    setRegError("");
    setRegErrors({});
    if (next === "register") setRegistered("");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError("");

    const errors = {
      login: email.trim() ? undefined : "Enter your email or username.",
      password: password ? undefined : "Enter your password.",
    };
    setLoginErrors(errors);
    if (errors.login || errors.password) return;

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
    if (regLoading) return;
    setRegError("");

    const username = validateUsername(regUsername);
    const emailCheck = validateEmail(regEmail);
    const passwordCheck = validatePassword(regPassword);
    const errors: RegisterErrors = {
      username: username.ok ? undefined : username.error,
      email: emailCheck.ok ? undefined : emailCheck.error,
      password: passwordCheck.ok ? undefined : passwordCheck.error,
    };
    setRegErrors(errors);
    if (!username.ok || !emailCheck.ok || !passwordCheck.ok) return;

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

    setEmail(username.value);
    setPassword("");
    setRegUsername("");
    setRegEmail("");
    setRegPassword("");
    switchMode("signin");
    setRegistered("Account created. You can now sign in.");
  }

  return (
    <main className="page">
      <div className="max-w-md md:pt-6">
        {mode === "signin" ? (
          <>
            <PageHeading title="Sign in" />

            {registered && (
              <InlineMessage tone="success" className="mt-6">
                {registered}
              </InlineMessage>
            )}

            <form onSubmit={handleLogin} noValidate className="mt-8">
              <div className="flex flex-col gap-5">
                <FormField
                  ref={firstFieldRef}
                  label="Email or username"
                  type="text"
                  name="username"
                  autoComplete="username"
                  placeholder="Email or Username"
                  className={SIGNIN_FIELD}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={loginErrors.login}
                  required
                />
                <FormField
                  label="Password"
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  className={SIGNIN_FIELD}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={loginErrors.password}
                  required
                />
              </div>
              {error && <InlineMessage className="mt-5">{error}</InlineMessage>}
              <Button
                type="submit"
                size="lg"
                className="mt-7 w-full"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="my-6 flex items-center gap-3 text-muted-foreground">
              <span aria-hidden="true" className="h-px flex-1 bg-rule" />
              <span className="italic">or</span>
              <span aria-hidden="true" className="h-px flex-1 bg-rule" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() =>
                signIn("discord", { callbackUrl: "/" }).catch(() =>
                  setError(NETWORK_ERROR_MESSAGE),
                )
              }
            >
              Sign in with Discord
            </Button>

            <p className="mt-10 flex flex-wrap items-center gap-x-2 border-t border-rule pt-4 text-muted-foreground">
              No account yet?
              <Button
                type="button"
                variant="link"
                className="h-10"
                onClick={() => switchMode("register")}
              >
                Create an account
              </Button>
            </p>
          </>
        ) : (
          <>
            <PageHeading title="Create account" />

            <form onSubmit={handleRegister} noValidate className="mt-8">
              <div className="flex flex-col gap-5">
                <div>
                  <FormField
                    ref={firstFieldRef}
                    className={FIELD}
                    label="Username"
                    type="text"
                    name="username"
                    autoComplete="username"
                    aria-describedby={regErrors.username ? undefined : "reg-username-hint"}
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    error={regErrors.username}
                    required
                  />
                  {!regErrors.username && (
                    <p
                      id="reg-username-hint"
                      className="mt-1.5 text-sm text-muted-foreground"
                    >
                      3 to 20 letters, numbers or underscores.
                    </p>
                  )}
                </div>
                <FormField
                  className={FIELD}
                  label="Email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  error={regErrors.email}
                  required
                />
                <div>
                  <FormField
                    className={FIELD}
                    label="Password"
                    type="password"
                    name="password"
                    autoComplete="new-password"
                    aria-describedby={regErrors.password ? undefined : "reg-password-hint"}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    error={regErrors.password}
                    required
                  />
                  {!regErrors.password && (
                    <p
                      id="reg-password-hint"
                      className="mt-1.5 text-sm text-muted-foreground"
                    >
                      At least 8 characters.
                    </p>
                  )}
                </div>
              </div>
              {regError && (
                <InlineMessage className="mt-5">{regError}</InlineMessage>
              )}
              <Button
                type="submit"
                size="lg"
                className="mt-7 w-full"
                disabled={regLoading}
              >
                {regLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <p className="mt-10 flex flex-wrap items-center gap-x-2 border-t border-rule pt-4 text-muted-foreground">
              Already have an account?
              <Button
                type="button"
                variant="link"
                className="h-10"
                onClick={() => switchMode("signin")}
              >
                Sign in
              </Button>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
