import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { retryWithBackoff } from "@/lib/api-utils";

type Provider = "openai" | "anthropic";

export type RunModelArgs = {
  provider?: Provider;
  model?: string;            // override per call
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  timeout?: number;
  maxTokens?: number;
};

// Default models (latest stable versions)
export const DEFAULT_MODELS = {
  openai: "gpt-4o", // Latest GPT-4o model
  anthropic: "claude-sonnet-4-5", // Latest Claude Sonnet 4.5
} as const;

// Custom error classes for better error handling
export class ModelError extends Error {
  constructor(
    message: string,
    public provider: Provider,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "ModelError";
  }
}

export async function runModel({ 
  provider = "openai", 
  model, 
  system, 
  messages,
  timeout = 30000,
  maxTokens = 2000,
}: RunModelArgs): Promise<string> {
  try {
    if (provider === "openai") {
      return await runOpenAI({ model, system, messages, timeout, maxTokens });
    }

    if (provider === "anthropic") {
      return await runAnthropic({ model, system, messages, timeout, maxTokens });
    }

    throw new ModelError("No provider configured", provider, "NO_PROVIDER");
  } catch (error: unknown) {
    if (error instanceof ModelError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Model router error (${provider})`, error);
    throw new ModelError(
      `Failed to generate response: ${errorMessage}`,
      provider,
      "API_ERROR"
    );
  }
}

async function runOpenAI({
  model,
  system,
  messages,
  timeout,
  maxTokens,
}: Omit<RunModelArgs, "provider">): Promise<string> {
  const apiKey = env.openai.apiKey();
  if (!apiKey) {
    throw new ModelError("OPENAI_API_KEY is not configured", "openai", "MISSING_API_KEY");
  }

  const client = new OpenAI({ 
    apiKey,
    timeout,
    maxRetries: 2,
  });

  try {
    const completion = await retryWithBackoff(
      () => client.chat.completions.create({
        model: model ?? DEFAULT_MODELS.openai,
        messages: [
          { role: "system", content: system },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
      2, // max retries
      1000 // initial delay
    );

    const text = completion.choices[0]?.message?.content;
    if (!text) {
      throw new ModelError("No response content from OpenAI", "openai", "NO_CONTENT");
    }

    logger.debug("OpenAI API call successful", {
      model: model ?? DEFAULT_MODELS.openai,
      tokens: completion.usage?.total_tokens,
    });

    return text;
  } catch (error: unknown) {
    if (error instanceof OpenAI.APIError) {
      // Handle OpenAI-specific errors
      if (error.status === 429) {
        throw new ModelError("Rate limit exceeded. Please try again later.", "openai", "RATE_LIMIT", 429);
      }
      if (error.status === 401) {
        throw new ModelError("Invalid API key", "openai", "AUTH_ERROR", 401);
      }
      throw new ModelError(
        `OpenAI API error: ${error.message}`,
        "openai",
        "API_ERROR",
        error.status
      );
    }
    throw error;
  }
}

async function runAnthropic({
  model,
  system,
  messages,
  timeout,
  maxTokens,
}: Omit<RunModelArgs, "provider">): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ModelError("ANTHROPIC_API_KEY is not configured", "anthropic", "MISSING_API_KEY");
  }

  const client = new Anthropic({ 
    apiKey,
    timeoutMs: timeout,
  });

  try {
    const resp = await retryWithBackoff(
      () => client.messages.create({
        model: model ?? DEFAULT_MODELS.anthropic,
        max_tokens: maxTokens,
        system,
        messages: messages.map(m => ({ 
          role: m.role === "assistant" ? "assistant" : "user", 
          content: m.content 
        })),
      }),
      2,
      1000
    );
    
    const text = resp.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("\n")
      .trim();
    
    if (!text) {
      throw new ModelError("No response content from Anthropic", "anthropic", "NO_CONTENT");
    }

    logger.debug("Anthropic API call successful", {
      model: model ?? DEFAULT_MODELS.anthropic,
      tokens: resp.usage?.input_tokens && resp.usage?.output_tokens 
        ? resp.usage.input_tokens + resp.usage.output_tokens 
        : undefined,
    });

    return text;
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        throw new ModelError("Rate limit exceeded. Please try again later.", "anthropic", "RATE_LIMIT", 429);
      }
      if (error.message.includes("authentication") || error.message.includes("401")) {
        throw new ModelError("Invalid API key", "anthropic", "AUTH_ERROR", 401);
      }
      throw new ModelError(
        `Anthropic API error: ${error.message}`,
        "anthropic",
        "API_ERROR"
      );
    }
    throw error;
  }
}
