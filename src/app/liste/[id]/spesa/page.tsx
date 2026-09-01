import { notFound, redirect } from "next/navigation";
import { ShopMode, type PickLocation } from "@/components/route/ShopMode";
import { prisma } from "@/lib/db";
import { getList, getMapData, getStore } from "@/lib/queries";
import { requireUser } from "@/lib/auth/session";
import type { RouteSnapshot } from "@/lib/route-types";

export const dynamic = "force-dynamic";

export default async function ShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const list = await getList(id, user.id);
  if (!list) notFound();
  const [map, store] = await Promise.all([getMapData(list.storeId), getStore()]);

  if (!list.route) redirect(`/liste/${id}`);

  const snapshot = list.route.stops as unknown as RouteSnapshot;
  const checked = Object.fromEntries(list.items.map((item) => [item.id, item.checked]));

  const locations = await prisma.location.findMany({
    where: { storeId: store.id },
    include: { aisle: true },
    orderBy: [{ aisle: { sequence: "asc" } }, { bay: "asc" }],
  });

  const pickLocations: PickLocation[] = locations.map((location) => ({
    id: location.id,
    aisleName: location.aisle.name,
    label: location.label ?? location.aisle.name,
    accessX: location.accessX,
    accessY: location.accessY,
  }));

  return (
    <main className="mx-auto w-full max-w-lg">
      <ShopMode
        listId={list.id}
        listName={list.name}
        storeId={list.storeId}
        canEdit={user.role === "admin"}
        stops={snapshot.stops}
        path={list.route.path as number[][]}
        checked={checked}
        locations={pickLocations}
        map={map}
      />
    </main>
  );
}
