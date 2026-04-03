import { useEffect, useState } from "react";
import { MapRoute } from "@/components/ui/map";
import type { LatLng } from "@/types/map";

interface RouteOverlayProps {
  /** User's current location */
  from: LatLng;
  /** Report / destination location */
  to: LatLng;
  /** Line colour */
  color?: string;
  /** Line width */
  width?: number;
  /** Called with distance (km) and duration (min) once route resolves */
  onRouteInfo?: (info: { distanceKm: number; durationMin: number }) => void;
}

/**
 * Fetches a real driving route from OSRM and draws it on the map.
 * Falls back to a straight line if OSRM is unreachable.
 */
export function RouteOverlay({
  from,
  to,
  color = "#4285F4",
  width = 5,
  onRouteInfo,
}: RouteOverlayProps) {
  const [coordinates, setCoordinates] = useState<[number, number][]>([
    [from.lng, from.lat],
    [to.lng, to.lat],
  ]);
  const [isRealRoute, setIsRealRoute] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchRoute() {
      try {
        const url =
          `https://router.project-osrm.org/route/v1/driving/` +
          `${from.lng},${from.lat};${to.lng},${to.lat}` +
          `?overview=full&geometries=geojson`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("OSRM request failed");

        const data = await res.json();
        if (data.code !== "Ok" || !data.routes?.[0]) throw new Error("No route");

        const route = data.routes[0];
        const coords: [number, number][] = route.geometry.coordinates;

        if (!cancelled) {
          setCoordinates(coords);
          setIsRealRoute(true);
          onRouteInfo?.({
            distanceKm: Math.round((route.distance / 1000) * 10) / 10,
            durationMin: Math.round(route.duration / 60),
          });
        }
      } catch {
        // Fallback: straight line
        if (!cancelled) {
          setCoordinates([
            [from.lng, from.lat],
            [to.lng, to.lat],
          ]);
          setIsRealRoute(false);
        }
      }
    }

    fetchRoute();
    return () => { cancelled = true; };
  }, [from.lat, from.lng, to.lat, to.lng, onRouteInfo]);

  return (
    <MapRoute
      coordinates={coordinates}
      color={color}
      width={width}
      opacity={0.85}
      dashArray={isRealRoute ? undefined : [2, 2]}
    />
  );
}

export default RouteOverlay;
