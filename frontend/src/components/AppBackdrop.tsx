import { PlaceImage } from "./PlaceImage";

/**
 * Rendered once in App.tsx, outside <Routes>, so the photo never re-mounts/flickers
 * on navigation — the same backdrop pulls through every page.
 */
export function AppBackdrop() {
  return (
    <div className="fixed inset-0 -z-10">
      <PlaceImage query="Positano Amalfi Küste" width={1920} className="h-full w-full" />
      <div className="absolute inset-0 bg-pm-espresso opacity-70" />
    </div>
  );
}
