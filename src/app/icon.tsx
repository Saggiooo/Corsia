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
          alignItems: "center",
          justifyContent: "center",
          background: "#fbf8f3",
          position: "relative",
        }}
      >
        <svg width="512" height="512" viewBox="0 0 512 512">
          <rect width="512" height="512" rx="112" fill="#fbf8f3" />
          <rect x="96" y="120" width="52" height="272" rx="26" fill="#e3dbcb" />
          <rect x="232" y="120" width="52" height="272" rx="26" fill="#e3dbcb" />
          <rect x="368" y="120" width="52" height="272" rx="26" fill="#e3dbcb" />
          <path
            d="M190 96 L190 300 Q190 340 230 340 L326 340 Q366 340 366 300 L366 150"
            fill="none"
            stroke="#e2590a"
            strokeWidth="40"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="190" cy="96" r="34" fill="#1f7a4c" />
          <circle cx="366" cy="150" r="34" fill="#17150f" />
        </svg>
      </div>
    ),
    size,
  );
}
