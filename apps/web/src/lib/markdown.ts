import { Marked, type Tokens } from 'marked';

// Markdown → HTML that is safe for `{@html}`: raw HTML is escaped, link and
// image URLs are protocol-checked, and YouTube embeds come only from a
// placeholder whose id/timestamp charsets are constrained.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function isSafePath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

function isSafeLink(url: string): boolean {
  return isSafeHttpUrl(url) || isSafePath(url) || /^(?:mailto:|tel:|#)/i.test(url);
}

function isSafeImg(url: string): boolean {
  return isSafeHttpUrl(url) || isSafePath(url);
}

// Bare URLs only: the lookbehind skips link targets like `[영상](https://youtu.be/…)`
// and matches starting partway into a longer URL.
const YT_URL =
  /(?<![(\[<"'/\w.])(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]t=(\d+)s?)?/g;
// Constrained charsets: id is 11 url-safe chars, start is digits only.
const YT_PLACEHOLDER = /<p>@@YT:([a-zA-Z0-9_-]{11}):(\d*)@@<\/p>/g;

const marked = new Marked({ gfm: true, breaks: false });

marked.use({
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return escapeHtml(text);
    },
    link({ href, title, tokens }: Tokens.Link) {
      const text = this.parser.parseInline(tokens);
      const url = (href ?? '').trim();
      if (!isSafeLink(url)) return text;
      const t = title ? ` title="${escapeHtml(title)}"` : '';
      return `<a href="${escapeHtml(url)}"${t} target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
    },
    image({ href, title, text }: Tokens.Image) {
      const url = (href ?? '').trim();
      const alt = escapeHtml(text ?? '');
      if (!isSafeImg(url)) return alt;
      const t = title ? ` title="${escapeHtml(title)}"` : '';
      return `<img src="${escapeHtml(url)}" alt="${alt}"${t} loading="lazy">`;
    },
  },
});

const FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const TABLE_DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

// Marks which lines belong to a GFM table: the header, the delimiter row, and
// every following line that still has a cell separator.
function tableLines(lines: string[]): boolean[] {
  const inTable = lines.map(() => false);
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.includes('-') || !TABLE_DELIMITER.test(line)) continue;
    if (!lines[i - 1]!.includes('|')) continue;
    inTable[i - 1] = inTable[i] = true;
    for (let j = i + 1; j < lines.length && lines[j]!.includes('|'); j++) inTable[j] = true;
  }
  return inTable;
}

function preprocess(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const inTable = tableLines(lines);
  const out: string[] = [];
  let fence: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]!;
    const marker = FENCE.exec(line)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      out.push(line);
      continue;
    }
    if (marker) {
      fence = marker;
      out.push(line);
      continue;
    }
    line = line.replace(YT_URL, (_m, id, ts) => `\n\n@@YT:${id}:${ts ?? ''}@@\n\n`);
    out.push(line);
    // A single newline is a paragraph break, except between table rows.
    const next = lines[i + 1];
    if (next !== undefined && line.trim() && next.trim() && !(inTable[i] && inTable[i + 1])) {
      out.push('');
    }
  }
  return out.join('\n');
}

export function renderMarkdown(text: string): string {
  if (!text) return '';
  const html = marked.parse(preprocess(text), { async: false }) as string;
  return html.replace(YT_PLACEHOLDER, (_m, id, ts) => {
    const start = ts ? `?start=${ts}` : '';
    return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${id}${start}" title="YouTube video" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe></div>`;
  });
}
