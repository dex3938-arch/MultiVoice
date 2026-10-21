import { ImageResponse } from "next/og";

export const alt = "MultiVoice Calling Agent: AI inbound and outbound phone calls";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #eef4ff 0%, #ffffff 45%, #dbeafe 100%)", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 84, height: 84, borderRadius: 24, background: "linear-gradient(135deg, #38bdf8, #2563eb 55%, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            {[26, 46, 32].map((h, i) => <div key={i} style={{ width: 10, height: h, borderRadius: 5, background: "#fff" }} />)}
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 800, color: "#0b1a38" }}>Multi<span style={{ color: "#2563eb" }}>Voice</span></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 74, fontWeight: 800, color: "#0b1a38", lineHeight: 1.05, letterSpacing: -2 }}>AI calling agent</div>
          <div style={{ fontSize: 74, fontWeight: 800, color: "#2563eb", lineHeight: 1.05, letterSpacing: -2 }}>for inbound & outbound calls</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#5a6a8a" }}>Answers, books appointments, schedules callbacks, logs it all in a CRM.</div>
        </div>
      </div>
    ),
    size,
  );
}
