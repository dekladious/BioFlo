/**
 * Test setup file
 * Runs before all tests
 */

// Mock environment variables for tests
process.env.NODE_ENV = "test";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

