"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #020617, #0f172a, #064e3b)",
          color: "#fff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            maxWidth: "28rem",
          }}
        >
          <div
            style={{
              width: "4rem",
              height: "4rem",
              margin: "0 auto 1.5rem",
              borderRadius: "1rem",
              background: "rgba(239, 68, 68, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}
          >
            !
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: "#94a3b8",
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.75rem 2rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "linear-gradient(to right, #10b981, #06b6d4)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}
