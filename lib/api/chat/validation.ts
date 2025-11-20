import { CHAT } from "@/lib/constants";

export class ChatValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatValidationError";
  }
}

export type NormalizedMessage = {
  role: "user" | "assistant";
  content: string;
};

type RawMessage = {
  role?: string;
  content?: unknown;
};

type ValidationResult = {
  normalizedMessages: NormalizedMessage[];
  latestUserMessage: string;
};

export function validateAndNormalizeMessages(raw: unknown): ValidationResult {
  if (!Array.isArray(raw)) {
    throw new ChatValidationError("Messages must be an array");
  }

  if (raw.length === 0) {
    throw new ChatValidationError("Messages cannot be empty");
  }

  if (raw.length > CHAT.MAX_MESSAGES) {
    throw new ChatValidationError(`Maximum ${CHAT.MAX_MESSAGES} messages allowed`);
  }

  const normalizedMessages: NormalizedMessage[] = [];
  let latestUserMessage = "";

  for (const msg of raw) {
    if (!msg || typeof msg !== "object") {
      throw new ChatValidationError("Invalid message format");
    }

    const { role, content } = msg as RawMessage;

    if (!role || typeof content !== "string") {
      throw new ChatValidationError("Invalid message format");
    }

    if (content.length > CHAT.MAX_MESSAGE_LENGTH) {
      throw new ChatValidationError(
        `Message too long (max ${CHAT.MAX_MESSAGE_LENGTH} characters)`
      );
    }

    const normalizedRole: NormalizedMessage["role"] =
      role === "assistant" ? "assistant" : "user";

    normalizedMessages.push({
      role: normalizedRole,
      content,
    });

    if (role === "user" && content.trim()) {
      latestUserMessage = content;
    }
  }

  if (!latestUserMessage.trim()) {
    throw new ChatValidationError("No user message found");
  }

  return { normalizedMessages, latestUserMessage };
}

