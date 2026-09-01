export type PickClass = "normal" | "fragile" | "chilled" | "frozen";

export type CategorySeed = {
  slug: string;
  name: string;
  iconKey: string;
  colorToken: string;
  pickClass: PickClass;
  /** Posizione ipotizzata: corsia, lato, campata. */
  home: [number, "L" | "R", number];
};

export const CATEGORIES: CategorySeed[] = [
  { slug: "ortofrutta", name: "Ortofrutta", iconKey: "carrot", colorToken: "produce", pickClass: "normal", home: [100, "R", 1] },
  { slug: "panetteria", name: "Pane e forno", iconKey: "bread", colorToken: "bakery", pickClass: "fragile", home: [101, "R", 1] },
  { slug: "macelleria", name: "Carne", iconKey: "meat", colorToken: "meat", pickClass: "chilled", home: [102, "R", 1] },
  { slug: "pescheria", name: "Pesce", iconKey: "fish", colorToken: "fish", pickClass: "chilled", home: [103, "R", 1] },
  { slug: "latticini", name: "Latticini e uova", iconKey: "milk", colorToken: "dairy", pickClass: "chilled", home: [11, "R", 1] },
  { slug: "salumi", name: "Salumi e formaggi", iconKey: "cheese", colorToken: "deli", pickClass: "chilled", home: [12, "L", 1] },
  { slug: "surgelati", name: "Surgelati", iconKey: "snowflake", colorToken: "frozen", pickClass: "frozen", home: [200, "L", 1] },
  { slug: "pasta-riso", name: "Pasta e riso", iconKey: "pasta", colorToken: "pantry", pickClass: "normal", home: [2, "L", 1] },
  { slug: "conserve", name: "Conserve e sughi", iconKey: "jar", colorToken: "pantry", pickClass: "normal", home: [2, "R", 1] },
  { slug: "olio-condimenti", name: "Olio e condimenti", iconKey: "oil", colorToken: "pantry", pickClass: "normal", home: [3, "L", 1] },
  { slug: "scatolame", name: "Scatolame e legumi", iconKey: "can", colorToken: "pantry", pickClass: "normal", home: [3, "R", 1] },
  { slug: "colazione", name: "Colazione", iconKey: "cereal", colorToken: "breakfast", pickClass: "normal", home: [4, "L", 1] },
  { slug: "dolci-snack", name: "Dolci e snack", iconKey: "cookie", colorToken: "sweet", pickClass: "normal", home: [4, "R", 1] },
  { slug: "caffe-the", name: "Caffè, tè e zucchero", iconKey: "coffee", colorToken: "breakfast", pickClass: "normal", home: [5, "L", 1] },
  { slug: "aperitivo", name: "Aperitivo e salati", iconKey: "chips", colorToken: "sweet", pickClass: "normal", home: [5, "R", 1] },
  { slug: "bevande", name: "Bevande", iconKey: "bottle", colorToken: "drinks", pickClass: "normal", home: [6, "L", 1] },
  { slug: "acqua", name: "Acqua", iconKey: "water", colorToken: "drinks", pickClass: "normal", home: [6, "R", 1] },
  { slug: "vini-birre", name: "Vini e birre", iconKey: "wine", colorToken: "drinks", pickClass: "normal", home: [7, "L", 1] },
  { slug: "cura-casa", name: "Cura della casa", iconKey: "spray", colorToken: "home", pickClass: "normal", home: [7, "R", 1] },
  { slug: "carta-casa", name: "Carta e usa e getta", iconKey: "roll", colorToken: "home", pickClass: "normal", home: [8, "L", 1] },
  { slug: "cura-persona", name: "Cura della persona", iconKey: "soap", colorToken: "care", pickClass: "normal", home: [8, "R", 1] },
  { slug: "mondo-bimbo", name: "Mondo bimbo", iconKey: "baby", colorToken: "care", pickClass: "normal", home: [1, "R", 1] },
  { slug: "animali", name: "Animali", iconKey: "paw", colorToken: "pet", pickClass: "normal", home: [9, "L", 1] },
  { slug: "vegetariano", name: "Bio e vegetariano", iconKey: "leaf", colorToken: "produce", pickClass: "normal", home: [9, "R", 1] },
  { slug: "frutta-secca", name: "Frutta secca", iconKey: "nut", colorToken: "pantry", pickClass: "normal", home: [10, "L", 1] },
  { slug: "spezie", name: "Spezie e erbe", iconKey: "herb", colorToken: "pantry", pickClass: "normal", home: [10, "R", 1] },
];

