import { describe, expect, test } from "vitest";
import { hashPassword, newSessionToken, tokenFingerprint, verifyPassword } from "./crypto";

describe("hashPassword", () => {
  test("la password corretta viene riconosciuta", () => {
    const stored = hashPassword("cavallo-batteria-graffetta");

    expect(verifyPassword("cavallo-batteria-graffetta", stored)).toBe(true);
  });

  test("una password sbagliata viene rifiutata", () => {
    const stored = hashPassword("cavallo-batteria-graffetta");

    expect(verifyPassword("cavallo-batteria-graffette", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  test("la stessa password produce hash diversi: il sale e' casuale", () => {
    expect(hashPassword("stessa")).not.toBe(hashPassword("stessa"));
  });

  test("non conserva la password in chiaro", () => {
    expect(hashPassword("segretissima")).not.toContain("segretissima");
  });

  test("un hash malformato viene rifiutato invece di far esplodere il login", () => {
    expect(verifyPassword("qualsiasi", "spazzatura")).toBe(false);
    expect(verifyPassword("qualsiasi", "")).toBe(false);
    expect(verifyPassword("qualsiasi", "scrypt$16384$8$1$soloUnCampo")).toBe(false);
  });
});

describe("token di sessione", () => {
  test("ogni token e' diverso e abbastanza lungo", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => newSessionToken()));

    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token.length).toBeGreaterThanOrEqual(32);
  });

  test("l'impronta e' stabile e non permette di risalire al token", () => {
    const token = newSessionToken();

    expect(tokenFingerprint(token)).toBe(tokenFingerprint(token));
    expect(tokenFingerprint(token)).not.toBe(token);
    expect(tokenFingerprint(token)).not.toBe(tokenFingerprint(newSessionToken()));
  });
});
