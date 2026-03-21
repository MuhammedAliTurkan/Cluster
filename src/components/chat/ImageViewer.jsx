import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export default function ImageViewer({ src, alt, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const containerRef = useRef(null);

  // ESC ile kapat
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    setScale((s) => {
      const next = s + (e.deltaY > 0 ? -0.15 : 0.15);
      return Math.max(0.25, Math.min(next, 8));
    });
  }, []);

  // Drag
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    setPosition({
      x: dragStart.current.posX + (e.clientX - dragStart.current.x),
      y: dragStart.current.posY + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    if (!dragging) return;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Sifirla
  const reset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  // Tam ekran
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
  };

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[99999] bg-black/90 flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/50 shrink-0">
        <div className="text-sm text-gray-300 truncate">{alt || "Gorsel"}</div>
        <div className="flex items-center gap-1">
          {/* Uzaklastir */}
          <button onClick={() => setScale((s) => Math.max(0.25, s - 0.25))}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition" title="Uzaklastir">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M9 2a7 7 0 104.32 12.55l3.56 3.56a1 1 0 001.42-1.42l-3.56-3.56A7 7 0 009 2zM4 9a5 5 0 1110 0A5 5 0 014 9z"/>
              <path d="M7 9h4a1 1 0 010 2H7a1 1 0 010-2z"/>
            </svg>
          </button>
          {/* Zoom seviyesi */}
          <button onClick={reset}
            className="px-2 py-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white text-xs font-mono min-w-[50px] text-center transition">
            {Math.round(scale * 100)}%
          </button>
          {/* Yakinlastir */}
          <button onClick={() => setScale((s) => Math.min(8, s + 0.25))}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition" title="Yakinlastir">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M9 2a7 7 0 104.32 12.55l3.56 3.56a1 1 0 001.42-1.42l-3.56-3.56A7 7 0 009 2zM4 9a5 5 0 1110 0A5 5 0 014 9z"/>
              <path d="M9 7a1 1 0 012 0v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0v-1H8a1 1 0 010-2h1V7z"/>
            </svg>
          </button>
          <div className="w-px h-5 bg-white/10 mx-1" />
          {/* Tam ekran */}
          <button onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition" title="Tam ekran">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H5v3a1 1 0 01-2 0V4zM16 3a1 1 0 011 1v3a1 1 0 01-2 0V5h-3a1 1 0 010-2h4zM4 17a1 1 0 01-1-1v-3a1 1 0 012 0v2h3a1 1 0 010 2H4zM17 16a1 1 0 01-1 1h-4a1 1 0 010-2h3v-2a1 1 0 012 0v3z"/>
            </svg>
          </button>
          {/* Indir */}
          <a href={src} download={alt || "image"} target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition" title="Indir">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M10 3a1 1 0 011 1v7.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 11.586V4a1 1 0 011-1z"/>
              <path d="M3 15a1 1 0 011-1h12a1 1 0 010 2H4a1 1 0 01-1-1z"/>
            </svg>
          </a>
          <div className="w-px h-5 bg-white/10 mx-1" />
          {/* Kapat */}
          <button onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition" title="Kapat">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Gorsel */}
      <div
        className="flex-1 overflow-hidden flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{ cursor: dragging ? "grabbing" : scale > 1 ? "grab" : "default" }}
      >
        <img
          src={src}
          alt={alt || ""}
          draggable={false}
          className="max-w-none select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: dragging ? "none" : "transform 0.15s ease",
            maxHeight: scale <= 1 ? "90vh" : "none",
            maxWidth: scale <= 1 ? "90vw" : "none",
          }}
        />
      </div>
    </div>,
    document.body
  );
}
