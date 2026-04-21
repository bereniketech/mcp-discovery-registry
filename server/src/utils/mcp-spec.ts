import type { ToolSchema } from '../types/server-metadata.js';

export const MCP_SPEC_VERSIONS = ['2024-11-05', '2025-03-26'] as const;

export type McpSpecVersion = (typeof MCP_SPEC_VERSIONS)[number];

/**
 * Detects which MCP spec versions are referenced in readme or package.json content.
 * Scans for known date-based version strings.
 */
export function detectMcpSpecVersions(
  readmeContent: string | null,
  packageJsonContent: string | null,
): string[] {
  const combined = [readmeContent ?? '', packageJsonContent ?? ''].join('\n');
  const found = new Set<string>();

  for (const version of MCP_SPEC_VERSIONS) {
    if (combined.includes(version)) {
      found.add(version);
    }
  }

  return Array.from(found);
}

/**
 * Extracts structured tool schemas from README markdown content.
 * Looks for JSON code blocks containing arrays of objects with "name" and "inputSchema" keys.
 */
export function extractToolSchemasFromReadme(readme: string): ToolSchema[] {
  const jsonBlocks = [...readme.matchAll(/```json\n([\s\S]*?)\n```/g)];

  for (const [, content] of jsonBlocks) {
    if (!content) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(content);

      if (
        Array.isArray(parsed) &&
        parsed.every(
          (t) =>
            t !== null &&
            typeof t === 'object' &&
            typeof (t as Record<string, unknown>).name === 'string' &&
            (t as Record<string, unknown>).inputSchema !== undefined,
        )
      ) {
        return parsed as ToolSchema[];
      }
    } catch {
      continue;
    }
  }

  return [];
}

/**
 * Extracts tool schemas from mcp.json content fetched from repo root.
 * mcp.json may contain a "tools" array at the top level.
 */
export function extractToolSchemasFromMcpJson(mcpJsonContent: string): ToolSchema[] {
  try {
    const parsed: unknown = JSON.parse(mcpJsonContent);

    if (!parsed || typeof parsed !== 'object') {
      return [];
    }

    const data = parsed as Record<string, unknown>;
    const tools = data.tools;

    if (
      Array.isArray(tools) &&
      tools.every(
        (t) =>
          t !== null &&
          typeof t === 'object' &&
          typeof (t as Record<string, unknown>).name === 'string',
      )
    ) {
      return tools as ToolSchema[];
    }
  } catch {
    // Ignore parse errors
  }

  return [];
}
