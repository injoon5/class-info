import { Marked, type Tokens } from 'marked';

/**
 * Hardened markdown → HTML renderer, safe for `{@html}`.
 *
 * Notice descriptions are attacker-controllable (they arrive from a public
 * Convex mutation), so the output must not carry injected scripts. Three
 * defenses, all applied identically on server and client:
 *
 *   1. Raw HTML tokens are escaped, not passed through — kills `<script>`,
 *      `<img onerror=…>`, etc.
 *   2. Link/image URLs are protocol-checked — kills `javascript:` / `data:`
 *      (data: is allowed only for images).
 *   3. YouTube embeds are emitted from a trusted placeholder whose id/timestamp
 *      charsets are constrained, so even a forged placeholder can only ever
 *      produce a well-formed YouTube iframe.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const SAFE_LINK = /^(?:https?:\/\/|mailto:|tel:|\/|#)/i;
const SAFE_IMG = /^(?:https?:\/\/|\/|data:image\/)/i;

const YT_URL =
  /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[&?]t=(\d+)s?)?/g;
// Constrained charsets: id is 11 url-safe chars, start is digits only.
const YT_PLACEHOLDER = /<p>@@YT:([a-zA-Z0-9_-]{11}):(\d*)@@<\/p>/g;

const marked = new Marked({ gfm: true, breaks: false });

marked.use({
  renderer: {
    html({ text }: Tokens.HTML | Tokens.Tag) {
      return escapeHtml(text);
    },
    link(this: any, { href, title, tokens }: Tokens.Link) {
      const text = this.parser.parseInline(tokens);
      const url = (href ?? '').trim();
      if (!SAFE_LINK.test(url)) return text;
      const t = title ? ` title="${escapeHtml(title)}"` : '';
      return `<a href="${escapeHtml(url)}"${t} target="_blank" rel="noopener noreferrer nofollow">${text}</a>`;
    },
    image({ href, title, text }: Tokens.Image) {
      const url = (href ?? '').trim();
      const alt = escapeHtml(text ?? '');
      if (!SAFE_IMG.test(url)) return alt;
      const t = title ? ` title="${escapeHtml(title)}"` : '';
      return `<img src="${escapeHtml(url)}" alt="${alt}"${t} loading="lazy">`;
    },
  },
});

function preprocess(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    // Turn single newlines into paragraph breaks. Lookarounds (not capture
    // groups) so consecutive short lines each get split, instead of every
    // other one being missed.
    .replace(/(?<=[^\n])\n(?=[^\n])/g, '\n\n')
    .replace(YT_URL, (_m, id, ts) => `\n\n@@YT:${id}:${ts ?? ''}@@\n\n`);
}

export function renderMarkdown(text: string): string {
  if (!text) return '';
  const html = marked.parse(preprocess(text), { async: false }) as string;
  return html.replace(YT_PLACEHOLDER, (_m, id, ts) => {
    const start = ts ? `?start=${ts}` : '';
    return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${id}${start}" frameborder="0" allowfullscreen></iframe></div>`;
  });
}
