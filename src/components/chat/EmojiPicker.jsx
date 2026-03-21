import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

export default function EmojiPicker({ onSelect, onClose, anchorRef, position }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef?.current) {
      const r = anchorRef.current.getBoundingClientRect();
      if (position === "top") {
        setPos({ bottom: window.innerHeight - r.top + 8, left: Math.max(8, r.left - 160) });
      } else {
        setPos({ top: r.bottom + 8, left: Math.max(8, r.left - 160) });
      }
    }
  }, [anchorRef, position]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) && anchorRef?.current && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  const style = {
    position: "fixed",
    zIndex: 99999,
    ...pos,
  };

  return createPortal(
    <div ref={ref} style={style}>
      <Picker
        data={data}
        onEmojiSelect={(emoji) => onSelect(emoji.native)}
        theme="dark"
        locale="tr"
        previewPosition="none"
        skinTonePosition="search"
        maxFrequentRows={2}
        perLine={8}
      />
    </div>,
    document.body
  );
}
