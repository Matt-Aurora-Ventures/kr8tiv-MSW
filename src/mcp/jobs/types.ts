export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface Job {
  id: string;
  tool: string;
  status: JobStatus;
  progress?: { step: number; total: number; message: string };
  result: unknown;
  error: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};
