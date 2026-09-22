"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The footer map's frame: it draws the map only once the frame itself is on
 * the reader's screen (ADR-0092 D3).
 *
 * `loading="lazy"` on the frame was meant to hold that, and did not. Measured
 * 2026-09-22 on the homepage at 1440×900, Chromium requested the map at load
 * with the footer 3741px below the screen: its distance for a lazy frame is
 * generous, and it is taken from the page's first layout, which is shorter
 * than the page. The footer is on every page, so that was a third-party
 * request, with its cookies, on every visit.
 *
 * The frame's box is drawn from the first paint and only its content waits,
 * so the map arriving moves nothing. Once drawn it stays drawn. Every browser
 * Next.js supports has `IntersectionObserver` (Chrome, Edge and Firefox 111+,
 * Safari 16.4+). Without JavaScript the server's `<noscript>` carries the map.
 */
export const FooterMapFrame = ({ className, children }: { className: string; children: ReactNode }) => {
  const frame = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setOnScreen(true);
        observer.disconnect();
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={frame} data-testid="footer-map-frame" className={className}>
      {onScreen ? children : <noscript>{children}</noscript>}
    </div>
  );
};
