// Type definitions for BioFlo

export interface UserMetadata {
  isPro?: boolean;
}

export interface StripeMetadata {
  stripeCustomerId?: string;
}

export type MessageRole = "user" | "assistant";

export interface Message {
  role: MessageRole;
  content: string;
}

export interface ClerkUser {
  id: string;
  emailAddresses?: Array<{ id: string; emailAddress: string }>;
  primaryEmailAddressId?: string;
  publicMetadata?: UserMetadata;
  privateMetadata?: StripeMetadata;
}

// Type-safe Clerk user metadata
export interface ClerkPublicMetadata extends Record<string, unknown> {
  isPro?: boolean;
}

export interface ClerkPrivateMetadata extends Record<string, unknown> {
  stripeCustomerId?: string;
}

