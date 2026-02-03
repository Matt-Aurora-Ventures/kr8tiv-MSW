export const VALID_CONFIG = {
  version: "0.1.0",
  notebookUrl: "https://notebooklm.google.com/notebook/test-123",
  relevanceThreshold: 30,
  maxIterations: 10,
};

export const SAMPLE_ERROR = {
  type: "TypeError",
  message: "Cannot read property 'data' of undefined",
  stack: `TypeError: Cannot read property 'data' of undefined
    at processResponse (src/api/handler.ts:42:15)
    at async executeTask (src/execution/runner.ts:87:20)`,
  context: {
    file: "src/api/handler.ts",
    line: 42,
    function: "processResponse",
  },
};

export const MOCK_NOTEBOOKLM_RESPONSE = {
  answer: "This error occurs when the API response is null or undefined. Add null checking before accessing response.data property.",
  citations: ["error-handling.md", "api-patterns.md"],
  suggestedTopics: [
    "Learn about defensive programming",
    "Learn about TypeScript null safety",
  ],
};

export const SAMPLE_SOURCES = [
  {
    filename: "test-doc.md",
    content: `# Test Documentation

## Authentication
MSW uses persistent Chrome profiles to maintain Google session cookies.

## Error Handling
All API calls should include proper null checking and error boundaries.
`,
  },
  {
    filename: "api-guide.md",
    content: `# API Guide

## Best Practices
1. Always validate response before accessing properties
2. Use TypeScript strict mode for null safety
3. Implement retry logic for transient failures
`,
  },
];

export const EXPECTED_RESEARCH_OUTPUT = {
  topics: ["authentication", "error-handling", "api-patterns"],
  qaPairs: [
    {
      question: "How does authentication work?",
      answer: expect.stringContaining("Chrome profiles"),
      citations: expect.arrayContaining(["test-doc.md"]),
    },
  ],
};
