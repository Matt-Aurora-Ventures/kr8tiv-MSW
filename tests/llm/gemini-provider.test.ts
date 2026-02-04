/**
 * Gemini Provider Unit Tests
 *
 * Tests for the Gemini CLI integration module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

// Import after mocking
import {
  isGeminiAvailable,
  executeGeminiPrompt,
  scoreRelevanceWithGemini,
  researchWithGemini,
} from '../../src/llm/gemini-provider.js';

describe('Gemini Provider', () => {
  let mockProcess: Partial<ChildProcess>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock process
    mockProcess = {
      stdout: {
        on: vi.fn(),
      } as any,
      stderr: {
        on: vi.fn(),
      } as any,
      on: vi.fn(),
      kill: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('isGeminiAvailable', () => {
    it('returns true when gemini --version succeeds', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      // Simulate successful exit
      setTimeout(() => {
        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      const result = await isGeminiAvailable();
      expect(result).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith('gemini', ['--version'], { shell: true });
    });

    it('returns false when gemini --version fails', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      // Simulate failed exit
      setTimeout(() => {
        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(1);
      }, 10);

      const result = await isGeminiAvailable();
      expect(result).toBe(false);
    });

    it('returns false when spawn throws error', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      // Simulate error event
      setTimeout(() => {
        const errorCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'error'
        )?.[1];
        if (errorCallback) errorCallback(new Error('Command not found'));
      }, 10);

      const result = await isGeminiAvailable();
      expect(result).toBe(false);
    });
  });

  describe('executeGeminiPrompt', () => {
    it('executes prompt with default options', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      // Simulate stdout data
      setTimeout(() => {
        const stdoutCallback = (mockProcess.stdout?.on as ReturnType<typeof vi.fn>)?.mock.calls.find(
          (call) => call[0] === 'data'
        )?.[1];
        if (stdoutCallback) stdoutCallback(Buffer.from('Test response'));

        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      const result = await executeGeminiPrompt('Test prompt');

      expect(result.success).toBe(true);
      expect(result.content).toBe('Test response');
      expect(mockSpawn).toHaveBeenCalledWith('gemini', ['-p', 'Test prompt'], { shell: true });
    });

    it('passes model option when specified', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      setTimeout(() => {
        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      await executeGeminiPrompt('Test', { model: 'gemini-pro' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'gemini',
        ['-p', 'Test', '-m', 'gemini-pro'],
        { shell: true }
      );
    });

    it('passes json output format when specified', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      setTimeout(() => {
        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      await executeGeminiPrompt('Test', { outputFormat: 'json' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'gemini',
        ['-p', 'Test', '-o', 'json'],
        { shell: true }
      );
    });

    it('returns error on non-zero exit code', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      setTimeout(() => {
        const stderrCallback = (mockProcess.stderr?.on as ReturnType<typeof vi.fn>)?.mock.calls.find(
          (call) => call[0] === 'data'
        )?.[1];
        if (stderrCallback) stderrCallback(Buffer.from('Authentication failed'));

        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(1);
      }, 10);

      const result = await executeGeminiPrompt('Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
  });

  describe('scoreRelevanceWithGemini', () => {
    it('parses valid JSON response', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      const jsonResponse = JSON.stringify({
        taskRelevance: 30,
        errorRelevance: 20,
        implementationValue: 15,
        novelty: 8,
        total: 73,
        reasoning: 'Highly relevant to the task',
      });

      setTimeout(() => {
        const stdoutCallback = (mockProcess.stdout?.on as ReturnType<typeof vi.fn>)?.mock.calls.find(
          (call) => call[0] === 'data'
        )?.[1];
        if (stdoutCallback) stdoutCallback(Buffer.from(jsonResponse));

        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      const result = await scoreRelevanceWithGemini(
        'test topic',
        'task goal',
        'current error',
        ['prev1', 'prev2']
      );

      expect(result.taskRelevance).toBe(30);
      expect(result.errorRelevance).toBe(20);
      expect(result.implementationValue).toBe(15);
      expect(result.novelty).toBe(8);
      expect(result.total).toBe(73);
      expect(result.reasoning).toBe('Highly relevant to the task');
    });

    it('clamps values to valid ranges', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      // Response with out-of-range values
      const jsonResponse = JSON.stringify({
        taskRelevance: 100, // should clamp to 40
        errorRelevance: -10, // should clamp to 0
        implementationValue: 50, // should clamp to 20
        novelty: 20, // should clamp to 10
        total: 160,
        reasoning: 'Test',
      });

      setTimeout(() => {
        const stdoutCallback = (mockProcess.stdout?.on as ReturnType<typeof vi.fn>)?.mock.calls.find(
          (call) => call[0] === 'data'
        )?.[1];
        if (stdoutCallback) stdoutCallback(Buffer.from(jsonResponse));

        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      const result = await scoreRelevanceWithGemini('topic', 'goal', null, []);

      expect(result.taskRelevance).toBe(40);
      expect(result.errorRelevance).toBe(0);
      expect(result.implementationValue).toBe(20);
      expect(result.novelty).toBe(10);
      expect(result.total).toBe(70); // recalculated sum
    });

    it('returns zero score on Gemini failure', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      setTimeout(() => {
        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(1);
      }, 10);

      const result = await scoreRelevanceWithGemini('topic', 'goal', null, []);

      expect(result.total).toBe(0);
      expect(result.reasoning).toContain('failed');
    });

    it('returns zero score on invalid JSON response', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      setTimeout(() => {
        const stdoutCallback = (mockProcess.stdout?.on as ReturnType<typeof vi.fn>)?.mock.calls.find(
          (call) => call[0] === 'data'
        )?.[1];
        if (stdoutCallback) stdoutCallback(Buffer.from('Not valid JSON'));

        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      const result = await scoreRelevanceWithGemini('topic', 'goal', null, []);

      expect(result.total).toBe(0);
      expect(result.reasoning).toContain('parse');
    });
  });

  describe('researchWithGemini', () => {
    it('returns response content on success', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      setTimeout(() => {
        const stdoutCallback = (mockProcess.stdout?.on as ReturnType<typeof vi.fn>)?.mock.calls.find(
          (call) => call[0] === 'data'
        )?.[1];
        if (stdoutCallback) stdoutCallback(Buffer.from('Research result'));

        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      const result = await researchWithGemini('test query');

      expect(result).toBe('Research result');
    });

    it('includes context in prompt when provided', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      setTimeout(() => {
        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(0);
      }, 10);

      await researchWithGemini('query', 'some context');

      const [, args] = mockSpawn.mock.calls[0] as [string, string[]];
      expect(args[1]).toContain('Context: some context');
      expect(args[1]).toContain('Question: query');
    });

    it('returns error message on failure', async () => {
      const mockSpawn = vi.mocked(spawn);
      mockSpawn.mockReturnValue(mockProcess as ChildProcess);

      setTimeout(() => {
        const stderrCallback = (mockProcess.stderr?.on as ReturnType<typeof vi.fn>)?.mock.calls.find(
          (call) => call[0] === 'data'
        )?.[1];
        if (stderrCallback) stderrCallback(Buffer.from('Network error'));

        const closeCallback = (mockProcess.on as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === 'close'
        )?.[1];
        if (closeCallback) closeCallback(1);
      }, 10);

      const result = await researchWithGemini('query');

      expect(result).toContain('Error:');
    });
  });
});
