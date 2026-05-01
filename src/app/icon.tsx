import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(145deg, #0f172a 0%, #1e3a5f 45%, #0c4a6e 100%)",
        }}
      >
        {/* Plane */}
        <div
          style={{
            color: "white",
            fontSize: "280px",
            lineHeight: 1,
            display: "flex",
            marginBottom: "-12px",
          }}
        >
          ✈
        </div>
        {/* Wordmark */}
        <div
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: "60px",
            fontWeight: 700,
            letterSpacing: "14px",
            display: "flex",
            marginTop: "8px",
          }}
        >
          FLOW
        </div>
      </div>
    ),
    { ...size }
  );
}
