import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
        <div
          style={{
            color: "white",
            fontSize: "96px",
            lineHeight: 1,
            display: "flex",
            marginBottom: "-4px",
          }}
        >
          ✈
        </div>
        <div
          style={{
            color: "rgba(255,255,255,0.45)",
            fontSize: "20px",
            fontWeight: 700,
            letterSpacing: "5px",
            display: "flex",
            marginTop: "4px",
          }}
        >
          FLOW
        </div>
      </div>
    ),
    { ...size }
  );
}
