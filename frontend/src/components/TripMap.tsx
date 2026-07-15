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

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lon] as [number, number]));
    if (markers.length === 1) {
      map.setView(bounds.getCenter(), 6);
    } else {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
    }
  }, [map, markers]);
  return null;
}

/** World map (OpenStreetMap tiles) with the trip destinations pinned. */
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

  if (valid.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-card border border-card shadow-card">
      <MapContainer
        center={[valid[0].lat, valid[0].lon]}
        zoom={4}
        scrollWheelZoom={false}
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
        <FitBounds markers={valid} />
      </MapContainer>
    </div>
  );
}
