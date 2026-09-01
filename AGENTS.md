<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Catalogo prodotti

- Mantieni invariato il catalogo storico in `CATALOG`; inserisci le nuove voci curate in `EXPANSION`.
- I termini equivalenti di ricerca (vitigni, stili di birra e nomi comuni) appartengono a `SEARCH_ALIASES`, così puntano a un solo prodotto canonico.
- Dopo modifiche al catalogo esegui `npm run db:seed`: le posizioni confermate manualmente non devono essere sovrascritte.
