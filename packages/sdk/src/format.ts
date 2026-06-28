/** Convert base units (stroops) to a decimal string, trimming trailing zeros. */
export function formatUnits(amount: bigint, decimals: number): string {
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  const value = fractionStr ? `${whole}.${fractionStr}` : `${whole}`;
  return negative ? `-${value}` : value;
}

/** Parse a decimal string into base units (stroops). */
export function parseUnits(value: string, decimals: number): bigint {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '.' || trimmed === '-') return 0n;
  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const parts = unsigned.split('.');
  const wholePart = parts[0] ?? '0';
  const fractionPart = (parts[1] ?? '').padEnd(decimals, '0').slice(0, decimals);
  const base = 10n ** BigInt(decimals);
  const whole = BigInt(wholePart || '0');
  const fraction = BigInt(fractionPart || '0');
  const result = whole * base + fraction;
  return negative ? -result : result;
}

/**
 * Format base units for display with grouped thousands and a fixed number of fraction digits.
 * Used by the live streaming counters, which show extra precision so the value visibly ticks.
 */
export function formatAmount(
  amount: bigint,
  decimals: number,
  options: { displayDecimals?: number; grouping?: boolean } = {}
): string {
  const { displayDecimals = Math.min(decimals, 4), grouping = true } = options;
  const negative = amount < 0n;
  const abs = negative ? -amount : amount;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const fraction = abs % base;

  let fractionStr = fraction.toString().padStart(decimals, '0');
  fractionStr = displayDecimals > 0 ? fractionStr.slice(0, displayDecimals) : '';

  let wholeStr = whole.toString();
  if (grouping) wholeStr = wholeStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  const value = fractionStr ? `${wholeStr}.${fractionStr}` : wholeStr;
  return negative ? `-${value}` : value;
}

/** Short, human address: `GABC…WXYZ`. */
export function shortAddress(address: string, lead = 4, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}
