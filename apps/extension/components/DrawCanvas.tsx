import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Loader2 } from "lucide-react";
import { Tldraw, type Editor, type TLExportType } from "tldraw";
import tldrawCssText from "tldraw/tldraw.css?inline";

interface DrawCanvasProps {
  // The selected generation type's extension/mimeType drive both the default
  // filename and the export format we hand back to the file input.
  extension: string;
  mimeType: string;
  // True while the parent is in the middle of a competing generation flow.
  // We disable our own actions to keep the UX consistent.
  busy: boolean;
  onUse: (file: {
    name: string;
    mimeType: string;
    size: number;
    dataBase64: string;
  }) => void;
}

export default function DrawCanvas({
  extension,
  mimeType,
  busy,
  onUse,
}: DrawCanvasProps) {
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [name, setName] = useState(`untitled${extension}`);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // tldraw attaches its `pointermove` listener to `ownerDocument.body`
  // (see @tldraw/editor's useCanvasEvents). Inside a shadow root, pointer
  // events bubble out and get retargeted, which combined with React's
  // synthetic-event delegation on the inner shadow root reliably loses
  // the moves between pointerdown and pointerup — so the line / arrow
  // tools register a click but never see the drag, producing dots.
  //
  // The fix: render <Tldraw> via a portal into document.body (light DOM)
  // and keep an empty <div> placeholder inside the dialog to hold the
  // layout. We position the portal target absolutely over the placeholder
  // and keep it in sync with scroll / resize.
  useEffect(() => {
    const placeholder = placeholderRef.current;
    if (!placeholder) return;

    // Inject the tldraw stylesheet into the page's document.head — the
    // canvas now lives in light DOM, not the shadow root. Idempotent.
    if (!document.head.querySelector("style[data-locker-tldraw-css]")) {
      const style = document.createElement("style");
      style.setAttribute("data-locker-tldraw-css", "");
      style.textContent = tldrawCssText;
      document.head.appendChild(style);
    }

    const target = document.createElement("div");
    target.setAttribute("data-locker-tldraw-portal", "");
    // Match the dialog's z-index ceiling so the canvas sits above page
    // content but below floating UI we render later in this same root.
    target.style.cssText =
      "position: fixed; z-index: 2147483647; pointer-events: auto;";
    document.body.appendChild(target);

    const updatePosition = () => {
      const r = placeholder.getBoundingClientRect();
      target.style.top = `${r.top}px`;
      target.style.left = `${r.left}px`;
      target.style.width = `${r.width}px`;
      target.style.height = `${r.height}px`;
    };

    updatePosition();
    setPortalTarget(target);

    // Capture-phase scroll catches scrolls on any ancestor (the dialog
    // panel scrolls when its content overflows), not just the window.
    const ro = new ResizeObserver(updatePosition);
    ro.observe(placeholder);
    document.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      ro.disconnect();
      document.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      target.remove();
    };
  }, []);

  // Track the active generation type so the suggested filename follows the
  // chosen image format. We only auto-update while the user hasn't customized
  // the name; once they've typed something else, leave it alone.
  useEffect(() => {
    setName((prev) =>
      prev.startsWith("untitled.") ? `untitled${extension}` : prev,
    );
  }, [extension]);

  const submit = async () => {
    if (!editor) return;
    const ids = editor.getCurrentPageShapeIds();
    if (ids.size === 0) {
      setError("Draw something first.");
      return;
    }
    setError(null);
    setExporting(true);
    try {
      const result = await editor.toImage([...ids], {
        format: mimeToFormat(mimeType),
        background: true,
      });
      const dataBase64 = await blobToBase64(result.blob);
      onUse({
        name: name.trim() || `untitled${extension}`,
        mimeType,
        size: result.blob.size,
        dataBase64,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not export drawing.",
      );
    } finally {
      setExporting(false);
    }
  };

  const disabled = busy || exporting;

  return (
    <div style={root}>
      {error ? <div style={errorBox}>{error}</div> : null}
      <div ref={placeholderRef} style={canvasWrap} />
      {portalTarget
        ? createPortal(<Tldraw onMount={setEditor} />, portalTarget)
        : null}
      <div style={composerBar}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={nameInput}
          placeholder={`untitled${extension}`}
          disabled={disabled}
          aria-label="File name"
        />
        <button
          type="button"
          style={primaryBtn}
          onClick={submit}
          disabled={disabled}
        >
          {exporting ? (
            <>
              <Loader2 size={14} className="locker-spin" /> Exporting…
            </>
          ) : (
            <>
              <Check size={14} /> Use this file
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function mimeToFormat(mime: string): TLExportType {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpeg";
  if (mime === "image/svg+xml") return "svg";
  if (mime === "image/webp") return "webp";
  return "png";
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

const root: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const canvasWrap: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: 360,
  background: "#fff",
  border: "1px solid rgba(20, 17, 15, 0.10)",
  borderRadius: 14,
  overflow: "hidden",
};

const composerBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const nameInput: React.CSSProperties = {
  flex: 1,
  height: 36,
  padding: "0 12px",
  borderRadius: 9999,
  border: "1px solid rgba(20, 17, 15, 0.10)",
  background: "#fff",
  fontSize: 13,
  color: "#14110f",
  fontFamily: "inherit",
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  background: "#3a62f5",
  color: "#fff",
  border: "none",
  borderRadius: 9999,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "inherit",
};

const errorBox: React.CSSProperties = {
  padding: "8px 10px",
  background: "#fbe9e6",
  color: "#8a261d",
  fontSize: 12,
  borderRadius: 8,
};
