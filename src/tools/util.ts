export interface ToolResult {
  [key: string]: unknown;
  content: { type: "text"; text: string }[];
  isError?: boolean;
}

export function toolJson(value: unknown): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
  };
}

export function toolError(message: string, code?: string): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message, code }) }],
    isError: true,
  };
}

export function withToolErrorHandling<Args extends unknown[]>(
  fn: (...args: Args) => Promise<ToolResult>,
) {
  return async (...args: Args): Promise<ToolResult> => {
    try {
      return await fn(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = (err as { code?: string })?.code;
      return toolError(message, code);
    }
  };
}
