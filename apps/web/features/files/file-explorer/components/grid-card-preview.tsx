"use client";

import { useRef, useEffect, useState, memo } from "react";
import { cn } from "@/lib/utils";
import { FileIcon } from "@/components/file-icon";
import { trpc } from "@/lib/trpc/client";
import { getFileCategory } from "@locker/common";

/* ------------------------------------------------------------------ */
/*  PDF first-page thumbnail (canvas-based, like PDFThumbnail)         */
/* ------------------------------------------------------------------ */

const PdfThumbnail = memo(function PdfThumbnail({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const pdfjs = await import("pdfjs-dist");
      if (typeof window !== "undefined" && !pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      }

      try {
        const doc = await pdfjs.getDocument({ url, withCredentials: false })
          .promise;
        if (cancelled) {
          doc.destroy();
          return;
        }

        const page = await doc.getPage(1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const container = canvas.parentElement;
        if (!container) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = container.clientWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        const context = canvas.getContext("2d");
        if (!context) return;

        context.scale(outputScale, outputScale);
        await page.render({ canvas, viewport }).promise;
        if (!cancelled) setReady(true);

        doc.destroy();
      } catch {
        /* silent fail — icon fallback will show */
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "absolute inset-0 w-full object-cover object-top transition-opacity duration-300",
        ready ? "opacity-100" : "opacity-0",
      )}
    />
  );
});

/* ------------------------------------------------------------------ */
/*  Main preview component                                             */
/* ------------------------------------------------------------------ */

export function GridCardPreview({
  fileId,
  fileName,
  mimeType,
}: {
  fileId: string;
  fileName: string;
  mimeType: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const fetchedRef = useRef(false);

  const getDownloadUrl = trpc.files.getDownloadUrl.useMutation();
  const category = getFileCategory(mimeType);
  const isPdf = mimeType === "application/pdf";
  const isImage = category === "image";
  const isVideo = category === "video";
  const hasPreview = isImage || isPdf || isVideo;

  // Observe visibility
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setIsVisible(true);
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Fetch URL when visible (only for previewable types)
  useEffect(() => {
    if (!isVisible || !hasPreview || fetchedRef.current) return;
    fetchedRef.current = true;

    getDownloadUrl
      .mutateAsync({ id: fileId })
      .then((result) => setUrl(result.url))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible, hasPreview, fileId]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden flex items-center justify-center"
    >
      {/* Fallback icon — always present, fades out when preview loads */}
      <FileIcon
        name={fileName}
        mimeType={mimeType}
        className={cn(
          "size-10 opacity-30 transition-opacity duration-300",
          (imgLoaded || (isPdf && url)) && "opacity-0",
        )}
      />

      {/* Image preview */}
      {isImage && url && (
        <img
          src={url}
          alt={fileName}
          onLoad={() => setImgLoaded(true)}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            imgLoaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}

      {/* PDF first-page preview */}
      {isPdf && url && <PdfThumbnail url={url} />}

      {/* Video poster frame */}
      {isVideo && url && (
        <video
          src={url}
          muted
          preload="metadata"
          onLoadedData={(e) => {
            const video = e.currentTarget;
            video.currentTime = 0.1;
            setImgLoaded(true);
          }}
          className={cn(
            "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
            imgLoaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
    </div>
  );
}
