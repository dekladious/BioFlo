import { auth, currentUser } from "@clerk/nextjs/server";
import { getRequestMetadata, validateContentType, createErrorResponse } from "@/lib/api-utils";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { ClerkPublicMetadata } from "@/types";

type GuardOptions = {
  requireSubscription?: boolean;
};

type GuardSuccess = {
  ok: true;
  userId: string;
  ip: string;
  requestId: string;
  responseHeaders: Record<string, string>;
};

type GuardFailure = {
  ok: false;
  response: Response;
};

export async function enforceChatGuards(
  req: Request,
  options: GuardOptions = {}
): Promise<GuardSuccess | GuardFailure> {
  const { requireSubscription = true } = options;
  const { ip, requestId } = getRequestMetadata(req);

  if (!validateContentType(req)) {
    logger.warn("Chat guard: Invalid Content-Type", { requestId, ip });
    return {
      ok: false,
      response: createErrorResponse("Content-Type must be application/json", requestId, 400),
    };
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
    logger.warn("Chat guard: Request too large", { requestId, contentLength });
    return {
      ok: false,
      response: createErrorResponse("Request payload too large", requestId, 413),
    };
  }

  const { userId } = await auth();
  if (!userId) {
    logger.warn("Chat guard: Unauthorized request", { requestId, ip });
    return {
      ok: false,
      response: createErrorResponse("Unauthorized", requestId, 401),
    };
  }

  const disableRateLimit =
    process.env.DISABLE_RATE_LIMIT === "true" || process.env.DISABLE_RATE_LIMIT === "1";
  const isDevelopment = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

  let responseHeaders: Record<string, string>;

  if (disableRateLimit && isDevelopment) {
    logger.info("Chat guard: Rate limiting disabled in development", { userId, requestId });
    responseHeaders = {
      "X-RateLimit-Limit": String(RATE_LIMITS.CHAT.maxRequests),
      "X-RateLimit-Remaining": String(RATE_LIMITS.CHAT.maxRequests),
      "X-RateLimit-Reset": String(Date.now() + RATE_LIMITS.CHAT.windowMs),
      "X-Request-Id": requestId,
    };
  } else {
    const identifier = getRateLimitIdentifier(userId, ip);
    const rateResult = rateLimit(identifier, RATE_LIMITS.CHAT);

    if (!rateResult.success) {
      logger.warn("Chat guard: Rate limit exceeded", {
        userId,
        identifier,
        retryAfter: rateResult.retryAfter,
        requestId,
      });
      return {
        ok: false,
        response: Response.json(
          {
            success: false,
            error: `Rate limit exceeded. You've used ${RATE_LIMITS.CHAT.maxRequests} requests. Please try again in ${Math.ceil(
              (rateResult.retryAfter || 0) / 60
            )} minute${Math.ceil((rateResult.retryAfter || 0) / 60) !== 1 ? "s" : ""}.`,
            retryAfter: rateResult.retryAfter,
            requestId,
            timestamp: new Date().toISOString(),
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateResult.retryAfter || 0),
              "X-RateLimit-Limit": String(RATE_LIMITS.CHAT.maxRequests),
              "X-RateLimit-Remaining": String(rateResult.remaining),
              "X-RateLimit-Reset": String(rateResult.resetAt),
              "X-Request-Id": requestId,
            },
          }
        ),
      };
    }

    responseHeaders = {
      "X-RateLimit-Limit": String(RATE_LIMITS.CHAT.maxRequests),
      "X-RateLimit-Remaining": String(rateResult.remaining ?? 0),
      "X-RateLimit-Reset": String(rateResult.resetAt ?? Date.now()),
      "X-Request-Id": requestId,
    };
  }

  if (requireSubscription) {
    const user = await currentUser();
    const isPro = Boolean((user?.publicMetadata as ClerkPublicMetadata)?.isPro);
    const bypassPaywall = process.env.BYPASS_PAYWALL === "true";

    if (!isPro && !bypassPaywall) {
      logger.info("Chat guard: Subscription required", { userId, requestId });
      return {
        ok: false,
        response: createErrorResponse("Subscription required", requestId, 402),
      };
    }
  }

  return {
    ok: true,
    userId,
    ip,
    requestId,
    responseHeaders,
  };
}

