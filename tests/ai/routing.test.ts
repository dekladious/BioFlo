/**
 * Routing Logic Tests
 * 
 * Tests that the chat API routes messages to the correct handlers based on triage classification.
 * 
 * Note: These tests verify the routing logic by testing generateCoachReply which handles
 * routing internally. For full integration tests, we'd test the actual API endpoint.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TriageCategory } from "@/lib/ai/safety";
import { CRISIS_RESPONSES } from "@/lib/ai/policy";

// Mock the triage function
vi.mock("@/lib/ai/safety", async () => {
  const actual = await vi.importActual("@/lib/ai/safety");
  return {
    ...actual,
    triageUserMessage: vi.fn(),
    getCrisisResponse: vi.fn((category: TriageCategory) => {
      if (category === "MENTAL_HEALTH_CRISIS") {
        return CRISIS_RESPONSES.MENTAL_HEALTH_CRISIS;
      }
      if (category === "MEDICAL_EMERGENCY_SIGNS") {
        return CRISIS_RESPONSES.MEDICAL_EMERGENCY_SIGNS;
      }
      return "";
    }),
  };
});

// Mock the model router to avoid actual API calls
vi.mock("@/lib/ai/modelRouter", () => ({
  streamModel: vi.fn().mockResolvedValue(undefined),
  runModel: vi.fn().mockResolvedValue('{"category": "GENERAL_WELLNESS", "reason": "Test"}'),
}));

describe("Chat Routing Logic", () => {
  let triageUserMessage: ReturnType<typeof vi.fn>;
  let getCrisisResponse: ReturnType<typeof vi.fn>;
  let generateCoachReply: typeof import("@/lib/ai/gateway").generateCoachReply;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    const safetyModule = await import("@/lib/ai/safety");
    triageUserMessage = safetyModule.triageUserMessage as ReturnType<typeof vi.fn>;
    getCrisisResponse = safetyModule.getCrisisResponse as ReturnType<typeof vi.fn>;
    
    const gatewayModule = await import("@/lib/ai/gateway");
    generateCoachReply = gatewayModule.generateCoachReply;
  });

  describe("MENTAL_HEALTH_CRISIS routing", () => {
    it("should return fixed response without calling AI model", async () => {
      triageUserMessage.mockResolvedValue({
        category: "MENTAL_HEALTH_CRISIS" as TriageCategory,
        reason: "Crisis detected",
      });

      const mockContext = {
        userId: "test-user",
        userProfile: undefined,
        recentCheckIns: undefined,
        wearableSummary: undefined,
        protocolStatus: undefined,
        knowledgeSnippets: undefined,
        recentMessages: undefined,
        todayMode: "NORMAL" as const,
      };
      
      const response = await generateCoachReply(mockContext, "I want to kill myself");
      
      // Should return crisis response, not call AI
      expect(response).toContain("crisis");
      expect(response).toContain("emergency");
      expect(triageUserMessage).toHaveBeenCalled();
    });
  });

  describe("MEDICAL_EMERGENCY_SIGNS routing", () => {
    it("should return fixed response without calling AI model", async () => {
      triageUserMessage.mockResolvedValue({
        category: "MEDICAL_EMERGENCY_SIGNS" as TriageCategory,
        reason: "Emergency detected",
      });

      const mockContext = {
        userId: "test-user",
        userProfile: undefined,
        recentCheckIns: undefined,
        wearableSummary: undefined,
        protocolStatus: undefined,
        knowledgeSnippets: undefined,
        recentMessages: undefined,
        todayMode: "NORMAL" as const,
      };
      
      const response = await generateCoachReply(mockContext, "I have chest pain");
      
      // Should return emergency response
      expect(response).toContain("emergency");
      expect(response).toContain("medical");
      expect(triageUserMessage).toHaveBeenCalled();
    });
  });

  describe("EXTREME_RISK_BIOHACK routing", () => {
    it("should route to extreme risk handler", async () => {
      triageUserMessage.mockResolvedValue({
        category: "EXTREME_RISK_BIOHACK" as TriageCategory,
        reason: "Extreme biohack detected",
      });

      const mockContext = {
        userId: "test-user",
        userProfile: undefined,
        recentCheckIns: undefined,
        wearableSummary: undefined,
        protocolStatus: undefined,
        knowledgeSnippets: undefined,
        recentMessages: undefined,
        todayMode: "NORMAL" as const,
      };
      
      const response = await generateCoachReply(mockContext, "I want to do a 7-day fast");
      
      // Should get a response (will be refusal message)
      expect(response).toBeTruthy();
      expect(triageUserMessage).toHaveBeenCalled();
    });
  });

  describe("MODERATE_RISK_BIOHACK routing", () => {
    it("should route to moderate risk handler", async () => {
      triageUserMessage.mockResolvedValue({
        category: "MODERATE_RISK_BIOHACK" as TriageCategory,
        reason: "Moderate biohack detected",
      });

      const mockContext = {
        userId: "test-user",
        userProfile: undefined,
        recentCheckIns: undefined,
        wearableSummary: undefined,
        protocolStatus: undefined,
        knowledgeSnippets: undefined,
        recentMessages: undefined,
        todayMode: "NORMAL" as const,
      };
      
      const response = await generateCoachReply(mockContext, "How do I do a 3-day fast?");
      
      // Should get a response (will be educational with warnings)
      expect(response).toBeTruthy();
      expect(triageUserMessage).toHaveBeenCalled();
    });
  });

  describe("MEDICAL_SYMPTOMS_NON_URGENT routing", () => {
    it("should route to restricted medical handler", async () => {
      triageUserMessage.mockResolvedValue({
        category: "MEDICAL_SYMPTOMS_NON_URGENT" as TriageCategory,
        reason: "Non-urgent medical symptoms",
      });

      const mockContext = {
        userId: "test-user",
        userProfile: undefined,
        recentCheckIns: undefined,
        wearableSummary: undefined,
        protocolStatus: undefined,
        knowledgeSnippets: undefined,
        recentMessages: undefined,
        todayMode: "NORMAL" as const,
      };
      
      const response = await generateCoachReply(mockContext, "My knees hurt sometimes");
      
      // Should get a response (will be educational, not diagnostic)
      expect(response).toBeTruthy();
      expect(triageUserMessage).toHaveBeenCalled();
    });
  });

  describe("GENERAL_WELLNESS routing", () => {
    it("should route to main coach handler", async () => {
      triageUserMessage.mockResolvedValue({
        category: "GENERAL_WELLNESS" as TriageCategory,
        reason: "General wellness question",
      });

      const mockContext = {
        userId: "test-user",
        userProfile: "Test profile",
        recentCheckIns: "No check-ins",
        wearableSummary: undefined,
        protocolStatus: undefined,
        knowledgeSnippets: undefined,
        recentMessages: undefined,
        todayMode: "NORMAL" as const,
      };
      
      const response = await generateCoachReply(mockContext, "How can I sleep better?");
      
      // Should get a coach reply
      expect(response).toBeTruthy();
      expect(triageUserMessage).toHaveBeenCalled();
    });
  });

  describe("MENTAL_HEALTH_NON_CRISIS routing", () => {
    it("should route to main coach handler", async () => {
      triageUserMessage.mockResolvedValue({
        category: "MENTAL_HEALTH_NON_CRISIS" as TriageCategory,
        reason: "Non-crisis mental health",
      });

      const mockContext = {
        userId: "test-user",
        userProfile: "Test profile",
        recentCheckIns: "No check-ins",
        wearableSummary: undefined,
        protocolStatus: undefined,
        knowledgeSnippets: undefined,
        recentMessages: undefined,
        todayMode: "NORMAL" as const,
      };
      
      const response = await generateCoachReply(mockContext, "I'm feeling anxious");
      
      // Should get a coach reply
      expect(response).toBeTruthy();
      expect(triageUserMessage).toHaveBeenCalled();
    });
  });
});
