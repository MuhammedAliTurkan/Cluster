import { useRef, useState, useCallback } from "react";

/* ── Resize Handle ── */
function ResizeHandle({ side, onResize }) {
  const onMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = onResize(null); // null = get current width
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev) => {
      const delta = ev.clientX - startX;
      const newW = side === "left" ? startW + delta : startW - delta;
      onResize(newW);
    };
    const up = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 shrink-0 cursor-col-resize group flex items-center justify-center hover:bg-accent/20 transition-colors"
    >
      <div className="w-[2px] h-8 rounded-full bg-border-light group-hover:bg-accent transition-colors" />
    </div>
  );
}

/* ── Center Resize Handle (yatay veya dikey) ── */
function CenterResizeHandle({ direction, containerRef, onSplit }) {
  const isHorizontal = direction === "row"; // row → dikey ayırıcı, col → yatay ayırıcı
  const onMouseDown = (e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
    const move = (ev) => {
      const pct = isHorizontal
        ? ((ev.clientX - rect.left) / rect.width) * 100
        : ((ev.clientY - rect.top) / rect.height) * 100;
      onSplit(pct);
    };
    const up = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return (
    <div
      onMouseDown={onMouseDown}
      className={`shrink-0 group flex items-center justify-center hover:bg-accent/20 transition-colors ${
        isHorizontal
          ? "w-1 cursor-col-resize"
          : "h-1 cursor-row-resize"
      }`}
    >
      <div
        className={`rounded-full bg-border-light group-hover:bg-accent transition-colors ${
          isHorizontal ? "w-[2px] h-8" : "h-[2px] w-8"
        }`}
      />
    </div>
  );
}

/* ── Drop zone overlay — sürükleme sırasında 4 yön gösterir ── */
function DropZoneOverlay({ activeZone, onZoneEnter, onZoneDrop }) {
  const zones = [
    { id: "top",    style: "top-0 left-[20%] right-[20%] h-[35%]",       arrow: "↑", label: "Üst" },
    { id: "bottom", style: "bottom-0 left-[20%] right-[20%] h-[35%]",    arrow: "↓", label: "Alt" },
    { id: "left",   style: "top-[20%] left-0 bottom-[20%] w-[30%]",      arrow: "←", label: "Sol" },
    { id: "right",  style: "top-[20%] right-0 bottom-[20%] w-[30%]",     arrow: "→", label: "Sağ" },
  ];

  return (
    <div className="absolute inset-0 z-20 pointer-events-auto">
      {zones.map(z => (
        <div
          key={z.id}
          className={`absolute ${z.style} flex items-center justify-center rounded-lg transition-colors duration-150 ${
            activeZone === z.id
              ? "bg-accent/30 border-2 border-accent"
              : "bg-white/5 border-2 border-transparent hover:bg-accent/15 hover:border-accent/40"
          }`}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); onZoneEnter(z.id); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onZoneDrop(z.id, e); }}
        >
          <div className={`flex flex-col items-center gap-0.5 transition-opacity ${
            activeZone === z.id ? "opacity-100" : "opacity-40"
          }`}>
            <span className="text-lg text-white/80">{z.arrow}</span>
            <span className="text-[10px] text-white/60 font-medium">{z.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Panel Header ── */
function PanelHeader({ label, panelId, onClose, onDragStart, onDragEnd }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", panelId);
        e.dataTransfer.effectAllowed = "move";
        onDragStart?.(panelId);
      }}
      onDragEnd={onDragEnd}
      className="h-7 shrink-0 flex items-center px-2 bg-surface-1 select-none border-b border-border cursor-grab active:cursor-grabbing"
    >
      {/* Grip */}
      <svg viewBox="0 0 16 16" className="w-3 h-3 mr-1.5 text-gray-600 shrink-0" fill="currentColor">
        <circle cx="4" cy="3" r="1.2"/><circle cx="4" cy="8" r="1.2"/><circle cx="4" cy="13" r="1.2"/>
        <circle cx="10" cy="3" r="1.2"/><circle cx="10" cy="8" r="1.2"/><circle cx="10" cy="13" r="1.2"/>
      </svg>
      <span className="text-[11px] text-gray-400 truncate flex-1">{label}</span>
      {onClose && (
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-0.5 rounded text-gray-600 hover:text-rose-400 transition"
          title="Kapat"
        >
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3 h-3">
            <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* ── Ana Layout ── */
export default function PanelLayout({
  layout, shows, togglePanel, setLeftWidth, setRightWidth, setCenterSplit, swapSides, reorderCenter,
  renderSidePanel, renderCenterPanel, emptyCenter, centerLabels, isDMArea,
}) {
  const [dragging, setDragging] = useState(null);
  const [dropHint, setDropHint] = useState(null); // { panelId, position }
  const centerContainerRef = useRef(null);

  const leftResizer = (w) => {
    if (w === null) return layout.leftWidth;
    setLeftWidth(w);
  };
  const rightResizer = (w) => {
    if (w === null) return layout.rightWidth;
    setRightWidth(w);
  };

  // Sol/sağ sütun drop handler
  const handleColumnDrop = (side) => (e) => {
    e.preventDefault();
    const panelId = e.dataTransfer.getData("text/plain");
    if (!panelId || !["sidebar", "members"].includes(panelId)) return;
    if (layout[side] === panelId) return;
    swapSides();
    setDragging(null);
    setDropHint(null);
  };

  // Center zone drop handler
  const handleZoneDrop = (targetPanelId, zone, e) => {
    const panelId = e.dataTransfer.getData("text/plain");
    if (!panelId || !layout.center.includes(panelId) || panelId === targetPanelId) return;

    const fromIdx = layout.center.indexOf(panelId);
    const targetIdx = layout.center.indexOf(targetPanelId);
    const newDirection = (zone === "left" || zone === "right") ? "row" : "col";
    const before = zone === "top" || zone === "left";

    // splice(fromIdx,1) sonrası target kayar mı hesapla
    const toIdx = before
      ? (fromIdx < targetIdx ? targetIdx - 1 : targetIdx)
      : (fromIdx < targetIdx ? targetIdx : targetIdx + 1);

    reorderCenter(fromIdx, toIdx, newDirection);
    setDragging(null);
    setDropHint(null);
  };

  const hasLeft = !!layout.left;
  const hasRight = !!layout.right;
  const centerEmpty = layout.center.length === 0;
  const isRow = layout.centerDirection === "row" && layout.center.length > 1;

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Sol sütun */}
      {hasLeft && (
        <>
          <div
            style={{ width: layout.leftWidth }}
            className="shrink-0 h-full overflow-hidden flex flex-col bg-surface-2"
            onDragOver={(e) => { if (dragging && ["sidebar", "members"].includes(dragging)) { e.preventDefault(); } }}
            onDrop={handleColumnDrop("left")}
          >
            <PanelHeader
              label={layout.left === "sidebar" ? (isDMArea ? "Sohbetler" : "Kanallar") : (isDMArea ? "Arkadaşlar" : "Üyeler")}
              panelId={layout.left}
              onClose={() => togglePanel(layout.left)}
              onDragStart={setDragging}
              onDragEnd={() => setDragging(null)}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              {renderSidePanel(layout.left)}
            </div>
          </div>
          <ResizeHandle side="left" onResize={leftResizer} />
        </>
      )}

      {/* Orta alan */}
      <div
        ref={centerContainerRef}
        className={`flex-1 min-w-0 h-full flex ${isRow ? "flex-row" : "flex-col"} overflow-hidden`}
      >
        {centerEmpty ? (
          emptyCenter
        ) : (
          layout.center.map((panelId, idx) => {
            const hasTwoPanels = layout.center.length === 2;
            const showOverlay = dragging && layout.center.includes(dragging) && dragging !== panelId;

            // 2 panel varken: ilk panel centerSplit%, ikinci panel kalanı alır
            const sizeStyle = hasTwoPanels
              ? isRow
                ? { width: idx === 0 ? `${layout.centerSplit}%` : `${100 - layout.centerSplit}%` }
                : { height: idx === 0 ? `${layout.centerSplit}%` : `${100 - layout.centerSplit}%` }
              : {};

            const fragment = (
              <div
                key={panelId}
                style={sizeStyle}
                className={`${hasTwoPanels ? "shrink-0" : "flex-1"} ${isRow ? "min-w-0" : "min-h-0"} flex flex-col overflow-hidden relative`}
                onDragOver={(e) => { if (showOverlay) e.preventDefault(); }}
                onDragLeave={() => setDropHint(null)}
              >
                {showOverlay && (
                  <DropZoneOverlay
                    activeZone={dropHint?.panelId === panelId ? dropHint.position : null}
                    onZoneEnter={(zone) => setDropHint({ panelId, position: zone })}
                    onZoneDrop={(zone, e) => handleZoneDrop(panelId, zone, e)}
                  />
                )}
                <PanelHeader
                  label={centerLabels?.[panelId] || (panelId === "chat" ? "Mesajlar" : panelId === "voice" ? "Sesli Sohbet" : panelId)}
                  panelId={panelId}
                  onClose={() => togglePanel(panelId)}
                  onDragStart={setDragging}
                  onDragEnd={() => { setDragging(null); setDropHint(null); }}
                />
                <div className="flex-1 min-h-0 overflow-hidden">
                  {renderCenterPanel(panelId)}
                </div>
              </div>
            );

            // İlk panelden sonra resize handle ekle
            if (hasTwoPanels && idx === 0) {
              return [
                fragment,
                <CenterResizeHandle
                  key="center-resize"
                  direction={layout.centerDirection}
                  containerRef={centerContainerRef}
                  onSplit={setCenterSplit}
                />,
              ];
            }
            return fragment;
          })
        )}
      </div>

      {/* Sağ sütun */}
      {hasRight && (
        <>
          <ResizeHandle side="right" onResize={rightResizer} />
          <div
            style={{ width: layout.rightWidth }}
            className="shrink-0 h-full overflow-hidden flex flex-col bg-surface-2"
            onDragOver={(e) => { if (dragging && ["sidebar", "members"].includes(dragging)) { e.preventDefault(); } }}
            onDrop={handleColumnDrop("right")}
          >
            <PanelHeader
              label={layout.right === "sidebar" ? (isDMArea ? "Sohbetler" : "Kanallar") : (isDMArea ? "Arkadaşlar" : "Üyeler")}
              panelId={layout.right}
              onClose={() => togglePanel(layout.right)}
              onDragStart={setDragging}
              onDragEnd={() => setDragging(null)}
            />
            <div className="flex-1 min-h-0 overflow-hidden">
              {renderSidePanel(layout.right)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
