// Tiny self-contained markdown → HTML renderer. Covers the markdown subset that
// shows up in user-story files: headings (## … ######), paragraphs, unordered
// and ordered lists with optional `[ ]`/`[x]` checkboxes, blockquotes, fenced
// code blocks, inline code, **bold**, *italic*. Anything outside this subset is
// passed through escaped. Not a full CommonMark implementation — by design.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(text: string): string {
  let out = escapeHtml(text);
  // Inline code first so its contents are not further interpreted.
  out = out.replace(/`([^`]+)`/g, (_, code) => `<code>${code}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, bold) => `<strong>${bold}</strong>`);
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, (_, pre, em) => `${pre}<em>${em}</em>`);
  return out;
}

function renderListItem(line: string): string {
  // Strip the leading bullet (`- ` or `1. `) and the optional checkbox.
  const stripped = line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, "");
  const checkboxMatch = stripped.match(/^\[([ xX])\]\s*(.*)$/);
  if (checkboxMatch) {
    const checked = checkboxMatch[1].toLowerCase() === "x";
    const rest = renderInline(checkboxMatch[2]);
    return `<li class="cb"><input type="checkbox" disabled${checked ? " checked" : ""}> ${rest}</li>`;
  }
  return `<li>${renderInline(stripped)}</li>`;
}

export function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let i = 0;
  let paragraph: string[] = [];

  function flushParagraph(): void {
    if (paragraph.length === 0) return;
    out.push(`<p>${renderInline(paragraph.join(" ").trim())}</p>`);
    paragraph = [];
  }

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block.
    if (/^```/.test(line)) {
      flushParagraph();
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      const langClass = lang ? ` class="lang-${escapeHtml(lang)}"` : "";
      out.push(`<pre><code${langClass}>${escapeHtml(buf.join("\n"))}</code></pre>`);
      i += 1;
      continue;
    }

    // ATX heading. Render at h4+ so it nests under the page's existing h1/h2/h3.
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushParagraph();
      const depth = Math.min(6, Math.max(4, headingMatch[1].length + 3));
      out.push(`<h${depth}>${renderInline(headingMatch[2])}</h${depth}>`);
      i += 1;
      continue;
    }

    // Blockquote (collapse runs of `> ` lines into one block).
    if (/^>\s?/.test(line)) {
      flushParagraph();
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      out.push(`<blockquote>${renderInline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // Unordered or ordered list (one consecutive run becomes one <ul>/<ol>).
    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      flushParagraph();
      const tag = /^\s*\d+\./.test(line) ? "ol" : "ul";
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*+]|\d+\.)\s+/.test(lines[i])) {
        items.push(renderListItem(lines[i]));
        i += 1;
      }
      out.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    // Blank line ends the current paragraph.
    if (line.trim() === "") {
      flushParagraph();
      i += 1;
      continue;
    }

    paragraph.push(line);
    i += 1;
  }
  flushParagraph();
  return out.join("\n");
}
