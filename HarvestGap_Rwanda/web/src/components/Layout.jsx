import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

export const NAV = [
  { to: "/", label: "Overview" },
  { to: "/my-farm", label: "My Farm" },
  { to: "/irrigation", label: "Irrigation" },
  { to: "/soil-fertility", label: "Soil & Fertility" },
  { to: "/productivity", label: "Productivity" },
  { to: "/post-harvest", label: "Post-harvest & Value" },
  { to: "/exports", label: "Exports" },
  { to: "/districts", label: "Districts" },
  { to: "/about", label: "About & Method" },
];

export function Logo({ light = false }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="38" height="38" viewBox="0 0 40 40" aria-hidden="true">
        <rect width="40" height="40" rx="11" fill={light ? "#ffffff" : "#0a5ca8"} />
        <path d="M11 29V20M17 29V14M23 29V18M29 29V11" stroke={light ? "#0a5ca8" : "#fff"} strokeWidth="3.2" strokeLinecap="round" />
        <path d="M29 11c-4 0-7 2-7 6 4 0 7-2 7-6Z" fill={light ? "#4aa8e0" : "#9fd3f5"} />
      </svg>
      <span>
        <b className={`block font-display text-[19px] leading-none ${light ? "text-white" : "text-nisr-navy"}`}>
          Harvest<span className={light ? "text-[#9fd3f5]" : "text-nisr-blue"}>Gap</span>
        </b>
        <small className={`mt-1 block text-[11px] font-semibold tracking-wide ${light ? "text-[#c9d8ec]" : "text-nisr-muted"}`}>RWANDA · AHS 2024</small>
      </span>
    </span>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  const linkClass = ({ isActive }) =>
    `whitespace-nowrap px-3 py-2 text-[15px] font-semibold transition-colors ${
      isActive ? "text-nisr-blue shadow-[inset_0_-3px_0_#0a5ca8]" : "text-nisr-navy hover:text-nisr-blue"
    }`;
  return (
    <header className="sticky top-0 z-30 border-b border-nisr-line bg-white/95 backdrop-blur">
      <div className="wrap flex h-[70px] items-center gap-6">
        <Link to="/" aria-label="HarvestGap Rwanda home"><Logo /></Link>
        <nav className="ml-auto hidden h-full items-stretch xl:flex" aria-label="Main">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={(s) => `${linkClass(s)} flex items-center`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-xl border border-nisr-line text-nisr-navy xl:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {open && (
        <nav className="border-t border-nisr-line bg-white xl:hidden" aria-label="Main">
          <div className="wrap grid gap-1 py-3 sm:grid-cols-2">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === "/"}
                className={({ isActive }) => `rounded-lg px-3 py-2.5 font-semibold ${isActive ? "bg-nisr-mist text-nisr-blue" : "text-nisr-navy"}`}>
                {n.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-nisr-navy text-[15px] text-[#c9d8ec]">
      <div className="wrap grid gap-8 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-sm">
            Built with the NISR Agricultural Household Survey (AHS) 2024. Findings are links seen in survey data, not guaranteed results.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-base text-white">Explore</h4>
          <ul className="grid gap-1.5">
            {NAV.slice(1, 7).map((n) => <li key={n.to}><Link className="hover:text-white" to={n.to}>{n.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-base text-white">About</h4>
          <ul className="grid gap-1.5">
            <li><Link className="hover:text-white" to="/districts">All 30 districts</Link></li>
            <li><Link className="hover:text-white" to="/about">Data &amp; method</Link></li>
            <li>District boundaries: geoBoundaries / Open Data Rwanda (CC BY 4.0)</li>
            <li>NISR Big Data Hackathon 2026 · Track 1</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  );
}
