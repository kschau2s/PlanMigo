import { seededImage } from "../lib/images";

/**
 * Rendered once in App.tsx, outside <Routes>, so the photo never re-mounts/flickers
 * on navigation — the same backdrop pulls through every page.
 */
export function AppBackdrop() {
  return (
    <div className="fixed inset-0 -z-10">
      <img
        src={seededImage("travel-adventure-01", 1920, 1440)}
        alt=""
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-pm-espresso opacity-70" />
    </div>
  );
}
