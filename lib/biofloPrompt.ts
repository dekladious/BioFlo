/**
 * BioFlo Prompt Builder
 * 
 * Centralized prompt construction for BioFlo chat interactions.
 * Uses the master system prompt and integrates RAG context.
 */

import { BIOFLO_MASTER_SYSTEM_PROMPT } from "./ai/prompts/master";
import { getTopicModule } from "./ai/prompts/topicModules";
import { USER_ADAPTATION_INSTRUCTIONS, RAG_CONTEXT_INSTRUCTIONS } from "./ai/prompts/adaptation";

/**
 * Export the BioFlo system prompt constant
 */
export const BIOFLO_SYSTEM_PROMPT = BIOFLO_MASTER_SYSTEM_PROMPT;

/**
 * Build BioFlo messages array for LLM consumption
 * 
 * @param params.userMessages - Array of user/assistant messages from the conversation
 * @param params.ragContext - Optional RAG context string from Supabase documents
 * @param params.sleepMode - Optional flag to use sleep coach mode
 * @returns Formatted messages array ready for OpenAI API
 */
export function buildBiofloMessages(params: {
  userMessages: { role: "user" | "assistant" | "system"; content: string }[];
  ragContext?: string;
  sleepMode?: boolean;
}): { role: "system" | "user" | "assistant"; content: string }[] {
  const { userMessages, ragContext, sleepMode = false } = params;
  
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];
  
  // Start with the base system prompt
  let systemPrompt = BIOFLO_SYSTEM_PROMPT;
  
  // Detect topic module from latest user message
  const latestUserMessage = userMessages
    .filter(m => m.role === "user")
    .slice(-1)[0]?.content || "";
  
  if (!sleepMode && latestUserMessage) {
    const topicModule = getTopicModule(latestUserMessage);
    if (topicModule) {
      systemPrompt = `${systemPrompt}\n\n${topicModule}`;
    }
  }
  
  // Add user adaptation instructions
  systemPrompt = `${systemPrompt}\n\n${USER_ADAPTATION_INSTRUCTIONS}`;
  
  // Add RAG context if provided
  if (ragContext && ragContext.trim()) {
    systemPrompt = `${systemPrompt}\n\n${RAG_CONTEXT_INSTRUCTIONS}\n\nRAG_CONTEXT\n${ragContext}\n\nUse this context to improve factual accuracy, but do not mention RAG or sources explicitly.`;
  }
  
  // Add system message
  messages.push({
    role: "system",
    content: systemPrompt,
  });
  
  // Filter out system messages from userMessages and append the rest
  const conversationMessages = userMessages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "assistant" as const : "user" as const,
      content: m.content,
    }));
  
  messages.push(...conversationMessages);
  
  return messages;
}

