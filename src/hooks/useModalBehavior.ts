import { useEffect, useRef } from 'react';

/**
 * Shared modal behaviour (DRY): closes on Escape, locks background scroll
 * (prevents iOS/Android rubber-band scrolling behind dialogs) and restores
 * keyboard focus to the previously focused element on close.
 */
export function useModalBehavior(open: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);
}
