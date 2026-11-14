import type { CodeSnippet, ContentBlock, Link, Note } from '../core/models';

/** Markdown body for a note, falling back to legacy block / field storage. */
export function noteToMarkdown(note: Note): string {
  if (note.body_markdown != null) return note.body_markdown;
  const blocks = note.content_blocks ?? legacyToBlocks(note);
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'text':
          return b.content;
        case 'code':
          return '```' + (b.language || '') + '\n' + b.code + '\n```';
        case 'link':
          return '[' + (b.label || b.url) + '](' + b.url + ')';
      }
    })
    .join('\n\n');
}

function legacyToBlocks(note: Note): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  if (note.description) {
    blocks.push({ type: 'text', content: note.description });
  }
  for (const s of note.code_snippets ?? []) {
    if (s.code) {
      blocks.push({ type: 'code', language: s.language, code: s.code, filename: s.filename });
    }
  }
  for (const l of note.links ?? []) {
    if (l.url) {
      blocks.push({ type: 'link', label: l.label, url: l.url });
    }
  }
  return blocks;
}

function parseMarkdownToBlocks(md: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const lines = md.split('\n');
  const linkLine = /^\[(.+?)\]\((https?:\/\/.+?)\)$/;
  let i = 0;

  while (i < lines.length) {
    const codeMatch = lines[i].match(/^```(\S*)/);
    if (codeMatch) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: 'code', language: codeMatch[1], code: codeLines.join('\n') });
      continue;
    }

    const linkMatch = lines[i].match(linkLine);
    if (linkMatch) {
      blocks.push({ type: 'link', label: linkMatch[1], url: linkMatch[2] });
      i++;
      continue;
    }

    const textLines: string[] = [];
    while (i < lines.length && !lines[i].startsWith('```') && !linkLine.test(lines[i])) {
      textLines.push(lines[i]);
      i++;
    }
    const text = textLines.join('\n').trim();
    if (text) blocks.push({ type: 'text', content: text });
  }

  return blocks;
}

/**
 * Legacy columns still read elsewhere (card preview + search use `description`),
 * derived from the markdown body on every body save.
 */
export function deriveLegacyFields(md: string): {
  description: string | null;
  code_snippets: CodeSnippet[];
  links: Link[];
  content_blocks: ContentBlock[];
} {
  const blocks = parseMarkdownToBlocks(md);
  const description = blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.content)
    .join('\n\n')
    // Drop inline HTML (e.g. <mark data-color="lime"> highlights) so search/previews see plain text.
    .replace(/<\/?[a-z][^>]*>/gi, '');
  return {
    description: description || null,
    code_snippets: blocks
      .filter((b) => b.type === 'code')
      .map((b) => ({ language: b.language || '', code: b.code })),
    links: blocks
      .filter((b) => b.type === 'link')
      .map((b) => ({ label: b.label || b.url, url: b.url })),
    content_blocks: blocks,
  };
}
