import sanitize from "sanitize-html"

// Whitelist of tags that TipTap rich text editor produces.
// Strips <script>, <iframe>, <object>, event handlers, javascript: URLs.
const sanitizeOptions: sanitize.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "a", "ul", "ol", "li",
    "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre",
    "img", "span", "div", "table", "thead", "tbody", "tr", "th", "td",
    "sub", "sup", "hr",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "class"],
    img: ["src", "alt", "width", "height", "class"],
    span: ["class", "style"],
    div: ["class", "style"],
    p: ["class", "style"],
    td: ["colspan", "rowspan", "class", "style"],
    th: ["colspan", "rowspan", "class", "style"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedStyles: {
    "*": {
      color: [/^(#[0-9a-fA-F]{3,8}|rgb\(\d+,\s*\d+,\s*\d+\)|[a-zA-Z]+)$/],
      "background-color": [/^(#[0-9a-fA-F]{3,8}|rgb\(\d+,\s*\d+,\s*\d+\)|[a-zA-Z]+|transparent)$/],
      "text-align": [/^(left|center|right|justify)$/],
      "font-size": [/^\d+(\.\d+)?(px|em|rem|%)$/],
      "font-weight": [/^(normal|bold|bolder|lighter|\d{3})$/],
      "text-decoration": [/^(none|underline|line-through|overline)$/],
      width: [/^\d+(\.\d+)?(px|em|rem|%|vw)$/],
      height: [/^\d+(\.\d+)?(px|em|rem|%|vh)$/],
    },
  },
}

/**
 * Sanitize HTML content, allowing only safe tags and attributes.
 * Use this for any content rendered via dangerouslySetInnerHTML.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return ""
  return sanitize(dirty, sanitizeOptions)
}
