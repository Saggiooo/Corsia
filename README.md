# Corsia

Webapp mobile-first per fare la spesa all'Extracoop di Villanova: componi la
lista, Corsia calcola in che ordine prendere le cose e ti disegna il percorso
sulla mappa del negozio.

Accesso con email e password, account creati a mano: niente registrazione
pubblica ne' recupero password. Ogni utente ha le sue liste, i suoi preferiti e
i suoi prodotti salvati; mappe e posizioni dei prodotti sono invece patrimonio
comune, e le cambiano solo gli **admin**. I **member** usano l'app e segnalano
quando un prodotto non e' dove dice Corsia.

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
| `npx tsx scripts/user.mts elenco` | Elenca gli utenti |
| `npx tsx scripts/check-isolation.mts <a> <b>` | Verifica che due utenti non vedano i dati dell'altro |

## Utenti

Gli account si creano da riga di comando:

```bash
npx tsx scripts/user.mts aggiungi mario@esempio.it Mario Rossi
```

Senza password ne genera una e la stampa. Gli altri comandi sono `elenco`,
`password <email> <nuova>` (che chiude anche le sessioni aperte) e
`rimuovi <email>` (che cancella l'utente con tutte le sue liste).

### Ruoli

| | Admin | Member |
|---|---|---|
| Liste, preferiti, salvati | sì | sì |
| Correggere la posizione di un prodotto | la sposta subito | manda una segnalazione |
| Disegnare le planimetrie | sì | no |
| Spostare interi reparti | sì | no |
| Vedere e decidere le segnalazioni | sì | no |

```bash
npx tsx scripts/user.mts ruolo mario@esempio.it admin
```

Le pagine sotto `/admin` passano tutte dal layout che chiama `requireAdmin`:
nessuna resta scoperta per dimenticanza. Un member che ci arriva viene
rimandato alla home, non alla pagina di accesso: è autenticato, semplicemente
non ha i permessi.

### Segnalazioni

Dalla modalità spesa, il tasto "Non è qui" apre la mappa. Per un admin sposta
il prodotto e conferma la posizione; per un member crea una segnalazione con
dove l'app diceva che fosse, dove dice lui che sia e una nota facoltativa.

In `/admin/segnalazioni` l'admin vede chi ha segnalato cosa e cosa propone, e
può accettare, accettare correggendo la posizione proposta, o rifiutare — con
un motivo. Accettare sposta davvero il prodotto e ne conferma la posizione,
quindi il seed non la tocca più.

Le password sono hashate con scrypt della libreria standard di Node: nessuna
dipendenza nativa da compilare, quindi si comporta uguale in Docker e su
hosting serverless. Del token di sessione il database conserva solo l'impronta
sha256, cosi' leggere la tabella non basta a fabbricarsi un cookie valido. Le
sessioni durano 90 giorni: non si fa il login in mezzo alla spesa.

`src/proxy.ts` blocca chi non ha il cookie; la validita' vera della sessione la
controlla il server con `requireUser`, perche' nel proxy il database non e'
raggiungibile.

## Supermercati

La home elenca i supermercati; quello selezionato si apre in grande con la sua
mappa, gli altri restano compressi in una riga. Il pulsante in fondo crea una
lista sul supermercato selezionato.

Un supermercato annunciato ma non ancora rilevato ha stato `comingSoon`: si
vede con l'etichetta "Prossimamente" e non e' selezionabile per una lista.
Conad Castenaso e' li' in questo stato; diventa utilizzabile quando gli si
disegna una planimetria.

## Liste, preferiti, salvati

Ogni riga della lista ha una **matita** per la nota libera ("Barilla mezzo kg")
e un **segnalibro** che mette da parte il prodotto *con quella nota*: dal chip
"Salvati" lo ripeschi già personalizzato invece di riscriverla ogni volta.

La **stella** sulla scheda del supermercato lo segna fra i preferiti. La
sezione "comprati spesso" nella lista vuota conta gli acquisti di ciascun
utente, non quelli di tutti.

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

### Utenti

Gli account si creano da riga di comando:

```bash
npx tsx scripts/user.mts aggiungi mario@esempio.it Mario Rossi
```

Senza password ne genera una e la stampa. Gli altri comandi sono `elenco`,
`password <email> <nuova>` (che chiude anche le sessioni aperte) e
`rimuovi <email>` (che cancella l'utente con tutte le sue liste).

### Ruoli

| | Admin | Member |
|---|---|---|
| Liste, preferiti, salvati | sì | sì |
| Correggere la posizione di un prodotto | la sposta subito | manda una segnalazione |
| Disegnare le planimetrie | sì | no |
| Spostare interi reparti | sì | no |
| Vedere e decidere le segnalazioni | sì | no |

```bash
npx tsx scripts/user.mts ruolo mario@esempio.it admin
```

Le pagine sotto `/admin` passano tutte dal layout che chiama `requireAdmin`:
nessuna resta scoperta per dimenticanza. Un member che ci arriva viene
rimandato alla home, non alla pagina di accesso: è autenticato, semplicemente
non ha i permessi.

### Segnalazioni

Dalla modalità spesa, il tasto "Non è qui" apre la mappa. Per un admin sposta
il prodotto e conferma la posizione; per un member crea una segnalazione con
dove l'app diceva che fosse, dove dice lui che sia e una nota facoltativa.

In `/admin/segnalazioni` l'admin vede chi ha segnalato cosa e cosa propone, e
può accettare, accettare correggendo la posizione proposta, o rifiutare — con
un motivo. Accettare sposta davvero il prodotto e ne conferma la posizione,
quindi il seed non la tocca più.

Le password sono hashate con scrypt della libreria standard di Node: nessuna
dipendenza nativa da compilare, quindi si comporta uguale in Docker e su
hosting serverless. Del token di sessione il database conserva solo l'impronta
sha256, cosi' leggere la tabella non basta a fabbricarsi un cookie valido. Le
sessioni durano 90 giorni: non si fa il login in mezzo alla spesa.

`src/proxy.ts` blocca chi non ha il cookie; la validita' vera della sessione la
controlla il server con `requireUser`, perche' nel proxy il database non e'
raggiungibile.

## Supermercati

La home elenca i supermercati; quello selezionato si apre in grande con la sua
mappa, gli altri restano compressi in una riga. Il pulsante in fondo crea una
lista sul supermercato selezionato.

Un supermercato annunciato ma non ancora rilevato ha stato `comingSoon`: si
vede con l'etichetta "Prossimamente" e non e' selezionabile per una lista.
Conad Castenaso e' li' in questo stato; diventa utilizzabile quando gli si
disegna una planimetria.

## Liste, preferiti, salvati

Ogni riga della lista ha una **matita** per la nota libera ("Barilla mezzo kg")
e un **segnalibro** che mette da parte il prodotto *con quella nota*: dal chip
"Salvati" lo ripeschi già personalizzato invece di riscriverla ogni volta.

La **stella** sulla scheda del supermercato lo segna fra i preferiti. La
sezione "comprati spesso" nella lista vuota conta gli acquisti di ciascun
utente, non quelli di tutti.

## Catalogo completo Coop (opzionale)

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

## Durante la spesa

Corsia non sa dove sei davvero: non c'e' posizionamento indoor. Sa pero' da
dove vieni e dove devi arrivare, quindi la vista ravvicinata inquadra **la
tratta corrente**, non una posizione: il tratto fra la tappa precedente e
quella attuale, con i metri da fare e lo scaffale bersaglio marcato sul lato
giusto del corridoio. Sotto resta la mappa d'insieme. Entrambe si aggiornano a
ogni "Preso".

Le tappe che condividono lo stesso scaffale diventano un pin solo con
l'intervallo ("5–6"): disegnate una sopra l'altra sarebbero illeggibili.

## Mappare un supermercato

Tre passi, tutti da `/admin`.

**1. Disegna la planimetria.** `Planimetrie` → scegli il supermercato. La
palette e' fatta di reparti, non di forme generiche: dipingendo "Ortofrutta" il
blocco nasce col suo colore e col suo nome, che diventera' il nome della
corsia. Con "Sposta" trascini, coi tasti + / − zoomi. Al salvataggio la griglia
di percorribilita' viene ricalcolata e i blocchi ricostruiti raggruppando le
celle contigue dello stesso tipo, colore e nome.

**2. Genera corsie e punti di prelievo.** Il pulsante nell'editor ricava
entrambi dalla planimetria: ogni blocco su cui si prende merce diventa una
corsia, e i suoi lati raggiungibili diventano gli scaffali, divisi in campate
da 2,5 m con il punto di prelievo al centro. Muri, casse e ingresso non fanno
corsia. L'ordine di percorrenza segue una serpentina a fasce, che e' il giro
che si fa davvero.

Rigenerare cancella i punti di prelievo, e con loro le posizioni dei prodotti:
su un negozio gia' popolato la funzione si ferma e dice quante ne perderesti,
prima di chiedere conferma.

**3. Dai i nomi alle corsie.** `/admin/corsie` elenca quelle generate: si
cambiano nome e ordine di percorrenza, e le etichette dei punti di prelievo
seguono.

Poi da `/admin/posizioni` si assegnano i prodotti, un reparto alla volta col
pulsante "Tutto il reparto".

Se qualche punto di prelievo finisce sotto un blocco o diventa irraggiungibile
dall'ingresso, il salvataggio lo dice invece di nasconderlo.

## Note

- La planimetria iniziale e' un ipermercato **plausibile**, non un rilievo del
  negozio reale: e' pensata per essere corretta dall'editor.
- L'app e' una PWA: la modalita' spesa continua a funzionare sulle pagine gia'
  aperte anche senza rete, che nei supermercati serve.
- `prisma` porta con se una vulnerabilita' nota di `deepmerge-ts` (stack
  exhaustion): riguarda solo la CLI in fase di build su input nostri, non il
  runtime dell'app. `npm audit fix --force` porterebbe a una release candidate
  di Prisma 8, quindi resta cosi'.
