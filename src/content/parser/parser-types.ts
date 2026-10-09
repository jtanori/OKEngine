// ============================================================================
// RENDER-001: Parser Configuration & Options
// ============================================================================

export interface MarkdownParserOptions {
  /**
   * When true, automatically normalizes split chunk boundaries before parsing.
   */
  normalizeChunks?: boolean;
  /**
   * Whether to sanitize the resulting AST immediately (default: true).
   */
  sanitize?: boolean;
}
