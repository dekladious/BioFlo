// Health check endpoint

import { validateEnv } from "@/lib/env";
import { getRequestMetadata } from "@/lib/api-utils";

export async function GET(req: Request) {
  const { requestId } = getRequestMetadata(req);
  const envCheck = validateEnv();
  
  return Response.json({
    success: true,
    data: {
      status: "ok",
      environment: {
        valid: envCheck.valid,
        missing: envCheck.missing,
      },
    },
    requestId,
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      "X-Request-Id": requestId,
      "Content-Type": "application/json",
    },
  });
}

