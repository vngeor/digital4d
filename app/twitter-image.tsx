import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "D4D Innovation - 3D Print & Technology";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
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
            "linear-gradient(145deg, #050505 0%, #0a0f0d 35%, #0a1210 65%, #050505 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Emerald glow behind text */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "700px",
            height: "350px",
            background:
              "radial-gradient(ellipse, rgba(16, 185, 129, 0.12) 0%, rgba(6, 182, 212, 0.04) 40%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Secondary cyan glow - lower */}
        <div
          style={{
            position: "absolute",
            top: "60%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "500px",
            height: "200px",
            background:
              "radial-gradient(ellipse, rgba(6, 182, 212, 0.06) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Tesseract wireframe — centered behind text */}
        <svg
          width="340"
          height="340"
          viewBox="0 0 200 200"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -55%)",
            opacity: 0.07,
          }}
        >
          {/* Outer cube */}
          <rect
            x="10"
            y="10"
            width="180"
            height="180"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.5"
          />
          {/* Inner cube */}
          <rect
            x="55"
            y="55"
            width="90"
            height="90"
            fill="none"
            stroke="#06b6d4"
            strokeWidth="1.5"
          />
          {/* Connecting edges */}
          <line
            x1="10"
            y1="10"
            x2="55"
            y2="55"
            stroke="#10b981"
            strokeWidth="1"
          />
          <line
            x1="190"
            y1="10"
            x2="145"
            y2="55"
            stroke="#06b6d4"
            strokeWidth="1"
          />
          <line
            x1="190"
            y1="190"
            x2="145"
            y2="145"
            stroke="#10b981"
            strokeWidth="1"
          />
          <line
            x1="10"
            y1="190"
            x2="55"
            y2="145"
            stroke="#06b6d4"
            strokeWidth="1"
          />
        </svg>

        {/* D4D text with emerald-to-cyan gradient */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            position: "relative",
          }}
        >
          <span
            style={{
              fontSize: "148px",
              fontWeight: 900,
              background:
                "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "-4px",
            }}
          >
            D4D
          </span>
        </div>

        {/* INNOVATION subtitle */}
        <div
          style={{
            fontSize: "34px",
            fontWeight: 400,
            color: "rgba(237, 237, 237, 0.5)",
            letterSpacing: "16px",
            textTransform: "uppercase",
            marginTop: "2px",
            display: "flex",
          }}
        >
          INNOVATION
        </div>

        {/* Emerald-cyan accent line */}
        <div
          style={{
            position: "absolute",
            bottom: "90px",
            left: "33%",
            right: "33%",
            height: "2px",
            background:
              "linear-gradient(90deg, transparent, #10b981, #06b6d4, transparent)",
            display: "flex",
          }}
        />

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: "45px",
            fontSize: "16px",
            fontWeight: 400,
            color: "rgba(237, 237, 237, 0.25)",
            letterSpacing: "5px",
            display: "flex",
          }}
        >
          digital4d.eu
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}