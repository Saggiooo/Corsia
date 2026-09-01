/**
 * Solo il nome del cookie, senza dipendenze: il middleware gira nell'Edge
 * runtime e importare da qui `session.ts` ci trascinerebbe dentro Prisma e
 * node:crypto, che li' non esistono.
 */
export const SESSION_COOKIE = "corsia_sessione";