export type ProductSeed = {
  name: string;
  categorySlug: string;
  iconKey?: string;
  size?: string;
  brand?: string;
  ean?: string;
  sourceUrl?: string;
};

/** [nome, iconKey?, formato?, marca?] */
type Row = [string, string?, string?, string?];

const CATALOG: Record<string, Row[]> = {
  ortofrutta: [
    ["Carote", "carrot", "1 kg"],
    ["Patate", "potato", "2 kg"],
    ["Cipolle dorate", "onion", "1 kg"],
    ["Pomodori ciliegino", "tomato", "500 g"],
    ["Pomodori da sugo", "tomato", "1 kg"],
    ["Insalata iceberg", "salad", "1 pz"],
    ["Rucola", "salad", "100 g"],
    ["Zucchine", "zucchini", "1 kg"],
    ["Melanzane", "eggplant", "1 kg"],
    ["Peperoni", "pepper", "500 g"],
    ["Funghi champignon", "mushroom", "250 g"],
    ["Spinaci", "salad", "500 g"],
    ["Broccoli", "broccoli", "1 pz"],
    ["Finocchi", "fennel", "1 kg"],
    ["Sedano", "celery", "1 pz"],
    ["Aglio", "garlic", "3 teste"],
    ["Limoni", "lemon", "500 g"],
    ["Arance", "orange", "2 kg"],
    ["Mele Golden", "apple", "1 kg"],
    ["Mele Fuji", "apple", "1 kg"],
    ["Banane", "banana", "1 kg"],
    ["Pere Abate", "pear", "1 kg"],
    ["Uva bianca", "grapes", "500 g"],
    ["Fragole", "strawberry", "250 g"],
    ["Kiwi", "kiwi", "500 g"],
    ["Avocado", "avocado", "2 pz"],
  ],
  panetteria: [
    ["Pane casereccio", "bread", "500 g"],
    ["Pane integrale", "bread", "500 g"],
    ["Baguette", "baguette", "1 pz"],
    ["Michette", "bread", "6 pz"],
    ["Piadina", "flatbread", "4 pz"],
    ["Focaccia", "focaccia", "300 g"],
    ["Cornetti", "croissant", "6 pz"],
    ["Grissini torinesi", "breadstick", "250 g"],
    ["Pane in cassetta", "toast", "400 g"],
    ["Crackers salati", "cracker", "250 g"],
  ],
  macelleria: [
    ["Petto di pollo", "chicken", "500 g"],
    ["Cosce di pollo", "chicken", "800 g"],
    ["Fettine di tacchino", "chicken", "400 g"],
    ["Macinato di manzo", "beef", "500 g"],
    ["Bistecca di manzo", "beef", "400 g"],
    ["Braciole di maiale", "pork", "500 g"],
    ["Salsiccia", "sausage", "400 g"],
    ["Arrosto di vitello", "beef", "800 g"],
    ["Hamburger", "beef", "2 pz"],
  ],
  pescheria: [
    ["Salmone fresco", "salmon", "300 g"],
    ["Orata", "fish", "2 pz"],
    ["Branzino", "fish", "2 pz"],
    ["Gamberi", "shrimp", "300 g"],
    ["Cozze", "mussel", "1 kg"],
    ["Vongole", "mussel", "500 g"],
    ["Filetto di merluzzo", "fish", "400 g"],
  ],
  latticini: [
    ["Latte intero", "milk", "1 L"],
    ["Latte parzialmente scremato", "milk", "1 L"],
    ["Latte senza lattosio", "milk", "1 L"],
    ["Panna da cucina", "cream", "200 ml"],
    ["Burro", "butter", "250 g"],
    ["Uova medie", "egg", "6 pz"],
    ["Uova grandi", "egg", "10 pz"],
    ["Yogurt bianco", "yogurt", "500 g"],
    ["Yogurt alla frutta", "yogurt", "4x125 g"],
    ["Yogurt greco", "yogurt", "150 g"],
    ["Mascarpone", "cheese", "250 g"],
    ["Ricotta", "cheese", "250 g"],
    ["Besciamella", "cream", "500 ml"],
  ],
  salumi: [
    ["Prosciutto crudo", "ham", "100 g"],
    ["Prosciutto cotto", "ham", "150 g"],
    ["Mortadella", "salami", "150 g"],
    ["Salame Milano", "salami", "150 g"],
    ["Speck", "ham", "100 g"],
    ["Bresaola", "ham", "100 g"],
    ["Pancetta a cubetti", "bacon", "2x75 g"],
    ["Parmigiano Reggiano", "parmesan", "300 g"],
    ["Grana grattugiato", "parmesan", "100 g"],
    ["Mozzarella", "mozzarella", "125 g"],
    ["Mozzarella di bufala", "mozzarella", "125 g"],
    ["Stracchino", "cheese", "100 g"],
    ["Gorgonzola", "cheese", "200 g"],
    ["Formaggio spalmabile", "cheese", "150 g"],
    ["Sottilette", "cheese", "200 g"],
  ],
  surgelati: [
    ["Piselli surgelati", "frozen-peas", "450 g"],
    ["Spinaci surgelati", "frozen-peas", "450 g"],
    ["Minestrone surgelato", "frozen-peas", "600 g"],
    ["Patatine fritte surgelate", "fries", "750 g"],
    ["Bastoncini di pesce", "fish-stick", "10 pz"],
    ["Pizza margherita surgelata", "pizza", "2 pz"],
    ["Gelato vaniglia", "ice-cream", "500 ml"],
    ["Gelato cioccolato", "ice-cream", "500 ml"],
    ["Cornetti gelato", "ice-cream", "6 pz"],
    ["Gamberi surgelati", "shrimp", "400 g"],
  ],
  "pasta-riso": [
    ["Spaghetti", "spaghetti", "500 g"],
    ["Penne rigate", "pasta", "500 g"],
    ["Fusilli", "pasta", "500 g"],
    ["Farfalle", "pasta", "500 g"],
    ["Rigatoni", "pasta", "500 g"],
    ["Pasta integrale", "pasta", "500 g"],
    ["Lasagne", "pasta", "500 g"],
    ["Riso Carnaroli", "rice", "1 kg"],
    ["Riso Basmati", "rice", "500 g"],
    ["Cous cous", "rice", "500 g"],
    ["Farina 00", "flour", "1 kg"],
    ["Farina integrale", "flour", "1 kg"],
    ["Gnocchi di patate", "pasta", "500 g"],
    ["Orzo perlato", "rice", "500 g"],
  ],
  conserve: [
    ["Passata di pomodoro", "tomato-sauce", "700 g"],
    ["Pomodori pelati", "tomato-sauce", "400 g"],
    ["Polpa di pomodoro", "tomato-sauce", "400 g"],
    ["Sugo al basilico", "tomato-sauce", "400 g"],
    ["Pesto alla genovese", "pesto", "190 g"],
    ["Concentrato di pomodoro", "tomato-sauce", "140 g"],
    ["Olive verdi", "olive", "300 g"],
    ["Carciofini sott'olio", "jar", "280 g"],
    ["Funghi sott'olio", "jar", "280 g"],
    ["Marmellata di albicocche", "jam", "340 g"],
    ["Miele millefiori", "honey", "500 g"],
    ["Crema spalmabile alla nocciola", "jam", "400 g"],
  ],
  "olio-condimenti": [
    ["Olio extravergine di oliva", "olive-oil", "1 L"],
    ["Olio di semi di girasole", "oil", "1 L"],
    ["Aceto di vino", "vinegar", "500 ml"],
    ["Aceto balsamico", "vinegar", "250 ml"],
    ["Maionese", "sauce", "250 ml"],
    ["Ketchup", "sauce", "500 ml"],
    ["Senape", "sauce", "200 g"],
    ["Salsa di soia", "sauce", "150 ml"],
  ],
  scatolame: [
    ["Tonno all'olio d'oliva", "tuna-can", "3x80 g"],
    ["Tonno al naturale", "tuna-can", "3x80 g"],
    ["Fagioli borlotti", "beans", "400 g"],
    ["Ceci", "beans", "400 g"],
    ["Lenticchie", "beans", "400 g"],
    ["Mais dolce", "corn", "300 g"],
    ["Piselli in scatola", "beans", "400 g"],
    ["Brodo vegetale granulare", "can", "150 g"],
    ["Sgombro in scatola", "tuna-can", "125 g"],
  ],
  colazione: [
    ["Muesli", "muesli", "375 g"],
    ["Muesli croccante al cioccolato", "muesli", "375 g"],
    ["Corn flakes", "cereal", "500 g"],
    ["Cereali integrali", "cereal", "400 g"],
    ["Biscotti frollini", "biscuit", "700 g"],
    ["Biscotti integrali", "biscuit", "400 g"],
    ["Fette biscottate", "toast", "315 g"],
    ["Merendine al cioccolato", "snack-cake", "10 pz"],
    ["Plumcake", "snack-cake", "8 pz"],
    ["Avena in fiocchi", "muesli", "500 g"],
  ],
  "dolci-snack": [
    ["Cioccolato fondente", "chocolate", "100 g"],
    ["Cioccolato al latte", "chocolate", "100 g"],
    ["Tavoletta alle nocciole", "chocolate", "100 g"],
    ["Barrette ai cereali", "bar", "6 pz"],
    ["Caramelle gommose", "candy", "200 g"],
    ["Wafer alla vaniglia", "biscuit", "250 g"],
    ["Budino al cioccolato", "pudding", "4x100 g"],
    ["Torta margherita", "cake", "400 g"],
  ],
  "caffe-the": [
    ["Caffè macinato", "coffee", "250 g"],
    ["Caffè in cialde", "coffee", "18 pz"],
    ["Caffè solubile", "coffee", "100 g"],
    ["Tè nero", "tea", "25 filtri"],
    ["Tè verde", "tea", "20 filtri"],
    ["Camomilla", "tea", "20 filtri"],
    ["Zucchero semolato", "sugar", "1 kg"],
    ["Zucchero di canna", "sugar", "500 g"],
    ["Cacao amaro", "cocoa", "75 g"],
    ["Orzo solubile", "coffee", "200 g"],
  ],
  aperitivo: [
    ["Patatine classiche", "chips", "150 g"],
    ["Patatine paprika", "chips", "150 g"],
    ["Arachidi salate", "peanut", "200 g"],
    ["Pistacchi salati", "peanut", "150 g"],
    ["Taralli", "cracker", "250 g"],
    ["Salatini", "cracker", "200 g"],
    ["Popcorn da microonde", "popcorn", "3 pz"],
    ["Olive taggiasche", "olive", "180 g"],
  ],
  bevande: [
    ["Coca Cola", "soda", "1,5 L"],
    ["Aranciata", "soda", "1,5 L"],
    ["Chinotto", "soda", "1 L"],
    ["Tè freddo al limone", "soda", "1,5 L"],
    ["Succo di frutta pesca", "juice", "1 L"],
    ["Succo d'arancia", "juice", "1 L"],
    ["Spremuta di agrumi", "juice", "750 ml"],
    ["Energy drink", "soda", "250 ml"],
  ],
  acqua: [
    ["Acqua naturale", "water", "6x1,5 L"],
    ["Acqua frizzante", "water", "6x1,5 L"],
    ["Acqua leggermente frizzante", "water", "6x1,5 L"],
    ["Acqua in bottiglia di vetro", "water", "12x1 L"],
  ],
  "vini-birre": [
    ["Vino rosso Sangiovese", "wine", "750 ml"],
    ["Vino bianco Pignoletto", "wine", "750 ml"],
    ["Lambrusco", "wine", "750 ml"],
    ["Prosecco", "wine", "750 ml"],
    ["Birra chiara", "beer", "6x33 cl"],
    ["Birra artigianale", "beer", "50 cl"],
    ["Spritz pronto", "wine", "750 ml"],
  ],
  "cura-casa": [
    ["Detersivo lavatrice liquido", "detergent", "2 L"],
    ["Ammorbidente", "detergent", "1,5 L"],
    ["Detersivo piatti", "dish-soap", "1 L"],
    ["Pastiglie lavastoviglie", "dish-soap", "40 pz"],
    ["Sgrassatore spray", "spray", "750 ml"],
    ["Anticalcare", "spray", "500 ml"],
    ["Candeggina", "detergent", "1 L"],
    ["Sacchi spazzatura", "trash-bag", "20 pz"],
    ["Spugne per piatti", "sponge", "6 pz"],
  ],
  "carta-casa": [
    ["Carta igienica", "toilet-paper", "12 rotoli"],
    ["Rotoloni da cucina", "paper-towel", "4 rotoli"],
    ["Fazzoletti di carta", "tissue", "10 pz"],
    ["Tovaglioli di carta", "tissue", "100 pz"],
    ["Pellicola trasparente", "wrap", "50 m"],
    ["Carta forno", "wrap", "20 m"],
    ["Alluminio", "wrap", "30 m"],
  ],
  "cura-persona": [
    ["Bagnoschiuma", "soap", "500 ml"],
    ["Shampoo", "shampoo", "400 ml"],
    ["Balsamo", "shampoo", "300 ml"],
    ["Dentifricio", "toothpaste", "75 ml"],
    ["Spazzolino", "toothbrush", "2 pz"],
    ["Deodorante", "deodorant", "150 ml"],
    ["Sapone mani", "soap", "300 ml"],
    ["Rasoi usa e getta", "razor", "5 pz"],
    ["Cotton fioc", "cotton", "200 pz"],
  ],
  "mondo-bimbo": [
    ["Pannolini", "diaper", "30 pz"],
    ["Salviette per bambini", "wipes", "3x72 pz"],
    ["Omogeneizzato alla frutta", "baby-food", "2x100 g"],
    ["Biscotti per l'infanzia", "baby-food", "360 g"],
    ["Bagnetto delicato", "soap", "500 ml"],
  ],
  animali: [
    ["Croccantini per cani", "dog-food", "3 kg"],
    ["Bocconcini per cani", "dog-food", "12x100 g"],
    ["Croccantini per gatti", "cat-food", "2 kg"],
    ["Bustine per gatti", "cat-food", "12x85 g"],
    ["Lettiera per gatti", "litter", "5 L"],
  ],
  vegetariano: [
    ["Tofu naturale", "tofu", "200 g"],
    ["Seitan", "tofu", "200 g"],
    ["Burger vegetale", "veg-burger", "2 pz"],
    ["Latte di soia", "soy-milk", "1 L"],
    ["Latte di mandorla", "soy-milk", "1 L"],
    ["Hummus", "hummus", "200 g"],
    ["Quinoa", "rice", "400 g"],
  ],
  "frutta-secca": [
    ["Noci sgusciate", "nut", "200 g"],
    ["Mandorle", "nut", "200 g"],
    ["Nocciole", "nut", "150 g"],
    ["Uvetta", "raisin", "250 g"],
    ["Albicocche secche", "raisin", "200 g"],
    ["Datteri", "raisin", "250 g"],
    ["Semi di zucca", "seed", "150 g"],
  ],
  spezie: [
    ["Sale fino", "salt", "1 kg"],
    ["Sale grosso", "salt", "1 kg"],
    ["Pepe nero macinato", "pepper-spice", "50 g"],
    ["Origano", "herb", "20 g"],
    ["Basilico secco", "herb", "15 g"],
    ["Paprika dolce", "pepper-spice", "40 g"],
    ["Curry", "pepper-spice", "40 g"],
    ["Cannella", "pepper-spice", "30 g"],
    ["Noce moscata", "pepper-spice", "20 g"],
    ["Lievito per dolci", "flour", "3 bustine"],
    ["Lievito di birra secco", "flour", "3 bustine"],
  ],
};

export const PRODUCTS: ProductSeed[] = Object.entries(CATALOG).flatMap(([categorySlug, rows]) =>
  rows.map(([name, iconKey, size, brand]) => ({ name, categorySlug, iconKey, size, brand })),
);

/** Slug stabile e testo normalizzato per la ricerca fuzzy. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function searchTextOf(product: { name: string; brand?: string; size?: string }): string {
  return [product.name, product.brand]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
