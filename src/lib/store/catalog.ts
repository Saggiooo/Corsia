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
  { slug: "aperitivi-cocktail", name: "Aperitivi e cocktail", iconKey: "wine", colorToken: "drinks", pickClass: "normal", home: [7, "L", 1] },
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
  aliases?: readonly string[];
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

/**
 * Ampliamento curato del catalogo base. Le voci originali sopra restano
 * inalterate; qui aggiungiamo varieta' reali senza moltiplicare i soli formati.
 */
const EXPANSION: Record<string, Row[]> = {
  ortofrutta: [
    ["Cavolfiore", "broccoli", "1 pz"],
    ["Cavolo cappuccio", "broccoli", "1 pz"],
    ["Verza", "broccoli", "1 pz"],
    ["Porri", "onion", "500 g"],
    ["Cetrioli", "zucchini", "500 g"],
    ["Radicchio", "salad", "1 pz"],
    ["Zucca", "potato", "1 kg"],
    ["Fagiolini", "beans", "500 g"],
    ["Asparagi", "salad", "500 g"],
    ["Pesche", "apple", "1 kg"],
    ["Albicocche", "orange", "500 g"],
    ["Ciliegie", "strawberry", "500 g"],
    ["Mandarini", "orange", "1 kg"],
    ["Ananas", "orange", "1 pz"],
    ["Melone", "orange", "1 pz"],
  ],
  panetteria: [
    ["Ciabatta", "bread", "1 pz"],
    ["Rosetta", "bread", "4 pz"],
    ["Pane di segale", "bread", "500 g"],
    ["Pane ai cereali", "bread", "500 g"],
    ["Panini al latte", "bread", "8 pz"],
    ["Tortillas", "flatbread", "6 pz"],
    ["Pizza bianca", "focaccia", "300 g"],
    ["Pangrattato", "bread", "500 g"],
  ],
  macelleria: [
    ["Lonza di maiale", "pork", "500 g"],
    ["Filetto di maiale", "pork", "500 g"],
    ["Costine di maiale", "pork", "800 g"],
    ["Spezzatino di manzo", "beef", "500 g"],
    ["Polpette di carne", "beef", "400 g"],
    ["Coniglio", "meat", "1 kg"],
    ["Pollo intero", "chicken", "1,2 kg"],
    ["Fettine di vitello", "beef", "400 g"],
  ],
  pescheria: [
    ["Salmone affumicato", "salmon", "100 g"],
    ["Trota affumicata", "fish", "100 g"],
    ["Carpaccio di salmone", "salmon", "100 g"],
    ["Tonno fresco", "fish", "300 g"],
    ["Pesce spada", "fish", "300 g"],
    ["Calamari", "fish", "500 g"],
    ["Polpo", "fish", "800 g"],
    ["Seppie", "fish", "500 g"],
    ["Alici", "fish", "300 g"],
    ["Sardine", "fish", "300 g"],
    ["Filetti di sgombro", "fish", "300 g"],
    ["Insalata di mare", "mussel", "300 g"],
  ],
  latticini: [
    ["Latte scremato", "milk", "1 L"],
    ["Kefir", "yogurt", "500 ml"],
    ["Yogurt da bere", "yogurt", "200 ml"],
    ["Yogurt senza lattosio", "yogurt", "2x125 g"],
    ["Panna fresca", "cream", "250 ml"],
    ["Feta", "cheese", "200 g"],
    ["Provola", "cheese", "250 g"],
    ["Scamorza", "cheese", "250 g"],
    ["Formaggio caprino", "cheese", "150 g"],
    ["Fiocchi di latte", "cheese", "200 g"],
  ],
  salumi: [
    ["Coppa", "ham", "100 g"],
    ["Fesa di tacchino", "ham", "100 g"],
    ["Arrosto di pollo affettato", "ham", "100 g"],
    ["Salame piccante", "salami", "150 g"],
    ["Soppressata", "salami", "150 g"],
    ["Taleggio", "cheese", "200 g"],
    ["Pecorino", "parmesan", "250 g"],
    ["Emmental", "cheese", "250 g"],
  ],
  surgelati: [
    ["Verdure grigliate surgelate", "frozen-peas", "450 g"],
    ["Fagiolini surgelati", "frozen-peas", "450 g"],
    ["Broccoli surgelati", "frozen-peas", "450 g"],
    ["Funghi surgelati", "frozen-peas", "450 g"],
    ["Lasagne surgelate", "pasta", "500 g"],
    ["Cannelloni surgelati", "pasta", "500 g"],
    ["Nuggets di pollo surgelati", "chicken", "400 g"],
    ["Filetti di merluzzo surgelati", "fish", "400 g"],
    ["Sorbetto al limone", "ice-cream", "500 ml"],
    ["Frutti di bosco surgelati", "strawberry", "450 g"],
  ],
  "pasta-riso": [
    ["Linguine", "spaghetti", "500 g"],
    ["Tagliatelle", "pasta", "500 g"],
    ["Tortellini", "pasta", "250 g"],
    ["Ravioli", "pasta", "250 g"],
    ["Polenta", "rice", "500 g"],
    ["Semolino", "flour", "500 g"],
    ["Riso integrale", "rice", "1 kg"],
    ["Bulgur", "rice", "500 g"],
  ],
  conserve: [
    ["Capperi", "jar", "100 g"],
    ["Cetriolini sott'aceto", "jar", "300 g"],
    ["Peperoni sott'olio", "jar", "280 g"],
    ["Melanzane sott'olio", "jar", "280 g"],
    ["Salsa alle olive", "sauce", "190 g"],
    ["Ragù vegetale", "tomato-sauce", "400 g"],
    ["Confettura di fragole", "jam", "340 g"],
    ["Sciroppo d'acero", "honey", "250 ml"],
  ],
  "olio-condimenti": [
    ["Olio di mais", "oil", "1 L"],
    ["Olio di arachidi", "oil", "1 L"],
    ["Aceto di mele", "vinegar", "500 ml"],
    ["Salsa barbecue", "sauce", "250 ml"],
    ["Salsa piccante", "sauce", "150 ml"],
    ["Succo di limone", "lemon", "200 ml"],
  ],
  scatolame: [
    ["Fagioli cannellini", "beans", "400 g"],
    ["Fave in scatola", "beans", "400 g"],
    ["Zuppa di cereali", "can", "400 g"],
    ["Acciughe sott'olio", "tuna-can", "80 g"],
    ["Salmone in scatola", "tuna-can", "150 g"],
    ["Olive nere", "olive", "300 g"],
  ],
  colazione: [
    ["Granola", "muesli", "375 g"],
    ["Riso soffiato", "cereal", "300 g"],
    ["Biscotti al cacao", "biscuit", "400 g"],
    ["Biscotti secchi", "biscuit", "500 g"],
    ["Brioche", "snack-cake", "6 pz"],
    ["Crema di arachidi", "jam", "350 g"],
    ["Sciroppo d'agave", "honey", "250 ml"],
  ],
  "dolci-snack": [
    ["Cioccolato bianco", "chocolate", "100 g"],
    ["Praline", "chocolate", "200 g"],
    ["Marshmallow", "candy", "200 g"],
    ["Liquirizia", "candy", "100 g"],
    ["Crostata", "cake", "400 g"],
    ["Pan di Spagna", "cake", "300 g"],
    ["Gelatine alla frutta", "candy", "200 g"],
  ],
  "caffe-the": [
    ["Caffè decaffeinato", "coffee", "250 g"],
    ["Tè Earl Grey", "tea", "25 filtri"],
    ["Infuso ai frutti rossi", "tea", "20 filtri"],
    ["Tisana digestiva", "tea", "20 filtri"],
    ["Dolcificante", "sugar", "100 compresse"],
  ],
  aperitivo: [
    ["Nachos", "chips", "150 g"],
    ["Cracker integrali", "cracker", "250 g"],
    ["Grissini al sesamo", "breadstick", "250 g"],
    ["Lupini", "beans", "300 g"],
    ["Anacardi salati", "peanut", "150 g"],
    ["Mix aperitivo", "peanut", "200 g"],
  ],
  "aperitivi-cocktail": [
    ["Aperol", "wine", "70 cl"],
    ["Campari", "wine", "70 cl"],
    ["Campari Soda", "wine", "10x10 cl"],
    ["Crodino", "wine", "10x10 cl"],
    ["Sanbittèr", "wine", "10x10 cl"],
    ["Select", "wine", "70 cl"],
    ["Cynar", "wine", "70 cl"],
    ["Martini Rosso", "wine", "1 L"],
    ["Martini Bianco", "wine", "1 L"],
    ["Gin", "wine", "70 cl"],
    ["Vodka", "wine", "70 cl"],
    ["Rum bianco", "wine", "70 cl"],
    ["Soda per cocktail", "soda", "1 L"],
    ["Sciroppo di granatina", "soda", "500 ml"],
    ["Cocktail analcolico", "wine", "750 ml"],
  ],
  bevande: [
    ["Coca-Cola Zero", "soda", "1,5 L"],
    ["Pepsi", "soda", "1,5 L"],
    ["Fanta", "soda", "1,5 L"],
    ["Sprite", "soda", "1,5 L"],
    ["Chinò Sanpellegrino", "soda", "1,2 L"],
    ["Estathé al limone", "soda", "1,5 L"],
    ["Estathé alla pesca", "soda", "1,5 L"],
    ["Red Bull", "soda", "250 ml"],
    ["Monster Energy", "soda", "500 ml"],
    ["Schweppes tonica", "soda", "1 L"],
    ["Schweppes al limone", "soda", "1 L"],
    ["Ginger ale", "soda", "1 L"],
    ["Limonata", "soda", "1,5 L"],
    ["Gassosa", "soda", "1,5 L"],
    ["Succo di mela", "juice", "1 L"],
    ["Succo di pera", "juice", "1 L"],
    ["Acqua tonica", "soda", "1 L"],
    ["Succo ACE", "juice", "1 L"],
    ["Succo multifrutta", "juice", "1 L"],
  ],
  acqua: [
    ["Acqua oligominerale", "water", "6x1,5 L"],
    ["Acqua aromatizzata al limone", "water", "1,5 L"],
    ["Acqua aromatizzata alla frutta", "water", "1,5 L"],
  ],
  "vini-birre": [
    ["Vino rosso", "wine", "750 ml"],
    ["Vino bianco", "wine", "750 ml"],
    ["Vino rosato", "wine", "750 ml"],
    ["Birra rossa", "beer", "6x33 cl"],
    ["Birra scura", "beer", "6x33 cl"],
    ["Birra analcolica", "beer", "6x33 cl"],
  ],
  "mondo-bimbo": [
    ["Pastina per bambini", "baby-food", "320 g"],
    ["Crema di riso per bambini", "baby-food", "200 g"],
    ["Purea di verdure per bambini", "baby-food", "2x100 g"],
  ],
  vegetariano: [
    ["Tempeh", "tofu", "200 g"],
    ["Bevanda d'avena", "soy-milk", "1 L"],
    ["Burger di legumi", "veg-burger", "2 pz"],
    ["Falafel", "veg-burger", "200 g"],
    ["Edamame", "beans", "300 g"],
    ["Lievito alimentare", "flour", "100 g"],
  ],
  "frutta-secca": [
    ["Anacardi", "nut", "150 g"],
    ["Pinoli", "nut", "100 g"],
    ["Prugne secche", "raisin", "250 g"],
    ["Semi di girasole", "seed", "150 g"],
    ["Pistacchi non salati", "nut", "150 g"],
  ],
  spezie: [
    ["Rosmarino", "herb", "20 g"],
    ["Timo", "herb", "20 g"],
    ["Curcuma", "pepper-spice", "40 g"],
    ["Cumino", "pepper-spice", "40 g"],
    ["Peperoncino", "pepper-spice", "30 g"],
    ["Vaniglia", "herb", "2 bacche"],
  ],
};

