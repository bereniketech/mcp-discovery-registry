/**
 * Describes a single tool exposed by an MCP server.
 */
export interface ToolSchema {
  /** Machine-readable tool identifier, e.g. "search_files" */
  name: string;
  /** Human-readable description of what the tool does. */
  description: string;
  /** JSON Schema object describing the tool's input parameters. */
  inputSchema: Record<string, unknown>;
}

/**
 * Template used to generate a client configuration snippet for this MCP server.
 * Fields are intentionally flexible to accommodate different transport types.
 */
export interface ConfigTemplate {
  /** Transport protocol, e.g. "stdio", "sse", "http" */
  transport: string;
  /** Command to execute when transport is "stdio", e.g. "npx" */
  command?: string;
  /** Arguments for the command when transport is "stdio" */
  args?: string[];
  /** Base URL when transport is "sse" or "http" */
  url?: string;
  /** Additional key/value configuration entries */
  env?: Record<string, string>;
  /** npm install configuration (populated by the health/install cron) */
  npm?: { install: string; run: string };
  /** pip install configuration */
  pip?: { install: string; run: string };
  /** cargo install configuration */
  cargo?: { install: string; run: string };
  /** docker pull/run commands */
  docker?: { pull: string; run: string };
}
