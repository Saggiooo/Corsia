<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Contesto del progetto

- Stack: Next.js 16.3 App Router, React 19, Prisma 7 con `@prisma/adapter-pg` e PostgreSQL.
- Prima di modificare file esegui `git status`: il workspace puo' contenere lavoro dell'utente o di altri processi. Non sovrascriverlo e non includerlo per errore nei commit.
- Il client Prisma e' generato in `src/generated/prisma` e non e' versionato. `npm run build` esegue gia' `prisma generate`; in un ambiente pulito eseguilo anche prima di script TypeScript che importano il client.

## Database e Prisma

- In locale `DATABASE_URL` punta al PostgreSQL di `compose.yaml`. Avvia il database con `docker compose up -d db`.
- `prisma.config.ts` usa `DIRECT_URL` quando esiste, altrimenti `DATABASE_URL`. Le connessioni dirette servono a migrazioni e strumenti amministrativi; l'app usa la URL pooled.
- Per una modifica strutturale: modifica `prisma/schema.prisma`, esegui in locale `npm run db:migrate -- --name <nome>`, controlla il SQL generato e committa insieme schema e nuova cartella in `prisma/migrations`.
- Non usare `prisma migrate dev` in produzione e non cambiare normalmente la struttura dal SQL Editor di Neon: schema, migrazioni e database devono restare sincronizzati.
- Il deployment esegue `prisma migrate deploy`, quindi un push con una migrazione versionata e' sufficiente ad applicarla. Una modifica ai soli dati e' immediata e non richiede redeploy; una modifica alle variabili Vercel richiede un nuovo deployment.
- Prima di migrazioni distruttive o trasformazioni di dati, controlla il SQL e prevedi backup/rollback. Non assumere che un semplice redeploy renda sicuro un `DROP`, una rinomina o una conversione.

## Catalogo e seed

- Mantieni invariato il catalogo storico in `CATALOG`; inserisci le nuove voci curate in `EXPANSION` dentro `src/lib/store/catalog.ts`.
- I termini equivalenti di ricerca appartengono a `SEARCH_ALIASES`; le intenzioni che devono proporre piu' risultati appartengono a `SEARCH_GROUPS`.
- Dopo modifiche a catalogo, categorie o layout esegui `npm run db:seed`. Il catalogo curato contiene attualmente 27 categorie e 435 prodotti.
- Il seed carica supermercati, corsie, punti di prelievo, categorie, prodotti, posizioni ipotizzate e impostazioni. Non crea account.
- Il seed puo' essere rieseguito, ma non deve entrare nel Build Command permanente: ricrea i fixture, aggiorna le posizioni `guessed` e non deve mai sovrascrivere le posizioni `confirmed` manualmente.

## Utenti e autorizzazione

- Gli account amministrativi si gestiscono con `scripts/user.mts` (`elenco`, `aggiungi`, `ruolo`, `password`, `rimuovi`). Gli account creati da CLI nascono approvati; non inserire password nei sorgenti, nei commit o nei log.
- Il flusso di registrazione pubblico crea utenti `pending`; solo un admin puo' approvarli o rifiutarli da `/admin/utenti`. Un utente non `approved` non puo' aprire o mantenere una sessione.
- Le pagine `/admin/**` devono restare protette da `requireAdmin`; la sola presenza di un cookie nel proxy non sostituisce la verifica server-side della sessione e del ruolo.
- Password e token non sono recuperabili in chiaro: le password sono hashate con scrypt e delle sessioni si conserva solo l'impronta SHA-256.

## Vercel e Neon

- Neon di produzione e' in `AWS Europe Central 1 (Frankfurt)`. Le Vercel Functions devono usare la singola regione `fra1`, vicina sia al database sia agli utenti italiani; la regione della macchina di build non determina quella delle funzioni.
- Variabili gestite dall'integrazione: `DATABASE_URL` e' pooled per l'app, `DATABASE_URL_UNPOOLED` e' diretta per migrazioni e attivita' amministrative. Non copiare connection string o segreti nei file versionati.
- Build Command permanente di Vercel: `DIRECT_URL="$DATABASE_URL_UNPOOLED" npm run db:deploy && npm run build`.
- Le variabili marcate `Sensitive` non possono essere scaricate da `vercel env run` sul Mac. Per operazioni una tantum usa un ambiente controllato che riceva i segreti di produzione; se viene usato temporaneamente il Build Command, ripristina immediatamente quello permanente e rimuovi le variabili bootstrap.
- `output: "standalone"` deve restare attivo per Docker e disattivato quando `VERCEL=1`: Next.js 16.3 con l'adapter Vercel altrimenti fallisce cercando `.next/next-server.js.nft.json`.
- Le modifiche alle variabili o alla regione si applicano solo ai deployment successivi. Verifica nei log che le migrazioni risultino applicate e che il deployment sia `Ready`.

## Verifica prima del push

- Esegui almeno `npm test` e `npm run build`.
- Per modifiche al deployment verifica anche `VERCEL=1 npm run build`; la build locale normale deve continuare a produrre `.next/standalone/server.js` per Docker.
- Dopo modifiche Prisma controlla che la migrazione sia presente e che il seed non sia stato aggiunto accidentalmente al comando di build permanente.
