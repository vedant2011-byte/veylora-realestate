import type { Property } from "@/lib/types";
import PropertyCard from "./PropertyCard";

export default function PropertyGrid({
  properties,
  columns = 3,
}: {
  properties: Property[];
  columns?: 2 | 3;
}) {
  return (
    <div
      className={
        columns === 2
          ? "grid grid-cols-1 gap-6 sm:grid-cols-2"
          : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      }
    >
      {properties.map((p, i) => (
        <PropertyCard key={p.slug} p={p} eager={i < 3} />
      ))}
    </div>
  );
}
