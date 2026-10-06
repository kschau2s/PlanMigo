import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import type { DestinationCandidate } from "../types/destination";

// Vite doesn't resolve Leaflet's default marker image URLs — point them at the bundled assets.
type IconDefaultWithPrivateUrl = typeof L.Icon.Default.prototype & { _getIconUrl?: unknown };
delete (L.Icon.Default.prototype as IconDefaultWithPrivateUrl)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function FitBounds({ destinations }: { destinations: DestinationCandidate[] }) {
  const map = useMap();

  useEffect(() => {
    if (destinations.length === 0) return;
    if (destinations.length === 1) {
      map.setView([destinations[0].lat, destinations[0].lng], 6);
      return;
    }
    const bounds = L.latLngBounds(destinations.map((d): [number, number] => [d.lat, d.lng]));
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [destinations, map]);

  return null;
}

interface DestinationMapProps {
  destinations: DestinationCandidate[];
}

export function DestinationMap({ destinations }: DestinationMapProps) {
  return (
    <MapContainer center={[48.2, 11.5]} zoom={4} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds destinations={destinations} />
      {destinations.map((d) => (
        <Marker key={d.id} position={[d.lat, d.lng]}>
          <Popup>
            <strong>
              {d.name}
              {d.country ? `, ${d.country}` : ""}
            </strong>
            {d.reason && <p>{d.reason}</p>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
