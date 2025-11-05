// Input validation utilities

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Validate email format
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "Invalid email format" };
  }
  
  return { valid: true };
}

// Validate message content
export function validateMessageContent(content: string, maxLength: number): ValidationResult {
  if (!content || typeof content !== "string") {
    return { valid: false, error: "Message content is required" };
  }
  
  if (content.trim().length === 0) {
    return { valid: false, error: "Message cannot be empty" };
  }
  
  if (content.length > maxLength) {
    return { valid: false, error: `Message exceeds maximum length of ${maxLength} characters` };
  }
  
  return { valid: true };
}

// Validate message role
export function validateMessageRole(role: string): ValidationResult {
  if (!role || typeof role !== "string") {
    return { valid: false, error: "Message role is required" };
  }
  
  if (!["user", "assistant", "system"].includes(role)) {
    return { valid: false, error: "Invalid message role" };
  }
  
  return { valid: true };
}

