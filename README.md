# Corsia

Webapp mobile-first per fare la spesa all'Extracoop di Villanova: componi la
lista, Corsia calcola in che ordine prendere le cose e ti disegna il percorso
sulla mappa del negozio.

Uso personale, gira in LAN, nessuna autenticazione.

## Come funziona

1. **Mappa.** Il negozio e' una griglia di celle da 50 cm (60 x 40 = 30 x 20 m).
   Ogni cella e' percorribile o occupata. La griglia non si vede mai: viene
   disegnata fondendo le celle contigue in blocchi arrotondati, tinti per
   reparto.
2. **Posizioni.** Ogni prodotto ha un punto di prelievo (corsia, lato, campata).
   Al primo caricamento la posizione e' *ipotizzata* dalla categoria; dal
   pulsante "Non e' qui" in modalita' spesa la correggi sulla mappa e diventa
   *confermata*. Le posizioni confermate non vengono mai sovrascritte da un
   nuovo import del catalogo.
3. **Percorso.** Le tappe sulla stessa cella collassano in un nodo, le distanze
   reali si misurano con una BFS sulla griglia, l'ordine si risolve con
   Held-Karp fino a 12 tappe (ottimo garantito) e con 2-opt + Or-opt oltre,
   partendo dall'ordine naturale delle corsie. Cambiare corsia costa un extra:
   e' cio' che evita l'avanti e indietro.
4. **Catena del freddo.** Di default il giro e' a blocchi: normale, fragile,
   fresco, surgelato, casse. Surgelati e uova finiscono sempre per ultimi.
   Dalla schermata Percorso si passa a "Piu' corto" quando non serve.

## Avvio

```bash
cp .env.example .env   # metti una password a scelta
docker compose up -d db
docker compose run --rm migrate
docker compose up -d web
```

App su http://localhost:3000 (e sull'IP della macchina in LAN, per il telefono).

### Sviluppo

```bash
docker compose up -d db
npm install
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

### Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo |
| `npm test` | Test del motore di routing e della planimetria |
| `npx tsx prisma/seed.ts` | Ricarica mappa, categorie e catalogo |
| `npx tsx scripts/scrape-coop.ts` | Scarica il catalogo completo da coopshop.it (opzionale) |
| `npx tsx scripts/check-route.mts` | Calcola un percorso di prova da riga di comando |

## Catalogo

Il catalogo e' una **lista curata a mano** in `src/lib/store/catalog.ts`, fatta
di prodotti generici: "Spaghetti", non "Spaghetti Barilla n.5 500 g". Tutte le
paste stanno sullo stesso scaffale, quindi il dettaglio di marca e formato non
serve alla posizione: lo aggiungi sulla riga della lista con la matita, che
apre una nota libera ("Barilla mezzo kg"). La nota viaggia fino alla modalita'
spesa, dove compare in grande sotto il nome del prodotto.

Per aggiungere prodotti, una riga per prodotto sotto la sua categoria:

```ts
const CATALOG: Record<string, Row[]> = {
  "pasta-riso": [
    ["Spaghetti", "spaghetti", "500 g"],   // [nome, icona?, formato?, marca?]
    ["Riso Carnaroli", "rice", "1 kg"],
  ],
};
```

L'icona e' facoltativa: senza, il prodotto usa quella della sua categoria. Le
chiavi disponibili stanno in `src/components/icons/paths.tsx`. `npm test`
verifica che categorie e icone esistano e che non ci siano doppioni, cosi' un
refuso si vede subito.

### Catalogo completo Coop (opzionale)

`scripts/scrape-coop.ts` scarica l'intero catalogo di coopshop.it (~22.000
prodotti) in `data/catalog.snapshot.json`, e `npx tsx prisma/seed.ts
--from-snapshot` lo carica al posto della lista curata. Lo scraping e'
**offline e one-shot**: l'app non contatta mai quel sito a runtime. L'importer
rispetta `robots.txt` (che non vieta nulla), si presenta con uno User-Agent
proprio e attende 350 ms fra una richiesta e l'altra.

Il seed considera il catalogo caricato la fonte di verita': i prodotti spariti
vengono rimossi, tranne quelli gia' usati in una lista o con una posizione
confermata a mano.

## Struttura

```
prisma/schema.prisma        modello dati
prisma/seed.ts              mappa, corsie, categorie, catalogo
src/lib/routing/            griglia, BFS, A*, TSP, costruzione percorso (puro, testato)
src/lib/map/                fusione celle in rettangoli, string-pulling, raccordi
src/lib/store/              planimetria iniziale, catalogo curato, regole icone
src/components/map/         StoreMap (render) e MapEditor (planimetria)
src/components/icons/       131 icone SVG disegnate a mano
src/app/                    pagine App Router e Server Action
scripts/scrape-coop.ts      importer del catalogo
```

`src/lib/routing` non conosce React ne' Prisma: riceve strutture dati semplici
ed e' coperto da test. Le Server Action sono l'unico punto che parla col
database.

## Modificare la mappa

`/mappa` mostra la planimetria, `/mappa/modifica` la fa modificare: scegli uno
strumento (scaffale, banco, frigo, surgelati, casse, muro, gomma) e dipingi con
il dito; con "Sposta" trascini e con i tasti + / − zoomi. Al salvataggio la
griglia di percorribilita' viene ricalcolata e i blocchi ricostruiti
raggruppando le celle contigue; se qualche punto di prelievo finisce sotto un
blocco o diventa irraggiungibile dall'ingresso, il salvataggio lo dice invece
di nasconderlo.

## Note

- La planimetria iniziale e' un ipermercato **plausibile**, non un rilievo del
  negozio reale: e' pensata per essere corretta dall'editor.
- L'app e' una PWA: la modalita' spesa continua a funzionare sulle pagine gia'
  aperte anche senza rete, che nei supermercati serve.
- `prisma` porta con se una vulnerabilita' nota di `deepmerge-ts` (stack
  exhaustion): riguarda solo la CLI in fase di build su input nostri, non il
  runtime dell'app. `npm audit fix --force` porterebbe a una release candidate
  di Prisma 8, quindi resta cosi'.
