import { ImageResponse } from "next/og";

export const alt = "Flight Klub Flight Finder: cheapest flights and months to fly";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: "linear-gradient(135deg,#040609 0%,#371210 60%,#8b1d24 100%)", color: "white" }}>
        <div style={{ fontSize: 30, color: "#e06b5a", letterSpacing: 6, textTransform: "uppercase" }}>Flight Klub · Flight Finder</div>
        <div style={{ marginTop: 24, fontSize: 80, fontWeight: 800, lineHeight: 1.05 }}>Fly for less. Know when and where to go.</div>
        <div style={{ marginTop: 28, fontSize: 32, color: "#b6bcc6" }}>Cheapest destinations and months from your city</div>
      </div>
    ),
    size,
  );
}
