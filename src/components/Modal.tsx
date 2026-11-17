'use client';

import React, { useEffect, useRef } from 'react';

interface ModalProps {
  onClose: () => void;
  /** Accessible name announced by screen readers. */
  label: string;
  /** 'end' docks the panel to the right edge (side drawer). */
  align?: 'center' | 'end';
  /** Clicking the dimmed backdrop closes the dialog. Leave off for forms so a stray click can't discard typing. */
  closeOnBackdrop?: boolean;
  children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared dialog shell: role="dialog" + aria-modal, Esc to close, focus moved inside and kept there (Tab / Shift+Tab loop),
 * focus returned to the opener on close, and the page behind does not scroll.
 */
export const Modal: React.FC<ModalProps> = ({ onClose, label, align = 'center', closeOnBackdrop = false, children }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const opener = document.activeElement as HTMLElement | null;

    const focusables = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
    // Prefer the first form field over the close button
    (root.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled])') ?? focusables()[0] ?? root).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-center outline-hidden ${
        align === 'end' ? 'justify-end' : 'justify-center p-4'
      }`}
    >
      {children}
    </div>
  );
};
