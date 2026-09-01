# Corsia — Design Document

**Data:** 2026-09-01
**Stato:** approvato
**Autore:** Simone + Claude

## 1. Scopo

Webapp mobile-first, uso personale singolo, non pubblicata. Consente di:

1. Selezionare un supermercato (v1: solo Extracoop Villanova).
2. Comporre una lista della spesa da un catalogo prodotti.
3. Ottenere un percorso ottimizzato dentro il negozio: ordine di raccolta dei
   prodotti + tracciato disegnato su una mappa 2D, con l'obiettivo di non far
   ripassare l'utente dove è già passato.
4. Seguire il percorso in modalità "spesa" a schermo intero, spuntando i
   prodotti uno alla volta.
5. Correggere la posizione di un prodotto quando risulta sbagliata, direttamente
   dal negozio.

Non obiettivi (YAGNI): multi-utente, autenticazione, prezzi, offerte,
condivisione liste, più supermercati reali, integrazione e-commerce/acquisto.

## 2. Vincoli

- Deploy via Docker, esecuzione in LAN domestica.
- Mobile-first. Il desktop deve funzionare ma non è il target.
- Tema light, qualità visiva alta: la UI è un requisito, non un dettaglio.
- Connettività scarsa dentro il supermercato → la modalità spesa deve funzionare
  offline.
- Nessuna API pubblica espone la planimetria del negozio: la mappa è costruita a
  mano dall'utente tramite un editor incluso nell'app.

## 3. Architettura

### 3.1 Stack

| Layer | Tecnologia | Motivazione |
|---|---|---|
| App | Next.js 15 (App Router), React 19, TypeScript strict | Server Actions eliminano un layer API separato |
| DB | PostgreSQL 17 + Prisma 6 | Estensione `pg_trgm` per ricerca fuzzy prodotti |
| Stile | Tailwind v4 con design token come CSS custom properties | Tema light coerente e centralizzato |
| Animazioni | Motion (framer-motion) | Transizioni di schermo e micro-interazioni |
| Routing engine | Modulo TypeScript puro in `src/lib/routing/` | Nessuna dipendenza esterna, testabile in isolamento |
| Offline | PWA: web app manifest + service worker | Lista, mappa e percorso disponibili senza rete |
| Auth | Nessuna | Uso singolo in LAN |

### 3.2 Servizi Docker

```
web       Next.js in output standalone. Multi-stage: deps -> build -> runner (node:22-alpine, utente non-root)
db        postgres:17-alpine, volume nominato pgdata
importer  Servizio one-shot sotto profilo "tools", esegue lo scraping del catalogo
```

`compose.yaml` per produzione; `compose.dev.yaml` come override con bind mount e
hot reload.

### 3.3 Struttura del codice

```
prisma/schema.prisma        modello dati
prisma/seed.ts              seed: store, mappa iniziale, categorie, catalogo
data/                       snapshot JSON versionati (catalogo, mappa, mapping categoria->corsia)
scripts/scrape-coop.ts      importer offline
src/lib/routing/            grid, BFS, TSP, costruzione percorso  (puro, testato)
src/lib/map/               decomposizione rettangoli, smoothing del tracciato
src/components/map/        StoreMap (render), MapEditor (griglia)
src/components/icons/      sprite SVG categorie + prodotti
src/app/                   route del App Router + Server Actions
```

Ogni unità ha un confine esplicito: `lib/routing` non conosce React né Prisma e
riceve in ingresso solo strutture dati semplici; `components/map` non conosce il
database; le Server Actions sono l'unico punto che parla con Prisma.

## 4. Modello dati

