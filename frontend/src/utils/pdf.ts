export function pdfCanvasSize(
  width: number,
  height: number,
  pixelRatio: number
) {
  const ratio = Math.min(
    Math.max(1, pixelRatio || 1),
    2,
    4096 / width,
    4096 / height,
    Math.sqrt(4_000_000 / (width * height))
  );
  return {
    ratio,
    width: Math.max(1, Math.floor(width * ratio)),
    height: Math.max(1, Math.floor(height * ratio)),
  };
}
