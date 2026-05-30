import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function DropdownPortal({ triggerRef, open, onClose, children, align = "right" }) {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const contentRef = useRef(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 6,
        left: align === "right" ? rect.right : rect.left,
        width: rect.width,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, triggerRef, align]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (triggerRef.current && triggerRef.current.contains(e.target)) return;
      if (contentRef.current && contentRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  const style =
    align === "right"
      ? { position: "fixed", top: pos.top, right: window.innerWidth - pos.left, zIndex: 9999 }
      : { position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 };

  return createPortal(
    <div ref={contentRef} style={style}>{children}</div>,
    document.body
  );
}
