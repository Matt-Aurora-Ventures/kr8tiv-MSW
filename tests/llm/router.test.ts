/**
 * LLM Router Unit Tests
 *
 * Tests for the multi-provider LLM routing module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for Ollama health check
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Store mock implementations
const mockIsGeminiAvailable = vi.fn();
const mockScoreRelevanceWithGemini = vi.fn();
const mockResearchWithGemini = vi.fn();
const mockOllamaChat = vi.fn();
const mockRelevanceScorerScore = vi.fn();

// Mock Gemini provider
vi.mock('../../src/llm/gemini-provider.js', () => ({
  isGeminiAvailable: () => mockIsGeminiAvailable(),
  scoreRelevanceWithGemini: (...args: unknown[]) => mockScoreRelevanceWithGemini(...args),
  researchWithGemini: (...args: unknown[]) => mockResearchWithGemini(...args),
}));

// Mock RelevanceScorer
vi.mock('../../src/auto-conversation/relevance-scorer.js', () => ({
  RelevanceScorer: class {
    async score(...args: unknown[]) {
      return mockRelevanceScorerScore(...args);
    }
  },
}));

// Mock Ollama
vi.mock('ollama', () => ({
  default: {
    chat: (...args: unknown[]) => mockOllamaChat(...args),
  },
}));

// Import after mocking
import {
  checkProviders,
  scoreRelevance,
  research,
  getProviderStatus,
  clearProviderCache,
} from '../../src/llm/router.js';

describe('LLM Router', () => {
  beforeEach(() => {
    // Reset ALL mocks completely
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockIsGeminiAvailable.mockReset();
    mockScoreRelevanceWithGemini.mockReset();
    mockResearchWithGemini.mockReset();
    mockOllamaChat.mockReset();
    mockRelevanceScorerScore.mockReset();
    clearProviderCache(); // Clear cache between tests
  });

  describe('checkProviders', () => {
    it('detects Ollama as available when endpoint responds', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      mockIsGeminiAvailable.mockResolvedValueOnce(false);

      const status = await checkProviders();

      expect(status.ollama).toBe(true);
      expect(status.preferred).toBe('ollama');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('detects Gemini as available when CLI is installed', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      mockIsGeminiAvailable.mockResolvedValueOnce(true);

      const status = await checkProviders();

      expect(status.ollama).toBe(false);
      expect(status.gemini).toBe(true);
      expect(status.preferred).toBe('gemini');
    });

    it('returns none when no providers available', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      mockIsGeminiAvailable.mockResolvedValueOnce(false);

      const status = await checkProviders();

      expect(status.ollama).toBe(false);
      expect(status.gemini).toBe(false);
      expect(status.preferred).toBe('none');
    });

    it('prefers Ollama over Gemini when both available', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      mockIsGeminiAvailable.mockResolvedValueOnce(true);

      const status = await checkProviders();

      expect(status.ollama).toBe(true);
      expect(status.gemini).toBe(true);
      expect(status.preferred).toBe('ollama'); // Ollama preferred
    });

    it('caches status for subsequent calls', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      mockIsGeminiAvailable.mockResolvedValue(false);

      // First call
      await checkProviders();

      // Second call - should use cache
      await checkProviders();

      // Fetch should only be called once due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('refreshes cache after TTL expires', async () => {
      mockFetch.mockResolvedValue({ ok: true });
      mockIsGeminiAvailable.mockResolvedValue(false);

      // First call
      await checkProviders();

      // Clear cache to simulate TTL expiry
      clearProviderCache();

      // Second call - should check again
      await checkProviders();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('scoreRelevance', () => {
    it('uses Ollama when available', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      mockIsGeminiAvailable.mockResolvedValueOnce(false);
      mockRelevanceScorerScore.mockResolvedValueOnce({
        score: 75,
        reasoning: 'Test reasoning',
      });

      const result = await scoreRelevance('topic', 'goal', 'error', ['prev']);

      // Should have used RelevanceScorer (Ollama-based)
      expect(result.total).toBe(75);
      expect(result.reasoning).toBe('Test reasoning');
      expect(mockRelevanceScorerScore).toHaveBeenCalled();
    });

    it('falls back to Gemini when Ollama unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      mockIsGeminiAvailable.mockResolvedValueOnce(true);
      mockScoreRelevanceWithGemini.mockResolvedValueOnce({
        taskRelevance: 30,
        errorRelevance: 20,
        implementationValue: 15,
        novelty: 5,
        total: 70,
        reasoning: 'Gemini scored',
      });

      const result = await scoreRelevance('topic', 'goal', 'error', ['prev']);

      expect(mockScoreRelevanceWithGemini).toHaveBeenCalled();
      expect(result.total).toBe(70);
      expect(result.reasoning).toBe('Gemini scored');
    });

    it('returns zero score when no providers available', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      mockIsGeminiAvailable.mockResolvedValueOnce(false);

      const result = await scoreRelevance('topic', 'goal', null, []);

      expect(result.total).toBe(0);
      expect(result.reasoning).toContain('No LLM providers');
    });
  });

  describe('research', () => {
    it('prefers Gemini for research when Ollama unavailable', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Ollama down'));
      mockIsGeminiAvailable.mockResolvedValueOnce(true);
      mockResearchWithGemini.mockResolvedValueOnce('Gemini research result');

      const result = await research('test query');

      expect(mockResearchWithGemini).toHaveBeenCalledWith('test query', undefined);
      expect(result).toBe('Gemini research result');
    });

    it('uses Ollama for research when Gemini unavailable', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      mockIsGeminiAvailable.mockResolvedValueOnce(false);
      mockOllamaChat.mockResolvedValueOnce({
        message: { content: 'Ollama response' },
      });

      const result = await research('test query');

      expect(result).toBe('Ollama response');
      expect(mockOllamaChat).toHaveBeenCalled();
    });

    it('passes context to Gemini provider', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      mockIsGeminiAvailable.mockResolvedValueOnce(true);
      mockResearchWithGemini.mockResolvedValueOnce('Result with context');

      const result = await research('query', 'context info');

      expect(mockResearchWithGemini).toHaveBeenCalledWith('query', 'context info');
      expect(result).toBe('Result with context');
    });

    it('returns error when no providers available', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      mockIsGeminiAvailable.mockResolvedValueOnce(false);

      const result = await research('query');

      expect(result).toContain('Error');
      expect(result).toContain('No LLM providers');
    });
  });

  describe('getProviderStatus', () => {
    it('returns null before first check', () => {
      const status = getProviderStatus();
      expect(status).toBeNull();
    });

    it('returns cached status after check', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      mockIsGeminiAvailable.mockResolvedValueOnce(true);

      await checkProviders();
      const status = getProviderStatus();

      expect(status).not.toBeNull();
      expect(status?.ollama).toBe(true);
      expect(status?.gemini).toBe(true);
    });
  });

  describe('clearProviderCache', () => {
    it('clears cached status', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      mockIsGeminiAvailable.mockResolvedValueOnce(false);

      await checkProviders();
      expect(getProviderStatus()).not.toBeNull();

      clearProviderCache();
      expect(getProviderStatus()).toBeNull();
    });
  });
});
