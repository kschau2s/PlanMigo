import { useQueryClient } from "@tanstack/react-query";
import {
  Compass,
  LogIn,
  LogOut,
  Map,
  Menu,
  PlaneTakeoff,
  Plus,
  Settings,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import logo from "../assets/planmigo-logo.svg";
import { AuthModal } from "./AuthModal";
import { useAuth } from "../hooks/useAuth";
import { useMyTrips } from "../hooks/useTripPlan";
import { PlaceImage } from "./PlaceImage";
import { destinationQuery } from "../lib/images";

const MAX_SIDEBAR_TRIPS = 5;

interface NavItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

function NavItem({ to, label, icon: Icon, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-button border px-3 py-2 text-caption font-semibold transition-colors duration-quick ease-brand ${
          isActive
            ? "border-accent-secondary bg-pm-sand text-accent-primary"
            : "border-transparent text-content-body hover:border-card hover:bg-pm-paper hover:text-accent-secondary"
        }`
      }
    >
      <span className="grid h-[28px] w-[28px] place-items-center rounded-button bg-surface-card">
        <Icon size={14} />
      </span>
      {label}
    </NavLink>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-2 mt-5 px-3 text-[10px] font-semibold uppercase tracking-wider text-content-muted">
      {children}
    </p>
  );
}

function TripsSection({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { user, isLoading: authLoading } = useAuth();
  const { data: trips, isLoading } = useMyTrips(Boolean(user));

  if (authLoading) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={onOpenAuth}
        className="mx-3 text-left text-caption text-content-muted hover:text-accent-primary"
      >
        Melde dich an, um deine Reisen zu sehen.
      </button>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-2">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-accent-secondary border-t-surface-card" />
      </div>
    );
  }

  if (!trips || trips.length === 0) {
    return <p className="px-3 text-caption text-content-muted">Noch keine Reise geplant.</p>;
  }

  return (
    <div className="space-y-1">
      {trips.slice(0, MAX_SIDEBAR_TRIPS).map((trip) => (
        <NavLink
          key={trip.id}
          to={`/trip/${trip.id}`}
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-button px-3 py-1.5 text-caption transition-colors duration-quick ease-brand ${
              isActive
                ? "bg-pm-sand font-semibold text-accent-primary"
                : "text-content-body hover:bg-pm-paper hover:text-accent-secondary"
            }`
          }
        >
          <PlaceImage
            query={destinationQuery(trip.destination)}
            width={120}
            className="h-[28px] w-[28px] shrink-0 rounded-full"
          />
          <span className="truncate">{trip.destination}</span>
        </NavLink>
      ))}
      {trips.length > MAX_SIDEBAR_TRIPS && (
        <Link
          to="/trips"
          className="block px-3 py-1 text-caption font-semibold text-accent-primary hover:underline"
        >
          Alle {trips.length} Reisen anzeigen →
        </Link>
      )}
    </div>
  );
}

function AccountSection({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { user, isLoading, logout } = useAuth();
  const queryClient = useQueryClient();

  if (isLoading) return null;

  if (!user) {
    return (
      <button
        type="button"
        onClick={onOpenAuth}
        className="flex w-full items-center justify-center gap-2 rounded-button bg-accent-primary px-3 py-2.5 text-caption font-semibold text-pm-white shadow-soft transition-opacity duration-quick ease-brand hover:opacity-90"
      >
        <LogIn size={14} />
        Anmelden / Registrieren
      </button>
    );
  }

  const handleLogout = () => {
    logout();
    queryClient.removeQueries({ queryKey: ["my-trips"] });
  };

  return (
    <div className="rounded-card border border-card bg-pm-paper p-3">
      <div className="flex items-center gap-2">
        <span className="grid h-[32px] w-[32px] shrink-0 place-items-center rounded-full bg-accent-primary text-caption font-bold uppercase text-pm-white">
          {user.email.charAt(0)}
        </span>
        <span className="min-w-0 truncate text-caption font-semibold text-content-heading" title={user.email}>
          {user.email}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          to="/account"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-button border border-card bg-surface-card px-2 py-1.5 text-caption font-semibold text-content-body transition-colors duration-quick ease-brand hover:border-accent-secondary hover:text-accent-secondary"
        >
          <Settings size={13} />
          Konto
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          title="Abmelden"
          className="flex items-center justify-center rounded-button border border-card bg-surface-card px-2.5 py-1.5 text-content-body transition-colors duration-quick ease-brand hover:border-pm-terracotta hover:text-pm-terracotta"
        >
          <LogOut size={13} />
        </button>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const location = useLocation();

  // Mobile-Drawer nach Navigation schließen.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  const openAuth = () => setAuthModalOpen(true);

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Menü öffnen"
        className="fixed left-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-button border border-card bg-surface-card text-content-body shadow-card md:hidden"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-pm-espresso opacity-50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 h-screen w-72 border-r border-card bg-surface-card shadow-card transition-transform duration-quick ease-brand md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 px-1">
              <img src={logo} alt="" className="h-[32px] w-[32px]" />
              <span className="font-serif text-h2 font-bold leading-none tracking-headline">
                <span className="text-pm-terracotta">Plan</span>
                <span className="text-pm-sage">Migo</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Menü schließen"
              className="text-content-muted hover:text-accent-primary md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <Link
            to="/"
            className="flex items-center justify-center gap-2 rounded-button bg-accent-primary px-3 py-2.5 text-caption font-semibold text-pm-white shadow-soft transition-opacity duration-quick ease-brand hover:opacity-90"
          >
            <Plus size={14} />
            Neue Reise planen
          </Link>

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
            <SectionLabel>Entdecken</SectionLabel>
            <nav className="space-y-1">
              <NavItem to="/inspiration" label="Inspiration" icon={Compass} />
              <NavItem to="/flights" label="Günstigste Flüge" icon={PlaneTakeoff} />
            </nav>
            <Link
              to="/inspiration"
              className="group relative mt-3 block h-[110px] overflow-hidden rounded-card shadow-soft"
            >
              <PlaceImage
                query="Zermatt Matterhorn"
                width={330}
                className="absolute inset-0 h-full w-full transition-transform duration-base ease-brand group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-pm-espresso to-transparent opacity-90" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-pm-sandLight">
                  Reiseidee der Woche
                </p>
                <p className="font-serif text-body font-bold text-pm-cream">Alpine Ruhe · Zermatt</p>
              </div>
            </Link>

            <SectionLabel>Meine Reisen</SectionLabel>
            <nav className="space-y-1">
              <NavItem to="/trips" label="Alle Reisen" icon={Map} end />
            </nav>
            <div className="mt-2">
              <TripsSection onOpenAuth={openAuth} />
            </div>
          </div>

          <div className="pt-4">
            <SectionLabel>Konto</SectionLabel>
            <AccountSection onOpenAuth={openAuth} />
          </div>
        </div>
      </aside>

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </>
  );
}
