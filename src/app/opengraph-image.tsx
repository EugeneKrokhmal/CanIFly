import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "CanIFly — UAS airspace status for drone pilots in Spain";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(145deg, #f7f7f7 0%, #ffffff 45%, #fff0f3 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: "#222222",
              letterSpacing: -1,
            }}
          >
            CanI<span style={{ color: "#ff385c" }}>fly</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 54,
              fontWeight: 800,
              color: "#222222",
              lineHeight: 1.1,
              letterSpacing: -1.2,
              maxWidth: 900,
            }}
          >
            ¿Puedo volar mi dron aquí?
          </div>
          <div style={{ fontSize: 28, color: "#717171", maxWidth: 820, lineHeight: 1.35 }}>
            Mapa de espacio aéreo UAS en España — Libre, Limitado, Restringido o
            Prohibido según tu clase y techo.
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["ENAIRE / servAIS", "AESA", "España"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "10px 18px",
                borderRadius: 999,
                background: "#ffffff",
                border: "1px solid #dddddd",
                color: "#222222",
                fontSize: 20,
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
