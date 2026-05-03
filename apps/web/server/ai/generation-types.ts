/**
 * Catalog of file kinds the /api/ai/generate-file endpoint can produce.
 *
 * Each entry is the source of truth for both the picker UI in the browser
 * extension and the server's validation of incoming generation requests —
 * if you add a kind, register it here. The `kind` discriminator picks which
 * AI primitive runs (text models for `text`, the AI Gateway image model for
 * `image`).
 */

export type GenerationKind = "text" | "image";

export interface GenerationType {
  id: string;
  label: string;
  description: string;
  extension: string; // includes the leading dot, e.g. ".md"
  mimeType: string;
  kind: GenerationKind;
  // For text outputs, an optional output format hint to bias the model. We
  // wrap the prompt with a system rule rather than relying on the model to
  // notice the extension on its own.
  systemHint?: string;
}

export const GENERATION_TYPES: readonly GenerationType[] = [
  // ── Text ─────────────────────────────────────────────────────────────
  {
    id: "md",
    label: "Markdown",
    description: "Headings, lists, code blocks",
    extension: ".md",
    mimeType: "text/markdown",
    kind: "text",
    systemHint:
      "Output GitHub-flavored Markdown only. No preamble, no closing remarks, no triple-backtick fence wrapping the whole document.",
  },
  {
    id: "txt",
    label: "Plain text",
    description: "Unstyled text",
    extension: ".txt",
    mimeType: "text/plain",
    kind: "text",
    systemHint:
      "Output plain text only — no Markdown formatting, no code fences, no commentary about the output.",
  },
  {
    id: "json",
    label: "JSON",
    description: "Structured data",
    extension: ".json",
    mimeType: "application/json",
    kind: "text",
    systemHint:
      "Output a single valid JSON document only. No prose before or after, no Markdown fences, no comments.",
  },
  {
    id: "csv",
    label: "CSV",
    description: "Comma-separated rows",
    extension: ".csv",
    mimeType: "text/csv",
    kind: "text",
    systemHint:
      "Output CSV only. First row is the header. Quote fields containing commas, quotes, or newlines per RFC 4180. No prose, no fences.",
  },
  {
    id: "html",
    label: "HTML",
    description: "Self-contained HTML document",
    extension: ".html",
    mimeType: "text/html",
    kind: "text",
    systemHint:
      "Output a complete HTML document starting with <!doctype html>. Inline any CSS. No prose before or after, no Markdown fences.",
  },
  {
    id: "js",
    label: "JavaScript",
    description: "A .js file",
    extension: ".js",
    mimeType: "text/javascript",
    kind: "text",
    systemHint:
      "Output JavaScript source only. No Markdown fences, no surrounding prose.",
  },
  {
    id: "ts",
    label: "TypeScript",
    description: "A .ts file",
    extension: ".ts",
    mimeType: "text/typescript",
    kind: "text",
    systemHint:
      "Output TypeScript source only. No Markdown fences, no surrounding prose.",
  },
  {
    id: "py",
    label: "Python",
    description: "A .py file",
    extension: ".py",
    mimeType: "text/x-python",
    kind: "text",
    systemHint:
      "Output Python source only. No Markdown fences, no surrounding prose.",
  },
  {
    id: "sql",
    label: "SQL",
    description: "A .sql file",
    extension: ".sql",
    mimeType: "text/x-sql",
    kind: "text",
    systemHint: "Output SQL only. No Markdown fences, no surrounding prose.",
  },

  // ── Images ────────────────────────────────────────────────────────────
  {
    id: "png",
    label: "PNG image",
    description: "AI-generated raster image",
    extension: ".png",
    mimeType: "image/png",
    kind: "image",
  },
  {
    id: "jpeg",
    label: "JPEG image",
    description: "AI-generated raster image",
    extension: ".jpg",
    mimeType: "image/jpeg",
    kind: "image",
  },
];

export function getGenerationType(id: string): GenerationType | null {
  return GENERATION_TYPES.find((t) => t.id === id) ?? null;
}
