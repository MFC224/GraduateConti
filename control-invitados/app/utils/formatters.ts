const CONECTORES = new Set(["de", "del", "la", "las", "los", "y"]);

export function capitalizarNombre(texto: string): string {
  return texto
    .trim()
    .split(/\s+/)
    .map((palabra, i) => {
      const lower = palabra.toLowerCase();
      if (i > 0 && CONECTORES.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}
