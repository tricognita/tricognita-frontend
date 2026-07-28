import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

// Canonical octopus-in-triangle mark, embedded as a data URI so Satori can render it.
const MARK_SRC = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/brand/tricognita-mark.png")
).toString("base64")}`;

// Site-wide Open Graph / Twitter card. Fixes the previously-empty
// `summary_large_image` card (which rendered blank on X/LinkedIn/Slack).
// Rendered from the real brand tokens in app/globals.css.
export const alt = "Tricognita — Autonomous Cloud Resilience";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens (see app/globals.css)
const INK = "#0B0914";
const VIOLET = "#7C3AED";
const LAVENDER = "#C4B5FD";
const TEXT = "#F8F9FA";
const MUTED = "#94A3B8";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: INK,
          backgroundImage: `radial-gradient(900px 500px at 15% 0%, rgba(124,58,237,0.28), transparent 60%)`,
          color: TEXT,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand lockup */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={MARK_SRC} width={72} height={72} alt="Tricognita" />
          <div
            style={{
              marginLeft: 22,
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: 6,
            }}
          >
            TRICOGNITA
          </div>
        </div>

        {/* Headline + subline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.04,
              maxWidth: 920,
              letterSpacing: -1,
            }}
          >
            Autonomous Cloud Resilience
          </div>
          <div style={{ fontSize: 30, color: LAVENDER, marginTop: 28 }}>
            Predictive risk · Self-healing remediation · Zero-trust enforcement
          </div>
        </div>

        {/* Footer accent */}
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 240,
              height: 8,
              borderRadius: 4,
              backgroundImage: `linear-gradient(90deg, ${VIOLET}, ${LAVENDER})`,
            }}
          />
          <div style={{ marginLeft: 24, fontSize: 22, color: MUTED }}>
            tricognita.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
