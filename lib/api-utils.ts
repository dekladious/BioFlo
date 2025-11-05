// API utility functions for enterprise-grade features

import { logger } from "./logger";

// Generate request ID for tracking
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

// Retry logic with exponential backoff
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
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

