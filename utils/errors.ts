/**
 * User-friendly error mapping utility
 * 
 * Converts raw errors into user-friendly messages while preserving
 * technical details for logging/debugging.
 */
import { captureError } from '../services/sentry';

export interface UserFriendlyError {
  title: string;
  message: string;
  /** True when the error is a rate limit / credit exhaustion (show upgrade prompt) */
  isRateLimit?: boolean;
  /** Original error for logging (never show to user in prod) */
  originalError?: unknown;
}

/** Known error patterns and their friendly mappings */
const ERROR_PATTERNS: Array<{
  pattern: RegExp | string;
  title: string;
  message: string;
  isRateLimit?: boolean;
}> = [
    {
      pattern: /network|fetch|timeout|ERR_NETWORK/i,
      title: "Connection Lost",
      message: "We couldn't reach our servers. Please check your internet connection."
    },
    {
      pattern: /401|unauthorized|unauthenticated/i,
      title: "Session Expired",
      message: "For your security, please sign in again to continue."
    },
    {
      pattern: /403|forbidden|permission/i,
      title: "Access Restricted",
      message: "You don't have permission to access this resource."
    },
    {
      pattern: /404|not found/i,
      title: "Page Not Found",
      message: "We couldn't find what you were looking for."
    },
    {
      pattern: /429|rate.?limit|too many requests/i,
      title: "Limit Reached",
      message: "You've hit a usage limit. Upgrade your plan for higher limits, or try again shortly.",
      isRateLimit: true,
    },
    {
      pattern: /500|internal server|edge function/i,
      title: "Something Went Wrong",
      message: "We encountered an issue on our end. Our team has been notified."
    },
    {
      pattern: /stripe|payment|checkout|billing/i,
      title: "Payment Issue",
      message: "We couldn't process your payment. Please try again or contact support."
    },
    {
      pattern: /invalid.*url|url.*invalid|malformed/i,
      title: "Invalid Link",
      message: "Please enter a valid website URL (e.g., https://example.com)."
    },
    {
      pattern: /crawl|scrape|fetch.*content/i,
      title: "Analysis Paused",
      message: "We had trouble accessing this site. It might be blocked or temporarily down."
    }
  ];

/**
 * Extracts error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'An unknown error occurred';
}

/**
 * Converts any error into a user-friendly message
 * 
 * @param error - The raw error from catch blocks
 * @returns User-friendly error with title and message
 * 
 * @example
 * try {
 *   await fetchData();
 * } catch (err) {
 *   const friendly = toUserMessage(err);
 *   toast.error(friendly.title, friendly.message);
 *   console.error(friendly.originalError); // For debugging
 * }
 */
export function toUserMessage(error: unknown): UserFriendlyError {
  const rawMessage = getErrorMessage(error);

  // Check against known patterns
  for (const { pattern, title, message, isRateLimit } of ERROR_PATTERNS) {
    const matches = typeof pattern === 'string'
      ? rawMessage.toLowerCase().includes(pattern.toLowerCase())
      : pattern.test(rawMessage);

    if (matches) {
      return { title, message, isRateLimit, originalError: error };
    }
  }

  // Default fallback
  return {
    title: "Something Went Wrong",
    message: "An unexpected error occurred. Please try again or contact support if the issue persists.",
    originalError: error
  };
}

/**
 * Get the technical error message for logging (not user-facing)
 * 
 * Use this for console.error and server logs, NOT for displaying to users.
 */
export function getTechnicalErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object') {
    if ('message' in error) {
      return String((error as { message: unknown }).message);
    }
    try {
      return JSON.stringify(error);
    } catch {
      return '[Unserializable error object]';
    }
  }
  return String(error);
}

/**
 * Generates a short error ID for user reference and support tickets
 */
export function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `ERR-${timestamp}-${random}`.toUpperCase();
}

/**
 * Logs error with context (for console/Sentry)
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const errorId = generateErrorId();
  console.error(`[${errorId}]`, error, context);

  const err = error instanceof Error ? error : new Error(getErrorMessage(error));
  captureError(err, { errorId, ...context });
}
