import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password e sessioni con la sola libreria standard: niente dipendenze native
 * da compilare, quindi funziona uguale in Docker e su hosting serverless.
 */

const SCRYPT = { N: 16384, r: 8, p: 1, keyLength: 64 };

/** Formato: scrypt$N$r$p$sale$hash, tutto in base64. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, SCRYPT.keyLength, SCRYPT);

  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), hash.toString("base64")].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, salt, hash] = parts;
  const expected = Buffer.from(hash, "base64");
  if (expected.length === 0) return false;

  try {
    const actual = scryptSync(password, Buffer.from(salt, "base64"), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    return timingSafeEqual(actual, expected);
  } catch {
    // parametri illeggibili: hash non valido, non un errore da propagare al login
    return false;
  }
}

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Nel database si salva solo l'impronta del token: chi legge la tabella
 * sessioni non ottiene comunque un cookie valido.
 */
export function tokenFingerprint(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}
