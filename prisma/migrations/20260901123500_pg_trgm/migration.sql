-- Ricerca fuzzy sui nomi prodotto.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Product_searchText_trgm_idx"
  ON "Product" USING GIN ("searchText" gin_trgm_ops);
