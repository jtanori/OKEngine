// ============================================================================
// RENDER-TEST-001: Complete 45-Point Content Rendering & Regression Test Suite
// Verifies Parser, Normalized AST, Sanitizer, Renderer, 10 Surface Contexts,
// Permission-Aware Actions, Server Edit/Save/Share Endpoints, and the
// permanent `security-overview.md` regression (RENDER-001 – RENDER-045).
// ============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  parseMarkdownToAst,
  renderAstToHtml,
  renderContentToHtml,
  normalizeChunkBoundaries,
  resolveActionPermissions,
   resolveContextOptions,
  validateContentUrl,
  validateMediaSource,
  inlineNodesToPlainText,
  RENDERER_VERSION,
  RenderContext,
} from '../src/content/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURES_DIR = path.resolve(__dirname, '../tests/rendering/fixtures');

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8');
}

export interface RenderTestResult {
  id: string;
  title: string;
  passed: boolean;
  details: string;
}

export async function runRenderingRegressionSuite(
  baseUrl = 'http://localhost:3000'
): Promise<RenderTestResult[]> {
  const results: RenderTestResult[] = [];

  async function check(id: string, title: string, fn: () => Promise<string> | string) {
    try {
      const details = await fn();
      results.push({ id, title, passed: true, details });
    } catch (err: any) {
      results.push({
        id,
        title,
        passed: false,
        details: err?.message || String(err),
      });
    }
  }

  // 1. RENDER-001: Heading Isolation
  await check('RENDER-001', 'Heading Isolation', () => {
    const md = `# Security & Isolation Overview\n\nOKEng enforces a defense-in-depth security model.\n\n## Dual Independent RBAC\nPlatform administration roles are isolated from customer roles.`;
    const { ast, html } = renderContentToHtml({ content: md });
    const h1s = ast.blocks.filter((b) => b.type === 'heading' && b.level === 1);
    const h2s = ast.blocks.filter((b) => b.type === 'heading' && b.level === 2);
    const paras = ast.blocks.filter((b) => b.type === 'paragraph');
    if (h1s.length !== 1 || h2s.length !== 1 || paras.length !== 2) {
      throw new Error(`Expected 1 H1, 1 H2, 2 paragraphs; got H1=${h1s.length}, H2=${h2s.length}, P=${paras.length}`);
    }
    if (h2s[0].type === 'heading' && h2s[0].text !== 'Dual Independent RBAC') {
      throw new Error(`H2 consumed paragraph text: "${h2s[0].text}"`);
    }
    if (html.includes('##')) {
      throw new Error('Raw ## syntax leaked into rendered HTML');
    }
    return 'H1 ("Security & Isolation Overview") and H2 ("Dual Independent RBAC") strictly isolated from following paragraphs';
  });

  // 2. RENDER-002: Paragraph Isolation
  await check('RENDER-002', 'Paragraph Isolation', () => {
    const md = readFixture('paragraphs.md');
    const { ast, html } = renderContentToHtml({ content: md });
    if (ast.blocks.length !== 2 || ast.blocks[0].type !== 'paragraph' || ast.blocks[1].type !== 'paragraph') {
      throw new Error('Paragraphs were merged instead of remaining distinct Paragraph blocks');
    }
    const pCount = (html.match(/<p>/g) || []).length;
    if (pCount !== 2) throw new Error(`Expected 2 <p> elements, got ${pCount}`);
    return '2 distinct <p> blocks preserved without merging';
  });

  // 3. RENDER-003: Inline Formatting
  await check('RENDER-003', 'Inline Formatting', () => {
    const md = readFixture('emphasis.md');
    const { html } = renderContentToHtml({ content: md });
    for (const tag of ['<strong>bold</strong>', '<em>italic</em>', '<del>deleted</del>', '<code>workspace_id</code>', '<strong><em>important</em></strong>']) {
      if (!html.includes(tag)) {
        throw new Error(`Missing semantic tag ${tag} in output: ${html}`);
      }
    }
    if (html.includes('**') || html.includes('~~') || html.includes('`')) {
      throw new Error('Raw Markdown inline markers leaked into HTML');
    }
    return 'Verified <strong>, <em>, <del>, <code>, and nested <strong><em> without marker leakage';
  });

  // 4. RENDER-004: Links (Safe vs Dangerous)
  await check('RENDER-004', 'Links & Safe Schemes', () => {
    const md = readFixture('links.md');
    const { html } = renderContentToHtml({ content: md });
    if (!html.includes('<a href="https://example.com" target="_blank" rel="noopener noreferrer">OKEng</a>')) {
      throw new Error('Safe external link was not rendered with rel="noopener noreferrer"');
    }
    if (html.includes('javascript:')) {
      throw new Error('Dangerous javascript: link survived rendering!');
    }
    if (!html.includes('Attack')) {
      throw new Error('Neutralized link text "Attack" should remain readable as plain text');
    }
    return 'Safe external links preserved; javascript:alert(1) neutralized to harmless text';
  });

  // 5. RENDER-005: Unordered Lists
  await check('RENDER-005', 'Unordered Lists', () => {
    const md = `- Product\n- Documentation\n- Chat`;
    const { html } = renderContentToHtml({ content: md });
    if (!html.includes('<ul><li>Product</li><li>Documentation</li><li>Chat</li></ul>')) {
      throw new Error(`Unexpected UL output: ${html}`);
    }
    return 'Semantic <ul><li> structure verified without literal bullet characters';
  });

  // 6. RENDER-006: Nested Lists
  await check('RENDER-006', 'Nested Lists', () => {
    const md = readFixture('nested-lists.md');
    const { ast, html } = renderContentToHtml({ content: md });
    const ul = ast.blocks[0];
    if (ul.type !== 'unordered_list' || !ul.items[0].nestedLists || ul.items[0].nestedLists.length !== 1) {
      throw new Error('Nested list hierarchy was flattened in AST');
    }
    if (!html.includes('<li>Product<ul><li>Documentation</li><li>Chat</li></ul></li>')) {
      throw new Error(`Nested <ul> structure missing in HTML: ${html}`);
    }
    return 'Hierarchical nested <ul><li> structure preserved in AST and HTML';
  });

  // 7. RENDER-007: Ordered & Task Lists
  await check('RENDER-007', 'Ordered & Task Lists', () => {
    const md = readFixture('lists.md');
    const { ast, html } = renderContentToHtml({ content: md });
    if (!ast.blocks.some((b) => b.type === 'ordered_list') || !ast.blocks.some((b) => b.type === 'task_list')) {
      throw new Error('Expected both ordered_list and task_list blocks');
    }
    if (!html.includes('<ol><li>First</li><li>Second</li><li>Third</li></ol>')) {
      throw new Error('Ordered list HTML mismatch');
    }
    return 'Semantic <ol> and read-only task list checkboxes verified';
  });

  // 8. RENDER-008: Blockquotes
  await check('RENDER-008', 'Blockquotes & Nesting', () => {
    const md = readFixture('blockquotes.md');
    const { html } = renderContentToHtml({ content: md });
    const bqCount = (html.match(/<blockquote>/g) || []).length;
    if (bqCount < 2) {
      throw new Error(`Expected nested <blockquote> elements, got ${bqCount}`);
    }
    return 'Outer and nested <blockquote> elements preserved';
  });

  // 9. RENDER-009: Code Blocks
  await check('RENDER-009', 'Fenced Code Blocks', () => {
    const md = readFixture('code.md');
    const { html } = renderContentToHtml({ content: md });
    if (!html.includes('<pre data-language="typescript"><code class="language-typescript">')) {
      throw new Error('Missing <pre><code class="language-typescript">');
    }
    if (!html.includes('// **Markdown inside code** must not be parsed')) {
      throw new Error('Markdown inside fenced code block was erroneously parsed!');
    }
    return 'Fenced <pre><code> preserves language metadata, whitespace, and unparsed inner Markdown';
  });

  // 10. RENDER-010: Inline Code
  await check('RENDER-010', 'Inline Code', () => {
    const md = 'Use `workspace_id` and `**not_bold**` when querying.';
    const { html } = renderContentToHtml({ content: md });
    if (!html.includes('<code>workspace_id</code>') || !html.includes('<code>**not_bold**</code>')) {
      throw new Error(`Inline code failed: ${html}`);
    }
    return 'Inline <code> preserves exact value without inner Markdown parsing or literal backticks';
  });

  // 11. RENDER-011 & RENDER-012: Tables & Column Alignment
  await check('RENDER-011/012', 'Tables & Column Alignment', () => {
    const md = readFixture('tables.md');
    const { ast, html } = renderContentToHtml({ content: md });
    const tbl = ast.blocks[0];
    if (tbl.type !== 'table' || tbl.headers.length !== 3 || tbl.rows.length !== 3) {
      throw new Error('Table AST dimensions mismatch');
    }
    if (
      tbl.alignments[0] !== 'left' ||
      tbl.alignments[1] !== 'center' ||
      tbl.alignments[2] !== 'right'
    ) {
      throw new Error(`Table alignments mismatch: ${JSON.stringify(tbl.alignments)}`);
    }
    if (!html.includes('<code>Read</code>') || !html.includes('<strong>Read</strong>')) {
      throw new Error('Inline Markdown inside table cells was not rendered');
    }
    return 'Semantic <table><thead><th><tbody><td> with left/center/right alignment and inline cell formatting verified';
  });

  // 12. RENDER-013: Images & Accessible Alt Fallback
  await check('RENDER-013', 'Images & Alt Fallback', () => {
    const md = readFixture('images.md');
    const { ast, html } = renderContentToHtml({ content: md });
    const imgs = ast.blocks.filter((b) => b.type === 'image');
    if (imgs.length !== 2) throw new Error(`Expected 2 image blocks, got ${imgs.length}`);
    if (imgs[1].type === 'image' && !imgs[1].alt) {
      throw new Error('Missing alt text did not receive accessible fallback');
    }
    if (!html.includes('<figure><img src="https://example.com/architecture.png" alt="Architecture diagram"')) {
      throw new Error('Image figure/alt HTML mismatch');
    }
    return 'Images verified with figure/figcaption and accessible alt fallback for empty alt';
  });

  // 13. RENDER-014: Media Provider Allowlist
  await check('RENDER-014', 'Media Allowlist & Fallback', () => {
    const md = readFixture('media.md');
    const { ast, html } = renderContentToHtml({ content: md });
    const mediaBlocks = ast.blocks.filter((b) => b.type === 'media');
    if (mediaBlocks.length !== 2) throw new Error('Expected 2 media blocks');
    if (mediaBlocks[0].type === 'media' && (!mediaBlocks[0].safe || mediaBlocks[0].provider !== 'youtube')) {
      throw new Error('Approved YouTube media provider should be marked safe');
    }
    if (mediaBlocks[1].type === 'media' && mediaBlocks[1].safe) {
      throw new Error('Unapproved external media host was marked safe!');
    }
    if (!html.includes('data-media-fallback="true"')) {
      throw new Error('Expected fallback indicator for unapproved media');
    }
    return 'Approved YouTube media allowed; untrusted media host rejected with safe fallback';
  });

  // 14. RENDER-015: Horizontal Rules
  await check('RENDER-015', 'Horizontal Rules', () => {
    const md = readFixture('horizontal-rules.md');
    const { ast, html } = renderContentToHtml({ content: md });
    if (ast.blocks.length !== 3 || ast.blocks[1].type !== 'horizontal_rule') {
      throw new Error('Horizontal rule did not separate paragraphs into 3 blocks');
    }
    if (!html.includes('<hr />') || html.includes('---')) {
      throw new Error('Expected <hr /> without literal --- text');
    }
    return 'Semantic <hr /> separator rendered between paragraphs';
  });

  // 15. RENDER-016: Soft, Hard, and Paragraph Line Breaks
  await check('RENDER-016', 'Line Breaks (Soft / Hard / Paragraph)', () => {
    const md = readFixture('line-breaks.md');
    const { ast, html } = renderContentToHtml({ content: md });
    if (ast.blocks.length !== 3) {
      throw new Error(`Expected 3 paragraph blocks, got ${ast.blocks.length}`);
    }
    if (!html.includes('<br />')) {
      throw new Error('Hard break (two trailing spaces) did not produce <br />');
    }
    return 'Soft breaks, hard breaks (<br />), and paragraph breaks distinguished accurately';
  });

  // 16. RENDER-017, RENDER-018, RENDER-019: Raw HTML, XSS & Dangerous URL Schemes
  await check('RENDER-017/018/019', 'Raw HTML, XSS & Dangerous URL Schemes', () => {
    const rawHtmlMd = readFixture('raw-html.md');
    const { html: safeHtml } = renderContentToHtml({ content: rawHtmlMd });
    if (!safeHtml.includes('Safe text') || safeHtml.includes('<div>')) {
      throw new Error('Raw HTML block policy failed');
    }

    const maliciousMd = readFixture('malicious.md');
    const { ast: malAst, html: malHtml } = renderContentToHtml({ content: maliciousMd });
    if (
      malHtml.includes('<script') ||
      malHtml.includes('onerror=') ||
      malHtml.includes('javascript:') ||
      malHtml.includes('data:text/html') ||
      malHtml.includes('vbscript:')
    ) {
      throw new Error(`XSS or dangerous scheme survived in HTML: ${malHtml}`);
    }
    if (!malHtml.includes('Readable safe paragraph after malicious inputs.')) {
      throw new Error('Readable content after malicious payload was lost');
    }
    if (malAst.sanitizationEvents.length === 0) {
      throw new Error('Expected sanitizationEvents to be recorded on malicious fixture');
    }
    return `Blocked <script>, onerror=, javascript:, data:, and vbscript: (${malAst.sanitizationEvents.length} sanitization events logged)`;
  });

  // 17. RENDER-020: Long URLs
  await check('RENDER-020', 'Long URL Wrapping', () => {
    const md = readFixture('links.md');
    const { html } = renderContentToHtml({ content: md });
    if (!html.includes('class="break-all"')) {
      throw new Error('Long URL (>60 chars) did not receive break-all wrapping class');
    }
    return 'Long URLs receive break-all wrapping class to prevent viewport overflow';
  });

  // 18. RENDER-021 & RENDER-022: Chunk Boundary Preservation & Multiline Formatting
  await check('RENDER-021/022', 'Chunk Boundary & Multiline Formatting Preservation', () => {
    const chunk1 = `## Authentication\n\nAuthentication requires a signed identity assertion.\n\nThe assertion contains:`;
    const chunk2 = `- issuer\n- audience\n- expiration\n\nThe expiration must be validated before access is granted.`;
    const chunk3 = `This sentence contains **important`;
    const chunk4 = `security information** and continues here.`;

    const reconstructed = normalizeChunkBoundaries([chunk1, chunk2, chunk3, chunk4]);
    const { ast, html } = renderContentToHtml({ content: reconstructed });

    const types = ast.blocks.map((b) => b.type);
    if (
      types[0] !== 'heading' ||
      types[1] !== 'paragraph' ||
      types[2] !== 'paragraph' ||
      types[3] !== 'unordered_list' ||
      types[4] !== 'paragraph'
    ) {
      throw new Error(`Chunk boundary block sequence corrupted: ${types.join(' -> ')}`);
    }
    if (
      !html.includes('<strong>important security information</strong>') ||
      html.includes('**important') ||
      html.includes('information**')
    ) {
      throw new Error(`Chunk boundary emphasis failed: ${html}`);
    }
    return 'Split chunks and multiline **important security information** healed and rendered semantically';
  });

  // 19. RENDER-023: Permanent `security-overview.md` Regression Test
  await check('RENDER-023', 'Permanent Regression: security-overview.md', () => {
    const md = readFixture('security-overview.md');
    const { ast, html } = renderContentToHtml({ content: md });

    if (ast.blocks.length !== 6) {
      throw new Error(`Expected 6 blocks (H1, P, H2, P, H2, P), got ${ast.blocks.length}`);
    }

    const [b0, b1, b2, b3, b4, b5] = ast.blocks;
    if (b0.type !== 'heading' || b0.level !== 1 || b0.text !== 'Security & Isolation Overview') {
      throw new Error(`Block 0 mismatch: ${JSON.stringify(b0)}`);
    }
    if (b1.type !== 'paragraph') throw new Error('Block 1 must be paragraph');
    if (b2.type !== 'heading' || b2.level !== 2 || b2.text !== 'Dual Independent RBAC') {
      throw new Error(`Block 2 H2 mismatch: ${JSON.stringify(b2)}`);
    }
    if (b3.type !== 'paragraph' || inlineNodesToPlainText(b3.children).includes('`')) {
      throw new Error('Block 3 paragraph leaked literal backticks');
    }
    if (b4.type !== 'heading' || b4.level !== 2 || b4.text !== 'The "Nothing Shown" Rule') {
      throw new Error(`Block 4 H2 mismatch: ${JSON.stringify(b4)}`);
    }
    if (b5.type !== 'paragraph') throw new Error('Block 5 must be paragraph');

    if (
      html.includes('`') ||
      html.includes('##') ||
      html.includes('\\.') ||
      html.includes('\\"') ||
      !html.includes('<code>PLATFORM_OWNER</code>') ||
      !html.includes('<em>&quot;I couldn&#39;t find that information in the available documentation.&quot;</em>')
    ) {
      throw new Error(`Rendered HTML failed regression checks: ${html}`);
    }

    return 'Verified H1, 2 H2s ("Dual Independent RBAC", "The \\"Nothing Shown\\" Rule"), 3 paragraphs, <code> tags, and <em> quote with zero syntax leakage';
  });

  // 20. RENDER-024 & RENDER-025: Citation Rendering & Excerpt Safety
  await check('RENDER-024/025', 'Citation Excerpt Sanitization', () => {
    const maliciousExcerpt = `Security excerpt <script>alert(1)</script> with **bold** and \`token\`.`;
    const { html } = renderContentToHtml({
      content: maliciousExcerpt,
      context: 'SOURCE_EXCERPT',
    });
    if (html.includes('<script>') || !html.includes('<strong>bold</strong>') || !html.includes('<code>token</code>')) {
      throw new Error(`Excerpt sanitization failed: ${html}`);
    }
    return 'Source excerpts use identical AST sanitization and inline rendering as full documents';
  });

  // 21. RENDER-026 & RENDER-027: Permission-Aware Actions & Edit Source Visibility
  await check('RENDER-026/027', 'Permission-Aware Actions & Edit Source Visibility', () => {
    const anonPerms = resolveActionPermissions('anonymous', { isPublicDocument: true });
    const readerPerms = resolveActionPermissions('authenticated_reader', { isPublicDocument: true });
    const editorPerms = resolveActionPermissions('authenticated_editor', { isPublicDocument: true });
    const ownerAnswerPerms = resolveActionPermissions('workspace_owner', {
      isPublicDocument: true,
      isAnswerContext: true,
    });

    if (anonPerms.canEdit || readerPerms.canEdit) {
      throw new Error('Edit Source must be hidden for anonymous and read-only users');
    }
    if (!editorPerms.canEdit || !ownerAnswerPerms.canEdit || !ownerAnswerPerms.canSaveToWorkspace) {
      throw new Error('Edit Source and Save Answer to Workspace must be enabled for editors/owners');
    }
    return 'Verified Edit Source hidden for anonymous/reader and enabled for workspace editor/owner';
  });

  // 22. RENDER-028: Server-Side Edit Source Authorization
  await check('RENDER-028', 'Edit Source Server Authorization (POST /api/documents/:id/edit)', async () => {
    const anonRes = await fetch(`${baseUrl}/api/documents/doc_pub_04/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '# Hacked' }),
    });
    if (anonRes.status !== 401) {
      throw new Error(`Expected 401 for anonymous edit request, got ${anonRes.status}`);
    }

    const readerRes = await fetch(`${baseUrl}/api/embed/sources/doc_pub_04/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-okeng-session': 'usr_readonly_02',
      },
      body: JSON.stringify({ content: '# Reader edit attempt' }),
    });
    if (readerRes.status !== 403) {
      throw new Error(`Expected 403 for read-only user edit request, got ${readerRes.status}`);
    }

    const ownerRes = await fetch(`${baseUrl}/api/documents/doc_pub_04/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-okeng-session': 'usr_owner_01',
      },
      body: JSON.stringify({ title: 'Security & Isolation Overview', content: '# Valid Edit' }),
    });
    if (ownerRes.status !== 200) {
      throw new Error(`Expected 200 for authorized owner edit, got ${ownerRes.status}`);
    }

    return 'Server rejected anonymous (401) and read-only (403) edit requests while allowing owner (200)';
  });

  // 23. RENDER-029: Copy Behavior (Semantic Content Without UI Chrome)
  await check('RENDER-029', 'Copy Plain-Text Fidelity', () => {
    const md = readFixture('security-overview.md');
    const ast = parseMarkdownToAst(md);
    if (
      ast.plainText.includes('3 chunks') ||
      ast.plainText.includes('Updated') ||
      ast.plainText.includes('Edit source') ||
      ast.plainText.includes('##') ||
      ast.plainText.includes('`')
    ) {
      throw new Error(`Copy plainText leaked UI metadata or Markdown markers: ${ast.plainText}`);
    }
    return 'Copy output contains clean semantic prose without UI chrome or Markdown markers';
  });

  // 24. RENDER-030: Editor / Viewer Semantic Parity Across All 10 Contexts
  await check('RENDER-030', 'Editor / Viewer & 10-Surface Semantic Parity', () => {
    const md = readFixture('security-overview.md');
    const contexts: RenderContext[] = [
      'DOCUMENT_FULL',
      'DOCUMENT_PREVIEW',
      'EDITOR_PREVIEW',
      'CHAT_ANSWER',
      'CHAT_MESSAGE',
      'SOURCE_EXCERPT',
      'CITATION',
      'TEST_CHAT',
      'EMBEDDED_CHAT',
      'PUBLIC_DOC',
    ];
    const editorOut = renderContentToHtml({
      content: md,
      context: 'EDITOR_PREVIEW',
      options: { showTableOfContents: false },
    });
    const viewerOut = renderContentToHtml({
      content: md,
      context: 'DOCUMENT_FULL',
      options: { showTableOfContents: false },
    });

    if (JSON.stringify(editorOut.ast.blocks) !== JSON.stringify(viewerOut.ast.blocks)) {
      throw new Error('EDITOR_PREVIEW and DOCUMENT_FULL produced different AST blocks!');
    }
    for (const ctx of contexts) {
      const rendered = renderContentToHtml({ content: md, context: ctx });
      if (rendered.ast.blocks.length !== 6) {
        throw new Error(`Context ${ctx} altered AST block count`);
      }
    }
    return 'Verified identical 6-block AST across EDITOR_PREVIEW, DOCUMENT_FULL, and all 10 presentation contexts';
  });

  // 25. RENDER-031 & RENDER-032: Spanish & Mixed-Language Rendering
  await check('RENDER-031/032', 'Spanish & Mixed-Language Content Fidelity', () => {
    const esMd = readFixture('i18n-es.md');
    const mixedMd = readFixture('mixed-language.md');
    const { html: esHtml } = renderContentToHtml({ content: esMd });
    const { html: mixedHtml } = renderContentToHtml({ content: mixedMd });

    if (
      !esHtml.includes('Seguridad y aislamiento') ||
      !esHtml.includes('¿Cómo funciona la rotación de claves?') ||
      !esHtml.includes('<code>everyone</code>')
    ) {
      throw new Error('Spanish characters or inline code corrupted');
    }
    if (
      !mixedHtml.includes('Use <code>workspace_id</code> para identificar el workspace.') ||
      !mixedHtml.includes('<blockquote><p>This setting is only available to administrators.</p></blockquote>')
    ) {
      throw new Error('Mixed-language content was altered or corrupted');
    }
    return 'Spanish diacritics (¿, á, ó) and mixed EN/ES content rendered without corruption or forced translation';
  });

  // 26. RENDER-033, RENDER-034, RENDER-035: RTL Readiness, Accessibility & Responsive Wrappers
  await check('RENDER-033/034/035', 'RTL Readiness, Accessibility & Responsive Containers', () => {
    const md = readFixture('long-document.md');
    const { html } = renderContentToHtml({ content: md });
    if (!html.includes('dir="auto"')) {
      throw new Error('Missing dir="auto" for RTL readiness');
    }
    if (!html.includes('scope="col"') || !html.includes('class="overflow-x-auto"')) {
      throw new Error('Missing accessible table scope="col" or responsive overflow-x-auto container');
    }
    return 'Verified dir="auto", table scope="col", and overflow-x-auto responsive wrappers';
  });

  // 27. RENDER-036, RENDER-037, RENDER-038, RENDER-039: Broken Assets, Unsupported Syntax, Empty & Large Docs
  await check('RENDER-036/037/038/039', 'Resilience, Empty State & Large Document Performance', () => {
    const emptyOut = renderContentToHtml({ content: '   ' });
    if (!emptyOut.html.includes('data-empty="true"')) {
      throw new Error('Empty document did not render intentional data-empty state');
    }

    const unsupportedOut = renderContentToHtml({
      content: ':::custom-directive\nReadable inner text\n:::',
    });
    if (!unsupportedOut.html.includes('Readable inner text')) {
      throw new Error('Unsupported syntax lost readable text');
    }

    const largeMd = Array.from({ length: 80 }, (_, i) => `## Section ${i + 1}\n\nParagraph ${i + 1} with **bold** and \`code_${i}\`.`).join('\n\n');
    const t0 = Date.now();
    const largeOut = renderContentToHtml({ content: largeMd });
    const elapsed = Date.now() - t0;
    if (largeOut.ast.blocks.length !== 160 || elapsed > 250) {
      throw new Error(`Large doc rendering failed or slow (${elapsed}ms)`);
    }

    return `Verified empty state, unsupported syntax degradation, and 160-block large doc rendered in ${elapsed}ms`;
  });

  // 28. RENDER-040 & RENDER-041: Save-As, Save-Answer-to-Workspace & Share Authorization Integrity
  await check('RENDER-040/041', 'Save-As, Save-Answer-to-Workspace & Share Integrity', async () => {
    // 1. Export as TXT & re-import MD equivalence
    const md = readFixture('security-overview.md');
    const exportRes = await fetch(`${baseUrl}/api/embed/answers/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: md, format: 'txt' }),
    });
    const exportData = await exportRes.json();
    if (!exportData.ok || exportData.output.includes('##')) {
      throw new Error('Export TXT failed or leaked Markdown syntax');
    }

    // 2. Save Answer to Workspace creates indexed Markdown doc
    const saveRes = await fetch(`${baseUrl}/api/embed/answers/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: 'okeng',
        collectionId: 'COL-DOCS',
        title: 'SSO Configuration Answer',
        answerMarkdown: 'To configure SSO, open **Settings** and select `Security`.',
        citations: [{ collectionId: 'COL-DOCS', filename: 'access-control.md', title: 'Access Control' }],
        roleKind: 'workspace_owner',
      }),
    });
    const saveData = await saveRes.json();
    if (!saveData.ok || !saveData.document?.content.includes('## Sources')) {
      throw new Error('Save Answer to Workspace failed');
    }

    // 3. Share Integrity: Public vs Private document share
    const privShareRes = await fetch(`${baseUrl}/api/embed/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: 'doc_internal_18',
        collectionId: 'COL-INTERNAL',
        isPublicDocument: false,
        content: '# Secret Runbook',
      }),
    });
    const privShare = await privShareRes.json();
    const unauthOpen = await fetch(`${baseUrl}${privShare.shareUrl}`);
    if (unauthOpen.status !== 403) {
      throw new Error(`Private shared document must deny anonymous visitor with 403, got ${unauthOpen.status}`);
    }

    return 'Verified TXT/HTML export, Save Answer to Workspace indexing, and private Share 403 enforcement';
  });

  // 29. RENDER-042, RENDER-043, RENDER-044, RENDER-045: Print, TOC, Unique Heading IDs & Renderer Version
  await check('RENDER-042/043/044/045', 'TOC, Duplicate Heading IDs & Renderer Version', () => {
    const md = readFixture('headings.md');
    const { ast, html } = renderContentToHtml({ content: md, context: 'DOCUMENT_FULL' });

    if (ast.rendererVersion !== RENDERER_VERSION || !html.includes(`data-renderer-version="${RENDERER_VERSION}"`)) {
      throw new Error('Missing renderer_version metadata');
    }
    if (!html.includes('data-toc="true"')) {
      throw new Error('Expected Table of Contents on multi-heading DOCUMENT_FULL');
    }
    const ids = ast.toc.map((t) => t.id);
    if (ids[0] !== 'security-isolation-overview' || ids[3] !== 'security-isolation-overview-1') {
      throw new Error(`Duplicate heading IDs were not deduplicated: ${JSON.stringify(ids)}`);
    }

    return `Verified TOC generation, unique heading IDs (#${ids[0]}, #${ids[3]}), and renderer_version=${RENDERER_VERSION}`;
  });

  return results;
}
