const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Matches Clerk's allowed minimum once the instance password rule is set to 8. */
export const MIN_PASSWORD_LENGTH = 8;

type AuthMessage = {
  code?: string;
  message: string;
  longMessage?: string;
};

/**
 * Rewrites provider-branded copy so users only see Recurrrrly-facing language.
 */
export function sanitizeUserMessage(message: string): string {
  if (/clerk/i.test(message)) {
    return "Something went wrong. Check your details and try again.";
  }

  return message;
}

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return "Enter your password.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return undefined;
}

export function validateCode(code: string): string | undefined {
  const trimmed = code.trim();
  if (!trimmed) return "Enter the 6-digit code.";
  if (!/^\d{6}$/.test(trimmed)) {
    return "Enter the 6-digit code from your email.";
  }
  return undefined;
}

export function clerkFieldMessage(
  field: AuthMessage | null | undefined,
): string | undefined {
  if (!field?.message) return undefined;
  return sanitizeUserMessage(field.message);
}

export function clerkFormMessage(
  errors: { global?: AuthMessage[] | null } | undefined,
): string | undefined {
  const first = errors?.global?.[0];
  if (!first) return undefined;
  return sanitizeUserMessage(first.longMessage ?? first.message);
}

export function clerkErrorMessage(
  error: AuthMessage | null | undefined,
): string | undefined {
  if (!error) return undefined;
  return sanitizeUserMessage(error.longMessage ?? error.message);
}

type AuthSessionResource = {
  existingSession?: { sessionId: string };
  finalize: (params?: {
    navigate?: (args: { session?: { currentTask?: unknown } | null }) => void;
  }) => Promise<{ error: AuthMessage | null }>;
};

/**
 * Activates the completed session. Navigation is left to Stack.Protected
 * once `useAuth().isSignedIn` updates — replacing "/" from the auth stack
 * races the signed-in routes and throws.
 */
export async function completeAuthSession(
  resource: AuthSessionResource,
): Promise<string | undefined> {
  const { error } = await resource.finalize();
  return clerkErrorMessage(error);
}

export function isAlreadySignedInError(
  error: AuthMessage | null | undefined,
): boolean {
  return error?.code === "identifier_already_signed_in";
}
