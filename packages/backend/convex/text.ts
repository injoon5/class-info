function getUrlBasename(url: string): string {
  const withoutQuery = url.split("?")[0].split("#")[0];
  const parts = withoutQuery.split("/");
  return parts[parts.length - 1] || url;
}

// A notice's one-line preview: the first line with any text in it, as plain
// text. Shared with the web app, which uses it for meta descriptions.
export function summarizeDescription(description: string): string {
  for (const raw of description.split("\n")) {
    const trimmed = raw.trim();
    // A fence or rule line carries no words worth previewing.
    if (/^(?:`{3,}|~{3,}|-{3,}|\*{3,}|_{3,})/.test(trimmed)) continue;
    const line = trimmed
      .replace(/^(?:#{1,6}\s+|>\s*|[-*+]\s+|\d+\.\s+)+/, "")
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, link) => {
        const trimmedAlt = String(alt || "").trim();
        if (trimmedAlt.length > 0) return trimmedAlt;
        return getUrlBasename(String(link || "").trim());
      })
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/(\*\*|__)(.+?)\1/g, "$2")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .trim();
    if (line) return line;
  }
  return "";
}
