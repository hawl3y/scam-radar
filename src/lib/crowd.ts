/** "Reported by 3 neighbors · 5 got this too" — describes the crowd, never a verdict. */
export function crowdLabel(reportCount: number, corroborationCount: number): string {
  const reported = `Reported by ${reportCount} ${reportCount === 1 ? "neighbor" : "neighbors"}`;
  return corroborationCount > 0 ? `${reported} · ${corroborationCount} got this too` : reported;
}
