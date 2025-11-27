import { logger } from "@/lib/logger";
import { streamModel, ModelError } from "@/lib/ai/modelRouter";

export type SendFn = (payload: Record<string, unknown>) => void;

/**
 * Create an NDJSON streaming Response that pushes tokens/meta/error messages.
 */
export function createStreamResponse({
  requestId,
  headers,
  streamHandler,
  abortSignal,
}: {
  requestId: string;
  headers: Record<string, string>;
  streamHandler: (send: SendFn) => Promise<void>;
  abortSignal?: AbortSignal;
}) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      if (abortSignal) {
        abortSignal.addEventListener("abort", () => {
          try {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  requestId,
                  type: "error",
                  error: "Request aborted",
                }) + "\n"
              )
            );
            controller.close();
          } catch {
            // stream already closed
          }
        });
      }

      const send: SendFn = (payload) => {
        if (abortSignal?.aborted) {
          controller.close();
          return;
        }
        try {
          controller.enqueue(
            encoder.encode(JSON.stringify({ requestId, ...payload }) + "\n")
          );
        } catch {
          // ignore once closed
        }
      };

      streamHandler(send)
        .then(() => {
          if (!abortSignal?.aborted) {
            controller.close();
          }
        })
        .catch((error) => {
          if (abortSignal?.aborted) {
            controller.close();
            return;
          }
          const message = error instanceof Error ? error.message : "Unknown error";
          try {
            send({ type: "error", error: message });
            controller.close();
          } catch {
            // ignore
          }
        });
    },
    cancel() {
      logger.debug("Stream cancelled", { requestId });
    },
  });

  return new Response(stream, {
    headers: {
      ...headers,
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Emit text tokens with a small delay to simulate streaming.
 */
export async function streamTextChunks(text: string, send: SendFn) {
  const chunkSize = 120;
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    if (chunk) {
      send({ type: "token", value: chunk });
    }
    await delay(20);
  }
}

/**
 * Stream using the preferred provider, falling back to Anthropic if OpenAI fails.
 */
export async function streamWithFallback({
  provider,
  system,
  messages,
  timeout,
  maxTokens,
  onToken,
}: {
  provider: "anthropic" | "openai";
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  timeout: number;
  maxTokens: number;
  onToken: (token: string) => void;
}): Promise<"anthropic" | "openai"> {
  let currentProvider = provider;
  try {
    await streamModel({
      provider: currentProvider,
      system,
      messages,
      timeout,
      maxTokens,
      onToken,
    });
    return currentProvider;
  } catch (error) {
    if (
      currentProvider === "openai" &&
      process.env.ANTHROPIC_API_KEY &&
      error instanceof ModelError
    ) {
      logger.warn("OpenAI streaming failed, falling back to Anthropic", {
        error: error.message,
      });
      currentProvider = "anthropic";
      await streamModel({
        provider: currentProvider,
        system,
        messages,
        timeout,
        maxTokens,
        onToken,
      });
      return currentProvider;
    }
    throw error;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}




