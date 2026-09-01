/**
 * Importer del catalogo Coop (piattaforma "ebsn" di coopshop.it).
 *
 * Processo OFFLINE e one-shot: l'app non chiama mai questo endpoint a runtime,
 * legge soltanto lo snapshot versionato in data/catalog.snapshot.json. Se il
 * sito cambia, l'app continua a funzionare: va corretto solo questo script.
 *
 * Uso:
 *   npx tsx scripts/scrape-coop.ts [--max-per-categoria N] [--out percorso]
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { CATEGORIES } from "../src/lib/store/catalog";
import { iconForProduct } from "../src/lib/store/icon-rules";

const BASE = "https://www.coopshop.it";
const USER_AGENT = "CorsiaBot/0.1 (uso personale, non commerciale)";
const PAGE_SIZE = 48;
const DELAY_MS = 350;

/**
 * Dai reparti di coopshop.it alle categorie di Corsia. Ordinate: vince la prima
 * regola che combacia con il percorso della sottocategoria.
 */
const MAPPING: [RegExp, string][] = [
  [/^frutta-e-verdura\/frutta-secca/, "frutta-secca"],
  [/^frutta-e-verdura\/legumi/, "scatolame"],
  [/^frutta-e-verdura\//, "ortofrutta"],

  [/^pasta-pane-riso-e-farine\/(pane|altro-pane|pizza-farinata)/, "panetteria"],
  [/^pasta-pane-riso-e-farine\//, "pasta-riso"],

  [/^carne\//, "macelleria"],
  [/^pesce\//, "pescheria"],

  [/^latte-yogurt-e-uova\/bevande-vegetali/, "vegetariano"],
  [/^latte-yogurt-e-uova\//, "latticini"],
  [/^gastronomia-salumi-e-formaggi\//, "salumi"],
  [/^surgelati-e-gelati\//, "surgelati"],

  [/^condimenti-conserve-e-scatolame\/olio-e-aceto/, "olio-condimenti"],
  [/^condimenti-conserve-e-scatolame\/sale-spezie/, "spezie"],
  [/^condimenti-conserve-e-scatolame\/(verdure-e-ortaggi-in-scatola|legumi)/, "scatolame"],
  [/^condimenti-conserve-e-scatolame\//, "conserve"],

  [/^colazione-dolci-e-snack-salati\/caffe-te/, "caffe-the"],
  [/^colazione-dolci-e-snack-salati\/(cereali|biscotti|fette-biscottate|merendine|pasticceria|preparati-per-dolci|marmellate|miele)/, "colazione"],
  [/^colazione-dolci-e-snack-salati\/(snack-salati|patatine|aperitivo|salatini|frutta-secca)/, "aperitivo"],
  [/^colazione-dolci-e-snack-salati\//, "dolci-snack"],

  [/^acqua-e-bevande\/acqua/, "acqua"],
  [/^acqua-e-bevande\/(birre|vini|aperitivi|spumanti|liquori|distillati)/, "vini-birre"],
  [/^acqua-e-bevande\//, "bevande"],

  [/^cura-casa-e-persona\/(carta|accessori-pulizia)/, "carta-casa"],
  [/^cura-casa-e-persona\//, "cura-casa"],
  [/^cura-persona\//, "cura-persona"],
  [/^prima-infanzia\//, "mondo-bimbo"],
  [/^amici-animali\//, "animali"],
  [/^prodotti-non-alimentari\/(tavola-e-cucina|stiro)/, "carta-casa"],
];

type EbsnCategory = { categoryId: number; slug: string; name: string; categories?: EbsnCategory[] };

type EbsnProduct = {
  productId: number;
  name: string;
  shortDescr?: string;
  description?: string;
  barcode?: string;
  slug?: string;
  vendor?: { name?: string };
};

export type SnapshotProduct = {
  name: string;
  brand: string | null;
  size: string | null;
  ean: string | null;
  categorySlug: string;
  iconKey: string | null;
  sourceId: string;
  sourceUrl: string | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson<T>(path: string, attempt = 1): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    if (attempt <= 3 && (response.status === 429 || response.status >= 500)) {
      await sleep(DELAY_MS * 4 * attempt);
      return getJson<T>(path, attempt + 1);
    }
    throw new Error(`${path} -> HTTP ${response.status}`);
  }

  // L'API antepone qualche riga vuota al JSON.
  return JSON.parse((await response.text()).trim()) as T;
}

function corsiaCategoryOf(slug: string): string | null {
  for (const [pattern, target] of MAPPING) {
    if (pattern.test(slug)) return target;
  }
  return null;
}

/** Sottocategorie di secondo livello: e' il livello a cui la mappatura ragiona. */
function secondLevel(tree: EbsnCategory[]): EbsnCategory[] {
  return tree.flatMap((root) => root.categories ?? []);
}

async function main() {
  const args = process.argv.slice(2);
  const maxPerCategory = Number(readFlag(args, "--max-per-categoria") ?? Infinity);
  const out = resolve(process.cwd(), readFlag(args, "--out") ?? "data/catalog.snapshot.json");

  console.log("Scarico l'albero delle categorie…");
  const tree = await getJson<{ data: { categories: EbsnCategory[] } }>("/ebsn/api/category?hash=category-tree");

  const known = new Set(CATEGORIES.map((c) => c.slug));
  const targets = secondLevel(tree.data.categories)
    .map((category) => ({ category, corsia: corsiaCategoryOf(category.slug) }))
    .filter((entry): entry is { category: EbsnCategory; corsia: string } => entry.corsia !== null);

  for (const entry of targets) {
    if (!known.has(entry.corsia)) throw new Error(`Categoria Corsia inesistente: ${entry.corsia}`);
  }

  console.log(`${targets.length} reparti mappati su ${CATEGORIES.length} categorie di Corsia.`);

  const products = new Map<string, SnapshotProduct>();

  for (const [index, entry] of targets.entries()) {
    let page = 1;
    let taken = 0;

    for (;;) {
      const query = `parent_category_id=${entry.category.categoryId}&page=${page}&page_size=${PAGE_SIZE}`;
      const body = await getJson<{
        data: { page: { totPages: number; totItems: number }; products: EbsnProduct[] };
      }>(`/ebsn/api/products?${query}`);

      for (const product of body.data.products ?? []) {
        const key = String(product.productId);
        if (products.has(key)) continue;

        products.set(key, {
          name: cleanName(product.name),
          brand: product.vendor?.name?.trim() || product.shortDescr?.trim() || null,
          size: product.description?.trim() || null,
          ean: product.barcode?.trim() || null,
          categorySlug: entry.corsia,
          iconKey: iconForProduct(product.name, product.description ?? "") ?? null,
          sourceId: key,
          sourceUrl: product.slug ? `${BASE}/product/${product.slug}` : null,
        });
        taken++;
      }

      const totPages = body.data.page?.totPages ?? 1;
      process.stdout.write(
        `\r[${index + 1}/${targets.length}] ${entry.category.slug} — pagina ${page}/${totPages}, ${taken} prodotti      `,
      );

      if (page >= totPages || taken >= maxPerCategory) break;
      page++;
      await sleep(DELAY_MS);
    }

    process.stdout.write("\n");
    await sleep(DELAY_MS);
  }

  const snapshot = {
    source: BASE,
    fetchedAt: new Date().toISOString(),
    count: products.size,
    products: [...products.values()].sort((a, b) => a.name.localeCompare(b.name, "it")),
  };

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(snapshot, null, 1)}\n`, "utf8");

  const withIcon = snapshot.products.filter((p) => p.iconKey).length;
  console.log(`\nSnapshot scritto in ${out}`);
  console.log(`${snapshot.count} prodotti, ${withIcon} con icona propria (${Math.round((withIcon / snapshot.count) * 100)}%).`);
}

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

/** I nomi arrivano a volte tutti maiuscoli o con spazi doppi. */
function cleanName(name: string): string {
  const trimmed = name.replace(/\s+/g, " ").trim();
  if (trimmed !== trimmed.toUpperCase()) return trimmed;
  return trimmed
    .toLowerCase()
    .replace(/(^|[\s(])(\p{L})/gu, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

main().catch((error) => {
  console.error("\nImport fallito:", error.message);
  console.error("Lo snapshot precedente non e' stato toccato.");
  process.exit(1);
});
