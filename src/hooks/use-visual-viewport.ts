'use client';

import { useState, useEffect } from 'react';

/**
 * Tracks the visual viewport height — shrinks when the mobile
 * virtual keyboard appears. Returns `null` on desktop / SSR
 * so callers can fall back to CSS-based sizing.
 */
export function useVisualViewport() {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => setHeight(vv.height);
    update();

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return height;
}
