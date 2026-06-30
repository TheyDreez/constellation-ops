"use client";
// Constellation is always dark — toggle is a no-op orbital indicator
export function ThemeToggle() {
  return (
    <div
      title="Modo espacial ativo"
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 10px", borderRadius: 20,
        background: "rgba(167,139,250,0.1)",
        border: "1px solid rgba(167,139,250,0.2)",
        fontSize: 10, color: "#a78bfa",
        fontFamily: "monospace", letterSpacing: "1px",
        cursor: "default",
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", display: "inline-block", boxShadow: "0 0 5px #a78bfa" }} />
      ESPACIAL
    </div>
  );
}
