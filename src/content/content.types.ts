// ============================================================================
// RENDER-001 & RENDER-TEST-001: Canonical Content AST, Contexts & Types
// "Parse once, normalize once, sanitize once, render consistently everywhere."
// ============================================================================

export const RENDERER_VERSION = 1;

export type RenderContext =
  | 'DOCUMENT_FULL'
  | 'DOCUMENT_PREVIEW'
  | 'EDITOR_PREVIEW'
  | 'CHAT_ANSWER'
  | 'CHAT_MESSAGE'
  | 'SOURCE_EXCERPT'
  | 'CITATION'
  | 'TEST_CHAT'
  | 'EMBEDDED_CHAT'
  | 'PUBLIC_DOC';

export interface ContentPermissions {
  canCopy?: boolean;
  canShare?: boolean;
  canSave?: boolean;
  canSaveToWorkspace?: boolean;
  canEdit?: boolean;
  canViewOriginal?: boolean;
  canReport?: boolean;
  canRegenerate?: boolean;
}

export interface RenderOptions {
  allowImages?: boolean;
  allowMedia?: boolean;
  showCodeCopy?: boolean;
  showTableOfContents?: boolean;
  showHeadingAnchors?: boolean;
  showActions?: boolean;
  showMetadata?: boolean;
  showCitations?: boolean;
  maxContentLength?: number;
  linkBehavior?: 'new-tab' | 'same-tab';
}

export type TableColumnAlignment = 'left' | 'center' | 'right' | null;

// ============================================================================
// Inline AST Nodes
// ============================================================================

export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'bold_italic'; children: InlineNode[] }
  | { type: 'strikethrough'; children: InlineNode[] }
  | { type: 'inline_code'; value: string }
  | { type: 'link'; href: string; title?: string; isExternal: boolean; children: InlineNode[] }
  | { type: 'image'; src: string; alt: string; title?: string }
  | { type: 'hard_break' }
  | { type: 'soft_break' };

// ============================================================================
// Block AST Nodes
// ============================================================================

export interface ListItemNode {
  type: 'list_item';
  checked?: boolean; // For task_list items
  children: InlineNode[];
  nestedLists?: (UnorderedListBlock | OrderedListBlock | TaskListBlock)[];
}

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  id: string;
  text: string;
  children: InlineNode[];
}

export interface ParagraphBlock {
  type: 'paragraph';
  children: InlineNode[];
}

export interface BlockquoteBlock {
  type: 'blockquote';
  blocks: ContentBlockNode[];
}

export interface UnorderedListBlock {
  type: 'unordered_list';
  items: ListItemNode[];
}

export interface OrderedListBlock {
  type: 'ordered_list';
  start?: number;
  items: ListItemNode[];
}

export interface TaskListBlock {
  type: 'task_list';
  items: ListItemNode[];
}

export interface CodeBlock {
  type: 'code_block';
  language: string;
  code: string;
}

export interface HorizontalRuleBlock {
  type: 'horizontal_rule';
}

export interface TableCellNode {
  children: InlineNode[];
  align: TableColumnAlignment;
}

export interface TableBlock {
  type: 'table';
  headers: TableCellNode[];
  alignments: TableColumnAlignment[];
  rows: TableCellNode[][];
}

export interface ImageBlock {
  type: 'image';
  src: string;
  alt: string;
  title?: string;
}

export interface MediaBlock {
  type: 'media';
  provider: 'youtube' | 'vimeo' | 'audio' | 'video' | 'unsupported';
  src: string;
  title: string;
  safe: boolean;
}

export interface HtmlBlock {
  type: 'html_block';
  rawHtml: string;
  sanitizedText: string;
}

export type ContentBlockNode =
  | HeadingBlock
  | ParagraphBlock
  | BlockquoteBlock
  | UnorderedListBlock
  | OrderedListBlock
  | TaskListBlock
  | CodeBlock
  | HorizontalRuleBlock
  | TableBlock
  | ImageBlock
  | MediaBlock
  | HtmlBlock;

export interface TocEntry {
  id: string;
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface ContentDocumentAst {
  rendererVersion: number;
  frontmatter: Record<string, unknown>;
  blocks: ContentBlockNode[];
  toc: TocEntry[];
  plainText: string;
  sanitizationEvents: string[];
}

export interface AuthorizedCitationItem {
  documentId?: string;
  collectionId: string;
  title: string;
  filename: string;
  section?: string;
  excerpt?: string;
  url?: string;
  language?: string;
}

export type IssueReportCategory =
  | 'wrong_information'
  | 'wrong_source'
  | 'missing_information'
  | 'formatting_problem'
  | 'something_else';