const SEARCH_ALIASES: Record<string, readonly string[]> = {
  "Vino rosso": [
    "Chianti",
    "Montepulciano d'Abruzzo",
    "Barbera",
    "Barbaresco",
    "Barolo",
    "Brunello di Montalcino",
    "Nero d'Avola",
    "Primitivo",
    "Amarone",
    "Valpolicella",
    "Cannonau",
    "Morellino",
    "Cabernet Sauvignon",
    "Merlot",
    "Pinot nero",
  ],
  "Vino bianco": [
    "Chardonnay",
    "Pinot grigio",
    "Sauvignon",
    "Vermentino",
    "Falanghina",
    "Greco di Tufo",
    "Gewürztraminer",
    "Ribolla gialla",
    "Soave",
  ],
  "Vino rosato": ["Rosé", "Cerasuolo", "Chiaretto"],
  Prosecco: ["Valdobbiadene", "Glera", "Prosecco brut", "Prosecco extra dry"],
  "Birra chiara": [
    "lager",
    "pils",
    "pilsner",
    "helles",
    "blanche",
    "weiss",
    "Moretti",
    "Peroni",
    "Ichnusa",
    "Heineken",
    "Corona",
  ],
  "Birra artigianale": ["IPA", "APA", "India Pale Ale", "saison", "craft beer"],
  "Birra rossa": ["birra ambrata", "red ale", "amber ale"],
  "Birra scura": ["stout", "porter", "dunkel", "Guinness"],
  "Birra analcolica": ["birra zero", "birra senza alcol", "alcohol free beer"],
  Branzino: ["spigola"],
  Polpo: ["polipo"],
  Gamberi: ["gamberetti", "mazzancolle"],
  Cozze: ["mitili"],
  "Prosciutto crudo": ["crudo"],
  "Prosciutto cotto": ["cotto"],
  "Grana grattugiato": ["grana"],
  "Pane in cassetta": ["pancarrè", "pan carré"],
  "Pomodori ciliegino": ["pachino", "datterini"],
  "Macinato di manzo": ["macinata", "carne trita"],
  Hamburger: ["svizzera"],
  "Latte senza lattosio": ["latte HD", "latte ad alta digeribilità"],
  "Caffè macinato": ["moka"],
  "Caffè decaffeinato": ["deca", "decaffeinato"],
  "Olio extravergine di oliva": ["EVO"],
  "Olio di arachidi": ["olio per friggere"],
  "Rotoloni da cucina": ["carta cucina", "Scottex"],
  "Pellicola trasparente": ["Domopak"],
  "Detersivo piatti": ["Svelto"],
  "Detersivo lavatrice liquido": ["Dash", "Dixan"],
  Ammorbidente: ["Coccolino"],
  "Fazzoletti di carta": ["Kleenex", "Tempo"],
};

