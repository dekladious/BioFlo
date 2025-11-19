/**
 * BioFlo LLM Client
 * 
 * Simple wrapper around OpenAI API for BioFlo chat interactions.
 */

import OpenAI from "openai";
import { buildBiofloMessages } from "./biofloPrompt";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export type BiofloChatInput = {
  userMessages: { role: "user" | "assistant"; content: string }[];
  ragContext?: string;
  sleepMode?: boolean;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

/**
 * Chat with BioFlo using OpenAI
 * 
 * @param input - Chat input parameters
 * @returns Assistant reply text
 */
export async function biofloChat(input: BiofloChatInput): Promise<string> {
  const {
    userMessages,
    ragContext,
    sleepMode = false,
    model = "gpt-5", // Default to GPT-5, can be overridden
    temperature = 0.4,
    maxTokens = 1200,
  } = input;

  const messages = buildBiofloMessages({
    userMessages,
    ragContext,
    sleepMode,
  });

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    });

    return completion.choices[0]?.message?.content ?? "";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`BioFlo chat error: ${errorMessage}`);
  }
}

