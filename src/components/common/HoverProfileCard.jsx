import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePresence, STATUS_OPTIONS } from "../../context/PresenceContext";
import Avatar from "./Avatar";

const CARD_W = 288;
const CARD_H = 200; // min estimate, actual size adjusts via useEffect

export default function HoverProfileCard({ user, roles, serverMember, placement = "left", children }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const timerRef = useRef(null);
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const { getStatus } = usePresence();

  const calcPosition = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left;
    if (placement === "right") {
      left = rect.right + 8;
      if (left + CARD_W > vw) left = rect.left - CARD_W - 8;
    } else {
      left = rect.left - CARD_W - 8;
      if (left < 0) left = rect.right + 8;
    }
    left = Math.max(4, Math.min(left, vw - CARD_W - 4));

    let top = rect.top + rect.height / 2 - CARD_H / 2;
    top = Math.max(4, Math.min(top, vh - CARD_H - 4));

    setPos({ top, left });
  }, [placement]);

  const show = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      calcPosition();
      setVisible(true);
    }, 400);
  }, [calcPosition]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 200);
  }, []);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  // Kart render edildikten sonra gercek boyutuna gore pozisyon duzelt
  useEffect(() => {
    if (visible && cardRef.current) {
      const cr = cardRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      setPos((p) => ({
        top: cr.bottom > vh - 4 ? Math.max(4, vh - cr.height - 4) : p.top,
        left: cr.right > vw - 4 ? Math.max(4, vw - cr.width - 4) : p.left,
      }));
    }
  }, [visible]);

  if (!user) return children;

  const globalDisplay = user.displayName || user.username || "?";
  const display = serverMember?.nickname || globalDisplay;
  const showGlobalName = serverMember?.nickname && serverMember.nickname !== globalDisplay;
  const effectiveAvatar = serverMember?.serverAvatarUrl || user.avatarUrl;
  const effectiveBanner = serverMember?.serverBannerUrl || user.bannerUrl;
  const status = getStatus(user.id);
  const statusOpt = STATUS_OPTIONS.find((o) => o.value === status);
  const bannerBg = effectiveBanner
    ? { backgroundImage: `url(${effectiveBanner})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: user.bannerColor || "#059669" };

  return (
    <div
      ref={containerRef}
      className="w-full"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}

      {visible && createPortal(
        <div
          ref={cardRef}
          className="fixed"
          style={{ top: pos.top, left: pos.left, zIndex: 99999 }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <div className="w-72 rounded-xl bg-surface-1 border border-white/10 shadow-2xl overflow-hidden">
            <div className="h-16" style={bannerBg} />
            <div className="px-3 pb-3 relative">
              <div className="absolute -top-7 left-3">
                <Avatar src={effectiveAvatar} name={display} size={54} status={status} className="ring-4 ring-surface-1" />
              </div>
              <div className="pt-8">
                <div className="text-white text-[16px] truncate">{display}</div>
                {showGlobalName && <div className="text-gray-400 text-[11px] truncate">{globalDisplay}</div>}
                <div className="text-gray-400 text-xs truncate">@{user.username}</div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusOpt?.color || "bg-gray-500"}`} />
                  <span className="text-xs text-gray-300">{statusOpt?.label || "Cevrimdisi"}</span>
                </div>
                {roles?.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/5">
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Roller</div>
                    <div className="flex flex-wrap gap-1">
                      {roles.map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-1 bg-surface-4 rounded-md px-2 py-0.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color || "#99aab5" }} />
                          <span className="text-[11px] text-gray-300">{r.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
