export function humanizeAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("user already registered") || normalized.includes("already been registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "That email and password combination is not correct.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before logging in.";
  }

  if (normalized.includes("password")) {
    return "Please choose a stronger password and try again.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  return "Something went wrong. Please try again in a moment.";
}
