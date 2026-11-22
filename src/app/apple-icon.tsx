import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon (iPhone and iPad). Square with no rounded corners: iOS rounds it.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #a12530 0%, #8b1d24 55%, #6b141a 100%)" }}>
        <svg width="128" height="128" viewBox="0 0 24 24">
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
