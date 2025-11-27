/**
 * API Utility Functions
 * 
 * Enterprise-grade utilities for:
 * - Request tracking and logging
 * - Standardized response formats
 * - Retry logic with exponential backoff
 * - Request timeouts
 * - Input validation helpers
 * 
 * @module lib/api-utils
 */

import { logger } from "./logger";
import { HTTP_STATUS } from "./constants";

// ============================================
// Request Tracking
// ============================================

/**
 * Generate unique request ID for distributed tracing
 * Format: req_<timestamp>_<random>
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Standard API response format
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
  timestamp: string;
}

export function createSuccessResponse<T>(data: T, requestId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(
  error: string,
  requestId?: string,
  statusCode: number = 500
): Response {
  return Response.json(
    {
      success: false,
      error,
      requestId,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

// Validate Content-Type
export function validateContentType(req: Request, expected: string = "application/json"): boolean {
  const contentType = req.headers.get("content-type");
  return contentType?.includes(expected) ?? false;
}

// Get request metadata
export function getRequestMetadata(req: Request): {
  ip: string;
  userAgent: string;
  requestId: string;
} {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const userAgent = req.headers.get("user-agent") || "unknown";
  const requestId = req.headers.get("x-request-id") || generateRequestId();

  return { ip, userAgent, requestId };
}

// Request timeout wrapper
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Request timeout"
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );

  return Promise.race([promise, timeoutPromise]);
}

/**
 * Retry logic with exponential backoff
 * 
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param initialDelay - Initial delay in ms (default: 1000)
 * @returns Result of successful function call
 * @throws Last error after all retries exhausted
 * 
 * @example
 * const data = await retryWithBackoff(
 *   () => fetch("https://api.example.com"),
 *   3,
 *   1000
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on certain errors
      if (isNonRetryableError(error)) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 100; // Add jitter to prevent thundering herd
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        
        logger.debug(`Retry attempt ${attempt + 1}/${maxRetries}`, {
          delay: delay + jitter,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  throw lastError;
}

/**
 * Check if error should not be retried
 */
function isNonRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Don't retry auth errors or bad requests
    if (error.message.includes("401") || 
        error.message.includes("403") || 
        error.message.includes("400")) {
      return true;
    }
  }
  return false;
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate that required fields are present in an object
 * 
 * @param obj - Object to validate
 * @param fields - Required field names
 * @returns Object with validation result
 */
export function validateRequired(
  obj: Record<string, unknown>,
  fields: string[]
): { valid: boolean; missing: string[] } {
  const missing = fields.filter(
    field => obj[field] === undefined || obj[field] === null || obj[field] === ""
  );
  return { valid: missing.length === 0, missing };
}

/**
 * Validate number is within range
 */
export function validateRange(
  value: unknown,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (typeof value !== "number" || isNaN(value)) {
    return { valid: false, error: "Must be a number" };
  }
  if (value < min || value > max) {
    return { valid: false, error: `Must be between ${min} and ${max}` };
  }
  return { valid: true };
}

/**
 * Sanitize string input (basic XSS prevention)
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, "") // Remove angle brackets
    .trim();
}

// ============================================
// Response Helpers
// ============================================

/**
 * Create JSON response with consistent structure
 */
export function jsonResponse<T>(
  data: T,
  status: number = HTTP_STATUS.OK,
  requestId?: string
): Response {
  return Response.json(
    {
      success: status >= 200 && status < 300,
      data,
      requestId,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

