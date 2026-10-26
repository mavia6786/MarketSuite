/**
 * The management backend stores money as rupees with two decimals (a JS Number, e.g. 4999.5).
 * Display only — all arithmetic must stay on the server (see docs/API_INTEGRATION.md).
 */
export function formatPKR(amount: number): string {
  const hasPaisa = Math.round(amount * 100) % 100 !== 0;
  return `Rs ${amount.toLocaleString('en-PK', {
    minimumFractionDigits: hasPaisa ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}