/** Ricerche di intento: una parola utile deve proporre piu' prodotti ordinati. */
const SEARCH_GROUPS: Record<string, readonly string[]> = {
  "latte vegetale": ["Latte di soia", "Latte di mandorla", "Bevanda d'avena"],
  insalata: ["Insalata iceberg", "Rucola", "Radicchio"],
  formaggio: [
    "Mozzarella",
    "Stracchino",
    "Gorgonzola",
    "Feta",
    "Taleggio",
    "Pecorino",
    "Emmental",
    "Formaggio caprino",
    "Formaggio spalmabile",
  ],
  affettato: [
    "Prosciutto cotto",
    "Prosciutto crudo",
    "Mortadella",
    "Salame Milano",
    "Speck",
    "Bresaola",
    "Coppa",
    "Fesa di tacchino",
  ],
  "pesce azzurro": ["Alici", "Sardine", "Filetti di sgombro", "Sgombro in scatola"],
  "frutti di mare": ["Cozze", "Vongole", "Calamari", "Insalata di mare", "Gamberi", "Polpo", "Seppie"],
  "verdure surgelate": [
    "Spinaci surgelati",
    "Piselli surgelati",
    "Broccoli surgelati",
    "Fagiolini surgelati",
    "Verdure grigliate surgelate",
    "Funghi surgelati",
  ],
  aperitivo: ["Aperol", "Campari", "Crodino", "Sanbittèr", "Select", "Prosecco", "Patatine classiche", "Olive taggiasche"],
  spritz: ["Spritz pronto", "Aperol", "Campari", "Select", "Prosecco", "Soda per cocktail"],
  colazione: ["Latte parzialmente scremato", "Caffè macinato", "Biscotti frollini", "Corn flakes", "Fette biscottate"],
  barbecue: ["Salsiccia", "Hamburger", "Costine di maiale", "Salsa barbecue"],
  pizza: ["Pizza margherita surgelata", "Mozzarella", "Passata di pomodoro", "Farina 00", "Lievito di birra secco"],
};

