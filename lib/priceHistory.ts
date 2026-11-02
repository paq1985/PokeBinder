export type PriceHistoryPoint = {
  label: string;
  price: number;
};

export function generatePriceHistory(cardId: string, currentPrice: number): PriceHistoryPoint[] {
  const safePrice = Math.max(currentPrice, 0.01);
  const seed = Array.from(cardId).reduce((total, character) => total + character.charCodeAt(0), 0);
  const offsets = [-0.08, -0.035, 0.025, 0];
  const labels = ['90d', '60d', '30d', 'now'];

  return labels.map((label, index) => {
    const wave = Math.sin(seed * 0.17 + index * 1.9) * 0.035;
    const multiplier = index === offsets.length - 1 ? 1 : 1 + offsets[index] + wave;
    return { label, price: Math.max(safePrice * multiplier, 0.01) };
  });
}

export function getTrendPercent(points: PriceHistoryPoint[]): number {
  const firstPrice = points[0]?.price ?? 0;
  const lastPrice = points[points.length - 1]?.price ?? 0;
  if (!firstPrice) return 0;
  return ((lastPrice - firstPrice) / firstPrice) * 100;
}
