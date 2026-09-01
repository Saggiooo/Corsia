-- CreateEnum
CREATE TYPE "FixtureKind" AS ENUM ('shelf', 'counter', 'fridge', 'freezer', 'checkout', 'entrance', 'wall', 'promo');

-- CreateEnum
CREATE TYPE "PickClass" AS ENUM ('normal', 'fragile', 'chilled', 'frozen');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('guessed', 'confirmed');

-- CreateEnum
CREATE TYPE "ListStatus" AS ENUM ('draft', 'routed', 'shopping', 'done');

-- CreateEnum
CREATE TYPE "RouteMode" AS ENUM ('shortest', 'coldchain');

-- CreateEnum
CREATE TYPE "Side" AS ENUM ('L', 'R');

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "gridW" INTEGER NOT NULL,
    "gridH" INTEGER NOT NULL,
    "cellSizeCm" INTEGER NOT NULL DEFAULT 50,
    "grid" JSONB NOT NULL,
    "entranceX" INTEGER NOT NULL,
    "entranceY" INTEGER NOT NULL,
    "checkoutX" INTEGER NOT NULL,
    "checkoutY" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aisle" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "vertical" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Aisle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fixture" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "aisleId" TEXT,
    "kind" "FixtureKind" NOT NULL,
    "label" TEXT,
    "colorToken" TEXT,
    "cells" JSONB NOT NULL,

    CONSTRAINT "Fixture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "aisleId" TEXT NOT NULL,
    "fixtureId" TEXT,
    "side" "Side" NOT NULL,
    "bay" INTEGER NOT NULL,
    "accessX" INTEGER NOT NULL,
    "accessY" INTEGER NOT NULL,
    "label" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconKey" TEXT NOT NULL,
    "colorToken" TEXT NOT NULL,
    "pickClass" "PickClass" NOT NULL DEFAULT 'normal',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "defaultLocationId" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "size" TEXT,
    "ean" TEXT,
    "categoryId" TEXT NOT NULL,
    "iconKey" TEXT,
    "sourceUrl" TEXT,
    "searchText" TEXT NOT NULL,
    "timesBought" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Placement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "level" INTEGER,
    "confidence" "Confidence" NOT NULL DEFAULT 'guessed',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ListStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "productId" TEXT,
    "rawText" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "note" TEXT,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "sortIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "mode" "RouteMode" NOT NULL,
    "stops" JSONB NOT NULL,
    "path" JSONB NOT NULL,
    "distanceM" INTEGER NOT NULL,
    "estMinutes" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "routeMode" "RouteMode" NOT NULL DEFAULT 'coldchain',
    "walkSpeedMs" DOUBLE PRECISION NOT NULL DEFAULT 1.1,
    "secondsPerPick" INTEGER NOT NULL DEFAULT 20,
    "haptics" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_slug_key" ON "Store"("slug");

-- CreateIndex
CREATE INDEX "Aisle_storeId_sequence_idx" ON "Aisle"("storeId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "Aisle_storeId_number_key" ON "Aisle"("storeId", "number");

-- CreateIndex
CREATE INDEX "Fixture_storeId_idx" ON "Fixture"("storeId");

-- CreateIndex
CREATE INDEX "Location_storeId_idx" ON "Location"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_storeId_aisleId_side_bay_key" ON "Location"("storeId", "aisleId", "side", "bay");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_ean_key" ON "Product"("ean");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Placement_locationId_idx" ON "Placement"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "Placement_productId_storeId_key" ON "Placement"("productId", "storeId");

-- CreateIndex
CREATE INDEX "List_storeId_createdAt_idx" ON "List"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "ListItem_listId_idx" ON "ListItem"("listId");

-- CreateIndex
CREATE UNIQUE INDEX "Route_listId_key" ON "Route"("listId");

-- AddForeignKey
ALTER TABLE "Aisle" ADD CONSTRAINT "Aisle_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fixture" ADD CONSTRAINT "Fixture_aisleId_fkey" FOREIGN KEY ("aisleId") REFERENCES "Aisle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_aisleId_fkey" FOREIGN KEY ("aisleId") REFERENCES "Aisle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_defaultLocationId_fkey" FOREIGN KEY ("defaultLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "List" ADD CONSTRAINT "List_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE CASCADE ON UPDATE CASCADE;