```
Store        gridW, gridH, cellSizeCm (50), grid (Json: matrice di percorribilità)
Fixture      kind (shelf|counter|fridge|freezer|checkout|entrance|wall), cells[], aisleId, label
Aisle        number, name, orientation, sequence   -- ordine "serpentina" naturale del negozio
Location     aisleId, fixtureId, side (L|R), bay, level (1-5), accessCell {x,y}
Category     name, slug, iconKey, colorToken, pickClass, parentId  -- albero
Product      name, brand, size, ean, categoryId, iconKey, sourceUrl
Placement    productId -> locationId, confidence (guessed|confirmed), updatedAt
List         name, storeId, status
ListItem     productId?, rawText, qty, unit, checked, checkedAt
Route        listId, orderJson, pathJson, distanceM, estMinutes
Settings     riga singola: modalità percorso, velocità di camminata, ecc.
```

Decisione chiave: `Placement` è separato da `Product`. Il catalogo può essere
re-importato dallo scraping senza perdere nessuna posizione mappata a mano.

`Category.pickClass` assume i valori `normal | fragile | chilled | frozen` ed è
un input del routing (§6).

## 5. Mappa

### 5.1 Modello

Il negozio è una griglia a celle da 50 cm (dimensione iniziale 100x70 celle =
50m x 35m, configurabile). Ogni cella è percorribile o occupata. La griglia è un
dettaglio interno: l'utente non la vede mai come griglia.

### 5.2 Render

Le celle contigue appartenenti allo stesso `Fixture` vengono fuse in rettangoli
tramite decomposizione greedy, poi disegnate come SVG: angoli arrotondati, ombra
morbida, tinta per reparto, etichetta di corsia con icona di categoria. Il
pavimento, le casse e la freccia di ingresso completano la scena.

Il tracciato del percorso viene calcolato con A* sulla griglia, semplificato con
string-pulling (elimina lo zig-zag cella per cella), raccordato con curve di
Bézier sugli angoli e animato con `stroke-dashoffset`. Pin numerati per ogni
tappa; il pin della tappa corrente pulsa. Pan e zoom con pointer events,
auto-fit e pulsante di ricentro.

### 5.3 Editor

Nell'area admin l'utente dipinge sulla griglia con il dito. Strumenti: muro,
scaffale, frigo, banco, cassa, ingresso, gomma. Il preview mostra il render
finale in tempo reale, non la griglia grezza.

La mappa iniziale fornita nel seed è una planimetria plausibile di ipermercato,
esplicitamente pensata come punto di partenza da correggere nell'editor: non è
un rilievo del negozio reale.

## 6. Algoritmo del percorso

Problema: TSP-path con partenza fissa (ingresso) e arrivo fisso (casse).

1. **Collasso dei nodi.** Prodotti sullo stesso scaffale condividono la stessa
   cella di accesso e diventano un unico nodo. Una lista da 30 prodotti tipicamente
   collassa in circa 15 nodi.
2. **Matrice delle distanze.** Una BFS sulla griglia per ogni nodo. Con 7000
   celle percorribili e 15 nodi il costo è trascurabile.
3. **Ordinamento.**
   - N <= 12: Held-Karp esatto (2^12 · 12^2 ≈ 590k operazioni), ottimo garantito.
   - N > 12: seed con l'ordine "serpentina" delle corsie, poi raffinamento 2-opt
     e Or-opt. Partire dalla serpentina garantisce che il risultato resti sempre
     leggibile come percorso sensato.
4. **Penalità di rientro.** Rientrare in una corsia già lasciata ha un costo
   aggiuntivo. È ciò che traduce il requisito "non farmi tornare indietro".
5. **Catena del freddo.** Il tour viene risolto a blocchi ordinati per
   `pickClass`: `normal -> fragile -> chilled -> frozen -> casse`. Surgelati e
   uova finiscono sempre per ultimi. Impostazione commutabile fra "percorso più
   corto" e "rispetta il freddo" (default: rispetta il freddo).
6. **Output.** Ordine delle tappe, polyline del tracciato, metri totali, minuti
   stimati (velocità di camminata più circa 20 secondi per prodotto).

Il modulo è sviluppato in TDD con Vitest su mappe sintetiche.

## 7. Catalogo prodotti

