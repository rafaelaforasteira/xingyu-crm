"use client";

import { useEffect, useState } from "react";
import type { TrackingChannel } from "./tracking-analytics-types";
import { CHANNEL_CONFIG } from "./channel-origin-config";

const knockoutCache = new Map<string, Promise<string>>();

/** Drops an opaque black export matte without blending the logo colors away. */
function knockoutBlackMatte(src: string) {
  const cached = knockoutCache.get(src);
  if (cached) return cached;
  const pending = new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        reject(new Error("canvas"));
        return;
      }
      context.drawImage(image, 0, 0);
      const frame = context.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = frame.data;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index]! < 16 && pixels[index + 1]! < 16 && pixels[index + 2]! < 16) {
          pixels[index + 3] = 0;
        }
      }
      context.putImageData(frame, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("blob"));
          return;
        }
        resolve(URL.createObjectURL(blob));
      });
    };
    image.onerror = () => reject(new Error("image"));
    image.src = src;
  });
  knockoutCache.set(src, pending);
  return pending;
}

function MetaMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 24" aria-hidden="true" focusable="false">
      <path
        fill="#0081FB"
        d="M34.23 12.05c0-5.58-3.37-9.05-8.42-9.05-2.97 0-5.4 1.46-7.05 4.05C17.1 4.46 14.67 3 11.7 3 6.65 3 3.28 6.47 3.28 12.05c0 5.4 3.42 8.95 8.22 8.95 2.73 0 4.9-1.2 6.75-3.62L18 14.9l1.75 2.48c1.85 2.42 4.02 3.62 6.75 3.62 4.8 0 8.22-3.55 8.22-8.95Z"
      />
      <path
        fill="#fff"
        d="M11.82 6.55c-2.9 0-4.7 2.28-4.7 5.5 0 3.2 1.78 5.45 4.62 5.45 1.55 0 2.82-.62 4.05-2.38L18 11.8l2.2 3.32c1.23 1.76 2.5 2.38 4.05 2.38 2.84 0 4.62-2.25 4.62-5.45 0-3.22-1.8-5.5-4.7-5.5-1.62 0-2.95.78-4.22 2.82L18 12.2l-1.95-2.83c-1.27-2.04-2.6-2.82-4.23-2.82Z"
      />
    </svg>
  );
}

function WhatsAppMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#25D366"
        d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Z"
      />
      <path
        fill="#fff"
        d="M17.47 14.38c-.22.62-1.27 1.18-1.73 1.22-.47.04-.91.21-3.08-.65-2.61-1.03-4.26-3.71-4.39-3.88-.13-.17-1.05-1.4-1.05-2.67s.66-1.89.9-2.15c.23-.26.51-.33.68-.33h.5c.18.01.39.02.58.45.22.52.73 1.79.8 1.92.06.13.11.28.02.45-.09.17-.13.28-.26.43-.13.15-.27.33-.39.45-.14.13-.27.27-.12.53.16.26.68 1.12 1.46 1.81.99.89 1.84 1.16 2.1 1.29.26.13.41.1.56-.07.15-.17.65-.75.82-1.01.17-.26.34-.21.58-.13.24.09 1.51.71 1.76.84.28.13.47.19.54.3.07.11.07.62-.15 1.22Z"
      />
    </svg>
  );
}

function GoogleAdsMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#FBBC04" d="M13.2 3.2 20.6 16a3.15 3.15 0 1 1-5.46 3.15L10.5 8.7 13.2 3.2Z" />
      <path fill="#4285F4" d="M10.8 3.2 3.4 16A3.15 3.15 0 1 0 8.86 19.15L13.5 8.7 10.8 3.2Z" />
      <circle cx="7.15" cy="17.35" r="3.15" fill="#34A853" />
    </svg>
  );
}

function FallbackMark({ channel, size }: { channel: TrackingChannel; size: number }) {
  if (channel === "META_ADS") return <MetaMark size={size} />;
  if (channel === "WHATSAPP") return <WhatsAppMark size={size} />;
  if (channel === "GOOGLE_ADS") return <GoogleAdsMark size={size} />;
  const Icon = CHANNEL_CONFIG[channel].fallback;
  return <Icon size={size - 2} strokeWidth={2} aria-hidden="true" />;
}

export function ChannelBrandMark({
  channel,
  size = 18,
}: {
  channel: TrackingChannel;
  size?: number;
}) {
  const config = CHANNEL_CONFIG[channel];
  const [failedChannel, setFailedChannel] = useState<TrackingChannel | null>(null);
  const [src, setSrc] = useState(config.matte ? "" : config.asset ?? "");
  useEffect(() => {
    if (!config.asset || !config.matte) return;
    let cancelled = false;
    knockoutBlackMatte(config.asset).then(
      (url) => {
        if (!cancelled) setSrc(url);
      },
      () => {
        if (!cancelled) setFailedChannel(channel);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [channel, config.asset, config.matte]);
  if (config.asset && failedChannel !== channel) {
    if (!src) return null;
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        onError={() => setFailedChannel(channel)}
      />
    );
  }
  return <FallbackMark channel={channel} size={size} />;
}
