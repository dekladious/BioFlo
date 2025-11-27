/**
 * BioFlo LLM Client
 * 
 * Simple wrapper around OpenAI API for BioFlo chat interactions.
 * Now includes user context (habits, supplements, check-ins, experiments).
 */

import OpenAI from "openai";
import { buildBiofloMessages } from "./biofloPrompt";
import { getFullUserContext, buildContextSummary } from "./utils/context-summaries";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export type BiofloChatInput = {
  userMessages: { role: "user" | "assistant"; content: string }[];
  userId?: string; // Optional user ID to fetch context
  ragContext?: string;
  userContext?: string; // Pre-built user context (or will be fetched if userId provided)
  sleepMode?: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

/**
 * Chat with BioFlo using OpenAI
 * 
 * Now automatically includes user context (habits, supplements, check-ins, experiments)
 * when a userId is provided.
 * 
 * @param input - Chat input parameters
 * @returns Assistant reply text
 */
export async function biofloChat(input: BiofloChatInput): Promise<string> {
  const {
    userMessages,
    userId,
    ragContext,
    userContext: providedContext,
    sleepMode = false,
    model = "gpt-4o", // Default to GPT-4o
    temperature = 0.4,
    maxTokens = 1200,
  } = input;

  // Fetch user context if userId provided and no context already passed
  let userContext = providedContext;
  if (userId && !userContext) {
    try {
      const fullContext = await getFullUserContext(userId);
      userContext = buildContextSummary(fullContext);
    } catch (error) {
      // Silently fail - chat should work without context
      console.error("Failed to fetch user context:", error);
    }
  }

  const messages = buildBiofloMessages({
    userMessages,
    ragContext,
    userContext,
    sleepMode,
  });

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_completion_tokens: maxTokens,
    });

    return completion.choices[0]?.message?.content ?? "";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`BioFlo chat error: ${errorMessage}`);
  }
}

/**
 * Stream chat with BioFlo using OpenAI
 * 
 * @param input - Chat input parameters  
 * @returns AsyncIterable of text chunks
 */
export async function* biofloChatStream(input: BiofloChatInput): AsyncGenerator<string, void, unknown> {
  const {
    userMessages,
    userId,
    ragContext,
    userContext: providedContext,
    sleepMode = false,
    model = "gpt-4o",
    temperature = 0.4,
    maxTokens = 1200,
  } = input;

  // Fetch user context if userId provided and no context already passed
  let userContext = providedContext;
  if (userId && !userContext) {
    try {
      const fullContext = await getFullUserContext(userId);
      userContext = buildContextSummary(fullContext);
    } catch (error) {
      console.error("Failed to fetch user context:", error);
    }
  }

  const messages = buildBiofloMessages({
    userMessages,
    ragContext,
    userContext,
    sleepMode,
  });

  try {
    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_completion_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`BioFlo chat stream error: ${errorMessage}`);
  }
}