```
scrape (importer) -> data/catalog.snapshot.json (versionato) -> prisma seed
                                                             |
                     data/category-aisle-map.json ------------+
                                                             v
                          ogni prodotto nasce con posizione ipotizzata (confidence: guessed)
```

Lo scraping del catalogo Coop Alleanza 3.0 è un processo **offline e one-shot**,
mai eseguito a runtime: l'app dipende solo dallo snapshot versionato. Lo script
rispetta `robots.txt` e applica rate limiting. Se il sito cambia, l'app continua
a funzionare e solo l'aggiornamento del catalogo va corretto.

Il mapping categoria → corsia (curato a mano, circa 40 righe) assegna a ogni
prodotto una posizione ipotizzata al momento del seed. In negozio, il pulsante
"Non è qui" permette di scegliere corsia e scaffale sulla mappa e promuove la
posizione a `confirmed`. I prodotti ancora `guessed` sono marcati visivamente.

## 8. Schermate

| # | Schermo | Contenuto |
|---|---|---|
| 1 | Home | Card del negozio, liste recenti, FAB nuova lista |
| 2 | Lista | Ricerca fuzzy con debounce, chip categorie, "comprati spesso", card prodotto con icona SVG, stepper quantità, swipe per eliminare |
| 3 | Percorso | Mappa in alto (tap per fullscreen), sotto le tappe raggruppate per corsia, metri e minuti |
| 4 | Spesa | Fullscreen. Prodotto corrente in grande, "corsia 7 · scaffale 3 · ad altezza occhi", mini-mappa che avanza, check con spring e vibrazione, progress bar |
| 5 | Fine | Riepilogo, tempo reale contro stimato, prodotti non trovati da rimappare |
| 6 | Admin | Editor mappa, gestione posizioni, import catalogo, impostazioni |

## 9. Design system

- Sfondo off-white caldo, inchiostro quasi nero, accento verde fresco, tinte
  pastello per reparto.
- Font display geometrico per i numeri di corsia, che sono protagonisti visivi;
  font neutro per il resto della UI.
- Icone su due livelli: 14 SVG di categoria più circa 60 SVG di prodotto
  disegnati a mano, stile coerente (stroke 2px, angoli morbidi, due colori), con
  fallback automatico all'icona di categoria. Distribuite come sprite sheet.
- Micro-interazioni: spring sul check, Vibration API, stagger nelle liste,
  skeleton, aggiornamenti ottimistici.
- Navigazione a bottom sheet, controlli raggiungibili col pollice.

## 10. Gestione degli errori

- Prodotto senza posizione nota: raccolto in un gruppo "senza corsia" in fondo al
  percorso, non blocca il calcolo.
- Nodo irraggiungibile sulla griglia (mappa incompleta): la tappa viene marcata
  come non raggiungibile e mostrata in coda, con avviso nell'editor.
- Lista vuota o senza prodotti posizionati: il percorso non viene generato e la
  UI spiega il perché.
- Scraping fallito: l'importer esce con codice diverso da zero e lascia intatto
  lo snapshot precedente.
- Offline: le mutazioni sulla lista vengono accodate in IndexedDB e sincronizzate
  al ritorno della rete.

## 11. Strategia di test

- `src/lib/routing/` e `src/lib/map/`: unit test Vitest su griglie sintetiche,
  inclusi i casi limite (nodo irraggiungibile, lista vuota, tutti i prodotti
  sullo stesso scaffale, vincolo di catena del freddo rispettato).
- Server Actions: test di integrazione su un Postgres effimero.
- UI: verifica manuale sul dispositivo, più uno smoke test end-to-end del flusso
  lista → percorso → spesa.

## 12. Fasi di realizzazione

1. Scaffold Docker, Prisma, design token.
2. Modello griglia ed editor mappa.
3. Importer catalogo, seed, posizioni ipotizzate.
4. Routing engine in TDD.
5. Lista e ricerca.
6. Schermo percorso con mappa animata.
7. Modalità spesa e micro-interazioni.
8. Set di icone SVG.
9. PWA e supporto offline.
