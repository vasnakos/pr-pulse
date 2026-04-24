import { useEffect, useRef } from "react";

interface ContextMenuProps {
  x: number;
  y: number;
  label: string;
  onSelect: () => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, label, onSelect, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    const handleScroll = () => {
      onClose();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        left: x,
        top: y,
      }}
    >
      <button
        className="context-menu-item"
        onClick={() => {
          onSelect();
          onClose();
        }}
        type="button"
      >
        {label}
      </button>
    </div>
  );
}
