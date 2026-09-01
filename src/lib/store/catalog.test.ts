import { describe, expect, test } from "vitest";
import { ALIASES, DRAWINGS } from "@/components/icons/paths";
import { buildLayout } from "./layout";
import {
  CATEGORIES,
  PRODUCTS,
  normalizeSearchText,
  productNamesForSearch,
  productNameForAlias,
  searchTextOf,
  slugify,
} from "./catalog";

const hasDrawing = (key?: string | null) =>
  !!key && (key in DRAWINGS || (ALIASES[key] !== undefined && ALIASES[key] in DRAWINGS));

function product(name: string) {
  return PRODUCTS.find((row) => row.name === name);
}

describe("catalogo prodotti", () => {
  test("ogni prodotto punta a una categoria esistente", () => {
    const known = new Set(CATEGORIES.map((c) => c.slug));
    const orphans = PRODUCTS.filter((p) => !known.has(p.categorySlug));

    expect(orphans.map((p) => `${p.name} -> ${p.categorySlug}`)).toEqual([]);
  });

  test("ogni icona indicata esiste davvero", () => {
    const missing = PRODUCTS.filter((p) => p.iconKey && !hasDrawing(p.iconKey));

    expect(missing.map((p) => `${p.name} -> ${p.iconKey}`)).toEqual([]);
  });

  test("ogni categoria ha la sua icona", () => {
    const missing = CATEGORIES.filter((c) => !hasDrawing(c.iconKey));

    expect(missing.map((c) => `${c.slug} -> ${c.iconKey}`)).toEqual([]);
  });

  test("la posizione di partenza di ogni categoria esiste sulla mappa", () => {
    const layout = buildLayout();
    const known = new Set(layout.locations.map((l) => `${l.aisleNumber}/${l.side}/${l.bay}`));
    const broken = CATEGORIES.filter((c) => !known.has(c.home.join("/")));

    expect(broken.map((c) => `${c.slug} -> ${c.home.join("/")}`)).toEqual([]);
  });

  test("nessuna categoria duplicata", () => {
    const slugs = CATEGORIES.map((c) => c.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("mantiene i 248 prodotti originali e aggiunge l'espansione senza duplicati", () => {
    expect(PRODUCTS).toHaveLength(435);
    const keys = PRODUCTS.map((p) => slugify(`${p.name} ${p.size ?? ""}`));
    const duplicates = keys.filter((key, i) => keys.indexOf(key) !== i);
    expect([...new Set(duplicates)]).toEqual([]);

    expect(product("Carote")).toBeDefined();
    expect(product("Salmone affumicato")).toBeDefined();
    expect(product("Aperol")?.categorySlug).toBe("aperitivi-cocktail");
    expect(CATEGORIES.some((category) => category.slug === "aperitivi-cocktail")).toBe(true);
  });

  test.each([
    ["Chianti", "Vino rosso"],
    ["Montepulciano d’Abruzzo", "Vino rosso"],
    ["Chardonnay", "Vino bianco"],
    ["Cerasuolo", "Vino rosato"],
    ["Guinness", "Birra scura"],
    ["IPA", "Birra artigianale"],
    ["Peroni", "Birra chiara"],
    ["birra zero", "Birra analcolica"],
  ])("riconduce %s al prodotto generico %s", (query, expected) => {
    const term = normalizeSearchText(query);
    const matches = PRODUCTS.filter((row) => searchTextOf(row).includes(term));
    expect(matches.map((row) => row.name)).toContain(expected);
    expect(productNameForAlias(query)).toBe(expected);
  });

  test.each([
    ["spigola", "Branzino"],
    ["polipo", "Polpo"],
    ["pancarrè", "Pane in cassetta"],
    ["carne trita", "Macinato di manzo"],
    ["latte HD", "Latte senza lattosio"],
    ["EVO", "Olio extravergine di oliva"],
    ["Scottex", "Rotoloni da cucina"],
    ["Svelto", "Detersivo piatti"],
  ])("risolve l'alias di catalogo %s come %s", (query, expected) => {
    expect(productNamesForSearch(query)).toEqual([expected]);
  });

  test.each([
    ["latte vegetale", ["Latte di soia", "Latte di mandorla", "Bevanda d'avena"]],
    ["spritz", ["Spritz pronto", "Aperol", "Campari", "Select", "Prosecco", "Soda per cocktail"]],
    ["barbecue", ["Salsiccia", "Hamburger", "Costine di maiale", "Salsa barbecue"]],
  ])("espande il gruppo %s nell'ordine atteso", (query, expected) => {
    expect(productNamesForSearch(query)).toEqual(expected);
  });

  test("tutti i prodotti dei gruppi esistono nel catalogo", () => {
    for (const query of [
      "latte vegetale",
      "insalata",
      "formaggio",
      "affettato",
      "pesce azzurro",
      "frutti di mare",
      "verdure surgelate",
      "aperitivo",
      "spritz",
      "colazione",
      "barbecue",
      "pizza",
    ]) {
      expect(productNamesForSearch(query).filter((name) => !product(name))).toEqual([]);
    }
  });
});
