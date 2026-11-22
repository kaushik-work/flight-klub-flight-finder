import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Brand-red rounded tile with a white plane taking off, readable even at 16px in a browser tab.
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #a12530 0%, #8b1d24 55%, #6b141a 100%)", borderRadius: 15 }}>
        <svg width="46" height="46" viewBox="0 0 24 24">
          <path
            d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"
            fill="#ffffff"
            transform="rotate(45 12 12)"
          />
        </svg>
      </div>
    ),
    size,
  );
}
