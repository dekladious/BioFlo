import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai/classifier", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/classifier")>(
    "@/lib/ai/classifier"
  );
  return {
    ...actual,
    classifyRequest: vi.fn(),
  };
});

import {
  classifyRequest,
  detectDeterministicClassification,
  RequestClassification,
} from "@/lib/ai/classifier";
import { triageUserMessage } from "@/lib/ai/safety";

describe("Triage Classification", () => {
  const mockClassifyRequest = classifyRequest as ReturnType<typeof vi.fn>;

  const buildClassification = (
    overrides: Partial<RequestClassification>
  ): RequestClassification => ({
    topic: "general",
    complexity: "low",
    risk: "low",
    needs_rag: false,
    needs_wearables: false,
    allow_answer: true,
    ...overrides,
  });

  beforeEach(() => {
    mockClassifyRequest.mockReset();
  });

  function setClassification(overrides: Partial<RequestClassification>) {
    mockClassifyRequest.mockResolvedValue(buildClassification(overrides));
  }

  describe("MENTAL_HEALTH_CRISIS", () => {
    it("routes obvious crisis content", async () => {
      setClassification({
        topic: "emotional_crisis",
        complexity: "high",
        risk: "high",
        allow_answer: false,
      });
      const result = await triageUserMessage(
        "I don't want to live anymore, I'm planning to kill myself tonight."
      );
      expect(result.category).toBe("MENTAL_HEALTH_CRISIS");
    });
  });

  describe("MEDICAL_EMERGENCY_SIGNS", () => {
    it("routes acute medical content", async () => {
      setClassification({
        topic: "medical_acute",
        complexity: "high",
        risk: "high",
        allow_answer: false,
      });
      const result = await triageUserMessage(
        "I suddenly have crushing chest pain and it's hard to breathe."
      );
      expect(result.category).toBe("MEDICAL_EMERGENCY_SIGNS");
    });
  });

  describe("MEDICAL_SYMPTOMS_NON_URGENT", () => {
    it("routes non-urgent medical support", async () => {
      setClassification({
        topic: "condition_support",
        complexity: "medium",
        risk: "medium",
      });
      const result = await triageUserMessage(
        "My knees have a dull ache most days, what could be causing it?"
      );
      expect(result.category).toBe("MEDICAL_SYMPTOMS_NON_URGENT");
    });
  });

  describe("GENERAL_WELLNESS", () => {
    it("routes general questions", async () => {
      setClassification({
        topic: "general",
      });
      const result = await triageUserMessage("What can I do to fall asleep faster?");
      expect(result.category).toBe("GENERAL_WELLNESS");
    });
  });

  describe("MENTAL_HEALTH_NON_CRISIS", () => {
    it("routes mental health (non crisis)", async () => {
      setClassification({
        topic: "anxiety",
        complexity: "medium",
      });
      const result = await triageUserMessage("I'm overwhelmed and anxious lately.");
      expect(result.category).toBe("MENTAL_HEALTH_NON_CRISIS");
    });
  });

  describe("MODERATE_RISK_BIOHACK", () => {
    it("routes fasting questions to moderate risk", async () => {
      setClassification({
        topic: "fasting",
        risk: "medium",
        complexity: "medium",
      });
      const result = await triageUserMessage("How do I run a 3 day water fast?");
      expect(result.category).toBe("MODERATE_RISK_BIOHACK");
    });
  });

  describe("EXTREME_RISK_BIOHACK", () => {
    it("routes extreme requests correctly", async () => {
      setClassification({
        topic: "fasting",
        risk: "high",
        complexity: "high",
        allow_answer: false,
      });
      const result = await triageUserMessage("I want to do a 7 day dry fast.");
      expect(result.category).toBe("EXTREME_RISK_BIOHACK");
    });
  });

  describe("Edge Cases", () => {
    it("prioritizes crisis over other categories", async () => {
      setClassification({
        topic: "emotional_crisis",
        risk: "high",
        complexity: "high",
        allow_answer: false,
      });
      const result = await triageUserMessage("I'm stressed and want to hurt myself.");
      expect(result.category).toBe("MENTAL_HEALTH_CRISIS");
    });

    it("prioritizes emergency over non-urgent medical", async () => {
      setClassification({
        topic: "medical_acute",
        risk: "high",
        complexity: "high",
      });
      const result = await triageUserMessage("I have chest pain and trouble breathing.");
      expect(result.category).toBe("MEDICAL_EMERGENCY_SIGNS");
    });
  });

  describe("Deterministic keyword fallback", () => {
    it("detects suicide language without LLM", () => {
      const result = detectDeterministicClassification(
        "I want to kill myself tonight."
      );
      expect(result).toBeTruthy();
      expect(result?.topic).toBe("emotional_crisis");
      expect(result?.allow_answer).toBe(false);
    });

    it("detects emergency language without LLM", () => {
      const result = detectDeterministicClassification(
        "Crushing chest pain and can't breathe."
      );
      expect(result).toBeTruthy();
      expect(result?.topic).toBe("medical_acute");
    });
  });
});

