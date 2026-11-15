// Auth.js sends sign-in errors to the sign-in page as ?error=<type>.
const SIGN_IN_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked:
    "This Discord account is already linked to a different Kiroku account. Sign in to that account instead.",
  OAuthCallbackError: "Signing in with Discord did not finish. Please try again.",
  OAuthSignInError: "Could not start signing in with Discord. Please try again.",
  AccessDenied: "You do not have permission to sign in.",
  CredentialsSignin: "Invalid email or password.",
  MissingCSRF: "The sign-in form expired. Please try again.",
  SessionRequired: "Sign in to see that page.",
};

export function signInErrorMessage(error: string | null | undefined) {
  if (!error) return null;
  return Object.hasOwn(SIGN_IN_ERRORS, error)
    ? SIGN_IN_ERRORS[error]
    : "Sign in failed. Please try again.";
}
