import { useState } from "react";

export default function ImagenConFallback({ src, nombre, className = "", tipo = "producto" }) {
  const [fallo, setFallo] = useState(!src);
  const inicial = nombre?.trim()?.[0]?.toUpperCase() || "?";

  if (fallo) {
    return (
      <span className={`image-fallback ${tipo} ${className}`} role="img" aria-label={nombre || "Imagen no disponible"}>
        {inicial}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={nombre || ""}
      className={className}
      onError={() => setFallo(true)}
    />
  );
}
