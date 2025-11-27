/**
 * Fallback Generator
 * 
 * Tries OpenAI first, falls back to Anthropic if OpenAI fails.
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function generateWithFallback(params: {
  userQuestion: string;
  systemPrompt: string;
  messages: { role: "user" | "assistant" | "system"; content: string }[];
  mainModel: string; // openai model
  judgeModel?: string; // anthropic model (used as fallback generator)
}): Promise<string> {
  const { systemPrompt, messages, mainModel, judgeModel } = params;

  // Try OpenAI first
  try {
    const openai = new OpenAI({ apiKey: env.openai.apiKey() });

    // Filter out system messages (OpenAI handles it separately)
    const conversationMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));

    const completion = await openai.chat.completions.create({
      model: mainModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationMessages,
      ],
      temperature: 0.4,
      max_completion_tokens: 2000,
    });

    const content = completion.choices[0]?.message?.content;
    if (content && content.trim()) {
      return content;
    }

    throw new Error("Empty response from OpenAI");
  } catch (openaiError) {
    logger.warn("OpenAI generation failed, trying Anthropic fallback", {
      error: openaiError instanceof Error ? openaiError.message : String(openaiError),
      mainModel,
    });

    // Fallback to Anthropic if judgeModel is provided
    if (!judgeModel) {
      throw new Error(`OpenAI failed and no fallback model provided: ${openaiError instanceof Error ? openaiError.message : String(openaiError)}`);
    }

    try {
      const anthropic = new Anthropic({ apiKey: env.anthropic.apiKey() });

      // Convert messages to Anthropic format
      const anthropicMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
      
      for (const msg of messages) {
        if (msg.role === "system") {
          // System prompt is handled separately in Anthropic
          continue;
        }
        anthropicMessages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content,
        });
      }

      const message = await anthropic.messages.create({
        model: judgeModel,
        max_tokens: 2000,
        system: systemPrompt,
        messages: anthropicMessages,
      });

      const content = message.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type from Anthropic");
      }

      return content.text;
    } catch (anthropicError) {
      logger.error("Anthropic fallback also failed", {
        error: anthropicError instanceof Error ? anthropicError.message : String(anthropicError),
      });
      throw new Error(
        `Both OpenAI and Anthropic failed: ${anthropicError instanceof Error ? anthropicError.message : String(anthropicError)}`
      );
    }
  }
}

