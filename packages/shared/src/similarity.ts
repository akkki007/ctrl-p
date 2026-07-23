/**
 * Perceptual-hash helpers for near-duplicate image detection (Phase 4
 * automated moderation). Hashes are 64-bit dHashes rendered as 16 hex chars.
 * The API computes them with sharp; this module does the pure comparison.
 */

/** Max Hamming distance (of 64 bits) at which two images count as "similar". */
export const SIMILARITY_THRESHOLD = 10;

/** Popcount of a byte (0–255). */
function popcount8(n: number): number {
  let count = 0;
  let v = n;
  while (v) {
    v &= v - 1;
    count++;
  }
  return count;
}

/**
 * Hamming distance between two 16-char (64-bit) hex hashes. Returns 64 (maximum
 * dissimilarity) if either hash is missing or malformed, so bad data never
 * reads as a false match.
 */
export function hammingDistanceHex(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b || a.length !== b.length) return 64;
  let distance = 0;
  for (let i = 0; i < a.length; i++) {
    const byteA = Number.parseInt(a[i]!, 16);
    const byteB = Number.parseInt(b[i]!, 16);
    if (Number.isNaN(byteA) || Number.isNaN(byteB)) return 64;
    distance += popcount8(byteA ^ byteB);
  }
  return distance;
}

export function arePerceptuallySimilar(
  a: string | null | undefined,
  b: string | null | undefined,
  threshold: number = SIMILARITY_THRESHOLD,
): boolean {
  return hammingDistanceHex(a, b) <= threshold;
}
