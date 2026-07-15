import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export interface MapMarker {
  lat: number;
  lon: number;
  label: string;
  /** true = destination-level marker (larger pin). */
  primary?: boolean;
}

const WORLD_CENTER: [number, number] = [25, 10];
const WORLD_ZOOM = 2;

// DivIcons styled via CSS classes so colors come from the design tokens.
const primaryIcon = L.divIcon({
  className: "",
  html: '<span class="pm-map-pin pm-map-pin-primary"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const secondaryIcon = L.divIcon({
  className: "",
  html: '<span class="pm-map-pin"></span>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

/** Flies to new markers (animated); returns to the world view when they clear. */
function FlyToMarkers({ markers, signature }: { markers: MapMarker[]; signature: string }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) {
      map.flyTo(WORLD_CENTER, WORLD_ZOOM, { duration: 1.0 });
      return;
    }
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lon] as [number, number]));
    if (markers.length === 1) {
      map.flyTo(bounds.getCenter(), 6, { duration: 1.4 });
    } else {
      map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 10, duration: 1.4 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, signature]);
  return null;
}

/** World map (OpenStreetMap tiles) — always visible; pins fly in as targets appear. */
export function TripMap({ markers }: { markers: MapMarker[] }) {
  const valid = useMemo(
    () =>
      markers.filter(
        (m) =>
          Number.isFinite(m.lat) &&
          Number.isFinite(m.lon) &&
          Math.abs(m.lat) <= 90 &&
          Math.abs(m.lon) <= 180,
      ),
    [markers],
  );
  const signature = valid.map((m) => `${m.lat},${m.lon}`).join("|");

  return (
    <div className="overflow-hidden rounded-card border border-card shadow-card">
      <MapContainer
        center={WORLD_CENTER}
        zoom={WORLD_ZOOM}
        minZoom={2}
        scrollWheelZoom={false}
        worldCopyJump
        className="h-[420px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {valid.map((marker, index) => (
          <Marker
            key={`${marker.label}-${index}`}
            position={[marker.lat, marker.lon]}
            icon={marker.primary ? primaryIcon : secondaryIcon}
          >
            <Popup>{marker.label}</Popup>
          </Marker>
        ))}
        <FlyToMarkers markers={valid} signature={signature} />
      </MapContainer>
    </div>
  );
}
