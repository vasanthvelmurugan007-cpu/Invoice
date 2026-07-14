export function validateGstin(gstin: string): boolean {
  const clean = formatGstin(gstin);
  // GSTIN format: 15-character alphanumeric, pattern: \d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
  return regex.test(clean);
}

export function getStateCode(gstin: string): string {
  const clean = formatGstin(gstin);
  return clean.substring(0, 2);
}

export function isSameState(gstin1: string, gstin2: string): boolean {
  if (!gstin1 || !gstin2) return false;
  return getStateCode(gstin1) === getStateCode(gstin2);
}

export function formatGstin(gstin: string): string {
  return (gstin || "").trim().toUpperCase();
}
