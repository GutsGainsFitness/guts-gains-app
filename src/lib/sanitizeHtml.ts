import DOMPurify from "dompurify";

/**
 * Sanitiseer HTML-content vóór render. Gebruikt voor blog-artikelen die met
 * de WYSIWYG-editor zijn opgeslagen. Whitelist alleen veilige tags/attributen.
 */
export function sanitizeBlogHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "blockquote",
      "h1", "h2", "h3", "h4", "ul", "ol", "li",
      "a", "img", "hr", "code", "pre",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "title"],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Detecteert of content HTML bevat (WYSIWYG output) of nog plain text is
 * (oudere posts opgeslagen vóór de editor-upgrade).
 */
export function isHtmlContent(content: string | null | undefined): boolean {
  if (!content) return false;
  return /<\/?(p|h[1-6]|ul|ol|li|strong|em|blockquote|a|img|br)[\s>]/i.test(content);
}