const PRODUCT_NAME_BY_ALIAS = new Map(
  Object.entries(SEARCH_ALIASES).flatMap(([name, aliases]) =>
    aliases.map((alias) => [normalizeSearchText(alias), name] as const),
  ),
);

export function productNameForAlias(value: string): string | undefined {
  return PRODUCT_NAME_BY_ALIAS.get(normalizeSearchText(value));
}

const PRODUCT_NAMES_BY_GROUP = new Map(
  Object.entries(SEARCH_GROUPS).map(([term, names]) => [normalizeSearchText(term), names] as const),
);

const GROUP_TERMS_BY_PRODUCT = new Map<string, string[]>();
for (const [term, names] of Object.entries(SEARCH_GROUPS)) {
  for (const name of names) {
    GROUP_TERMS_BY_PRODUCT.set(name, [...(GROUP_TERMS_BY_PRODUCT.get(name) ?? []), term]);
  }
}

export function productNamesForSearch(value: string): readonly string[] {
  const normalized = normalizeSearchText(value);
  const direct = PRODUCT_NAME_BY_ALIAS.get(normalized);
  if (direct) return [direct];
  return PRODUCT_NAMES_BY_GROUP.get(normalized) ?? [];
}

function rowsOf(catalog: Record<string, Row[]>): ProductSeed[] {
  return Object.entries(catalog).flatMap(([categorySlug, rows]) =>
    rows.map(([name, iconKey, size, brand]) => ({
      name,
      categorySlug,
      iconKey,
      size,
      brand,
      aliases: [...(SEARCH_ALIASES[name] ?? []), ...(GROUP_TERMS_BY_PRODUCT.get(name) ?? [])],
    })),
  );
}

export const PRODUCTS: ProductSeed[] = [...rowsOf(CATALOG), ...rowsOf(EXPANSION)];

/** Slug stabile e testo normalizzato per la ricerca fuzzy. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function searchTextOf(product: {
  name: string;
  brand?: string;
  size?: string;
  aliases?: readonly string[];
}): string {
  return normalizeSearchText([product.name, product.brand, ...(product.aliases ?? [])].filter(Boolean).join(" "));
}
