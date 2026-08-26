import crypto from 'crypto';

// Unambiguous characters (excluding 0, O, 1, I, L)
const CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Generates a human-readable return reference code in format: RET-YYYY-XXXXX
 * Example: RET-2026-K7M9P
 * @param {number} [year] - Defaults to current UTC year
 * @returns {string} Unique reference code
 */
export function generateReferenceCode(year = new Date().getUTCFullYear()) {
  const bytes = crypto.randomBytes(5);
  let randomPart = '';
  for (let i = 0; i < 5; i++) {
    randomPart += CHARS[bytes[i] % CHARS.length];
  }
  return `RET-${year}-${randomPart}`;
}
