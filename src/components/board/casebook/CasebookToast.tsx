'use client';
import React, { useEffect, useRef } from 'react';

/**
 * Renders <div id="toast"/> and listens for 'cb:toast' window events
 * (dispatched by ./toast). Ports the reference behavior: set text, add
 * .show, auto-hide after 2200ms (index.html lines 1309–1315).
 */
export const CasebookToast: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onToast = (e: Event) => {
      const el = ref.current;
      if (!el) return;
      el.textContent = String((e as CustomEvent<string>).detail ?? '');
      el.classList.add('show');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => el.classList.remove('show'), 2200);
    };
    window.addEventListener('cb:toast', onToast);
    return () => {
      window.removeEventListener('cb:toast', onToast);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return <div id="toast" ref={ref} />;
};
