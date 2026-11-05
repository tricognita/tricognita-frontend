/**
 * The words for each sign-in failure the server can return. The same message is used whether
 * or not the email exists, so this cannot be used to find out who has an account.
 */
export function loginErrorMessage(code: unknown, retryAfter: string | null): string {
  switch (code) {
    case "invalid_credentials":
      return "The email or password is incorrect.";
    case "invalid_mfa_code":
      return "That authenticator code is not valid. Check the code and try again.";
    case "rate_limited": {
      const secs = Number(retryAfter);
      return Number.isFinite(secs) && secs > 0
        ? `Too many sign-in attempts. Try again in ${secs >= 90 ? `${Math.ceil(secs / 60)} minutes` : `${Math.ceil(secs)} seconds`}.`
        : "Too many sign-in attempts. Try again in a few minutes.";
    }
    case "invalid_email":
    case "invalid_password":
      return "Enter your work email and a password of at least 8 characters.";
    default:
      return "Sign-in is unavailable right now. Try again in a moment.";
  }
}
