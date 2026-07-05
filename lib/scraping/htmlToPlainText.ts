const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&hellip;": "…",
  "&mdash;": "—",
  "&ndash;": "–",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
};

function decodeEntities(text: string): string {
  let decoded = text.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  decoded = decoded.replace(/&[a-zA-Z]+;/g, (entity) => HTML_ENTITIES[entity] ?? entity);
  return decoded;
}

/**
 * Ported from the original n8n Code node: strips scripts/styles, removes
 * tags, decodes entities, and collapses whitespace into readable plain text.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";

  let text = html;
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<!--[\s\S]*?-->/g, " ");
  text = text.replace(/<\/(p|div|br|li|h[1-6]|tr)>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeEntities(text);
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n+/g, "\n");
  text = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  return text.trim();
}
