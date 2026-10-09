"use client";
// Adapted from Magic UI Globe (MIT): https://magicui.design/r/globe.json
import * as React from "react";
import createGlobe, { type COBEOptions } from "cobe";
import { cn } from "@/lib/utils";
const BRAINX_GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  devicePixelRatio: 1.5,
  phi: 4.2,
  theta: 0.22,
  dark: 1,
  diffuse: 0.55,
  mapSamples: 16000,
  mapBrightness: 3.2,
  mapBaseBrightness: 0.06,
  baseColor: [0.62, 0.42, 0.9],
  markerColor: [0.72, 0.53, 1],
  glowColor: [0.32, 0.15, 0.6],
  markers: [
    { location: [-23.55, -46.63], size: 0.06 },
    { location: [40.71, -74], size: 0.045 },
    { location: [51.5, -0.12], size: 0.035 },
    { location: [31.23, 121.47], size: 0.055 },
  ],
  onRender: () => {},
};
export function Globe({
  className,
  config = BRAINX_GLOBE_CONFIG,
}: {
  className?: string;
  config?: COBEOptions;
}) {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const [unavailable, setUnavailable] = React.useState(false);
  React.useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let globe: ReturnType<typeof createGlobe> | undefined;
    let width = element.clientWidth;
    let phi = config.phi;
    let previous = 0;
    const resize = new ResizeObserver(() => {
      width = element.clientWidth;
    });
    resize.observe(element);
    const create = () => {
      globe?.destroy();
      try {
        globe = createGlobe(element, {
          ...config,
          width: width * 1.5,
          height: width * 1.5,
          devicePixelRatio: 1.5,
          onRender: (state) => {
            const now = performance.now();
            // COBE updates the planet's Y-axis angle, independently of CSS positioning.
            // Use elapsed time rather than frame count: one revolution every 30 seconds.
            if (!reduced.matches)
              phi = (phi + (previous ? (now - previous) / 1000 : 0) * (Math.PI * 2 / 30)) % (Math.PI * 2);
            previous = now;
            state.phi = phi;
            state.width = width * 1.5;
            state.height = width * 1.5;
          },
        });
        setUnavailable(false);
      } catch {
        setUnavailable(true);
      }
    };
    create();
    // Let the browser throttle its native animation frames in background tabs.
    // Toggling the renderer on visibility events can leave embedded previews paused.
    const visibility = () => { previous = 0; };
    const lost = (event: Event) => {
      event.preventDefault();
      setUnavailable(true);
    };
    document.addEventListener("visibilitychange", visibility);
    element.addEventListener("webglcontextlost", lost);
    element.addEventListener("webglcontextrestored", create);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      element.removeEventListener("webglcontextlost", lost);
      element.removeEventListener("webglcontextrestored", create);
      globe?.destroy();
      resize.disconnect();
    };
  }, [config]);
  return (
    <div
      className={cn("relative aspect-square", className)}
      aria-hidden="true"
      data-globe-state={unavailable ? "fallback" : "ready"}
    >
      {unavailable && (
        <div className="absolute inset-[9%] rounded-full border border-violet-300/20 bg-violet-500/5 shadow-[inset_0_0_80px_rgba(139,92,246,0.12)]" />
      )}
      <div className="h-full w-full">
        <canvas ref={canvas} className="h-full w-full" style={{ opacity: unavailable ? 0 : 1 }} />
      </div>
    </div>
  );
}
