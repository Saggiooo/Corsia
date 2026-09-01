import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { searchProducts, type SearchHit } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const category = url.searchParams.get("category")?.trim() ?? "";

  if (category) {
    const rows = await prisma.product.findMany({
      where: { category: { slug: category } },
      orderBy: [{ timesBought: "desc" }, { name: "asc" }],
      include: {
        category: true,
        placements: { include: { location: { include: { aisle: true } } } },
      },
    });

    const hits: SearchHit[] = rows.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      size: p.size,
      iconKey: p.iconKey,
      categoryName: p.category.name,
      categoryIcon: p.category.iconKey,
      colorToken: p.category.colorToken,
      aisleName: p.placements[0]?.location.aisle.name ?? null,
      locationLabel: p.placements[0]?.location.label ?? null,
      confirmed: p.placements[0]?.confidence === "confirmed",
    }));

    return NextResponse.json({ hits });
  }

  return NextResponse.json({ hits: await searchProducts(query) });
}
