import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { BarChart3, ChevronDown, Compass, Droplets, Globe2, Home, Info, Landmark, MapPin, MapPinned, MessageCircle, Package, Pencil, Sprout, Wheat, X } from "lucide-react";
import { useFarm } from "../farm";

/** Plain-language entries; each also names the Track 1 challenge area it covers. */
export const HELP_TOPICS = [
  { to: "/irrigation", icon: Droplets, label: "Water for my crops", text: "Where water is missing, and how farmers get it", challenge: "Small-scale irrigation" },
  { to: "/soil-fertility", icon: Sprout, label: "Improve my soil", text: "Fertilizer, manure and stopping erosion", challenge: "Soil conservation & fertility" },
  { to: "/productivity", icon: BarChart3, label: "Compare harvests", text: "How much each district harvests, crop by crop", challenge: "Agricultural productivity" },
  { to: "/post-harvest", icon: Package, label: "Store and sell my harvest", text: "Keep crops from spoiling and earn more from them", challenge: "Post-harvest, processing & value addition" },
  { to: "/exports", icon: Globe2, label: "Crops for export", text: "Coffee, avocado and other crops sold abroad", challenge: "Export market opportunities" },
];
export const PLACES = [
  { to: "/districts", icon: MapPinned, label: "My district", text: "Everything about farming in one district" },
  { to: "/rwanda", icon: Compass, label: "Rwanda at a glance", text: "The big picture for all 30 districts" },
  { to: "/rwanda#where-to-act", icon: Landmark, label: "Where to invest", text: "Districts that need water, inputs or training most" },
  { to: "/about", icon: Info, label: "Where the numbers come from", text: "The NISR survey and how we used it" },
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
        <small className={`mt-1 text-[11px] tracking-wide ${light ? "block text-[#c9d8ec]" : "hidden text-nisr-muted sm:block"}`}>RWANDA · NISR AHS 2024</small>
      </span>
    </span>
  );
}

/** "📍 Musanze · Maize ✎": the remembered farm, or an invitation to set it. */
function FarmChip() {
  const { farm } = useFarm();
  return (
    <Link to="/my-farm" className="flex min-w-0 items-center gap-2 rounded-full border border-nisr-line bg-nisr-mist px-3 py-2 text-sm font-semibold text-nisr-navy hover:border-nisr-blue sm:px-3.5">
      <MapPin size={16} className="text-nisr-blue" />
      {farm.district ? <span className="max-w-[150px] truncate sm:max-w-[200px]">{farm.district}{farm.crop ? ` · ${farm.crop}` : ""}</span> : <span>Set my farm</span>}
      {farm.district && <Pencil size={14} className="hidden shrink-0 text-nisr-muted sm:block" />}
    </Link>
  );
}

function InfoPanel({ onClose }) {
  const item = (x) => (
    <Link key={x.label} to={x.to} onClick={onClose} className="flex gap-3 rounded-xl p-3 hover:bg-nisr-mist">
      <x.icon size={22} className="mt-0.5 shrink-0 text-nisr-blue" />
      <span>
        <span className="block font-semibold text-nisr-navy">{x.label}</span>
        <span className="block text-sm text-nisr-muted">{x.text}</span>
        {x.challenge && <span className="mt-1 inline-block rounded bg-[#e3eef9] px-1.5 py-0.5 text-[11px] font-semibold text-nisr-blue">Challenge area: {x.challenge}</span>}
      </span>
    </Link>
  );
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <p className="eyebrow mb-2 px-3">What do you need help with?</p>
        {HELP_TOPICS.map(item)}
      </div>
      <div>
        <p className="eyebrow mb-2 px-3">Look up a place</p>
        {PLACES.map(item)}
        <button onClick={onClose} className="mt-3 hidden w-full items-center justify-center gap-2 rounded-xl border border-nisr-line py-2.5 text-sm font-semibold text-nisr-muted md:flex"><X size={16} /> Close</button>
      </div>
    </div>
  );
}

function Header({ panelOpen, setPanelOpen }) {
  const panelRef = useRef(null);
  useEffect(() => {
    if (!panelOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setPanelOpen(false); };
    const onClick = (e) => { if (panelRef.current && !panelRef.current.contains(e.target) && !e.target.closest("[data-info-toggle]")) setPanelOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [panelOpen, setPanelOpen]);

  const link = ({ isActive }) => `flex items-center gap-2 rounded-full px-4 py-2 text-[15px] font-semibold transition-colors ${isActive ? "bg-nisr-blue text-white" : "text-nisr-navy hover:bg-nisr-mist"}`;
  return (
    <header className="sticky top-0 z-30 border-b border-nisr-line bg-white/95 backdrop-blur">
      <div className="wrap flex h-[70px] items-center gap-4">
        <Link to="/" aria-label="HarvestGap Rwanda home"><Logo /></Link>
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Main">
          <NavLink to="/" end className={link}><MessageCircle size={18} /> Ask a question</NavLink>
          <NavLink to="/my-farm" className={link}><Wheat size={18} /> Estimate my harvest</NavLink>
          <button data-info-toggle aria-expanded={panelOpen} onClick={() => setPanelOpen(!panelOpen)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-[15px] font-semibold ${panelOpen ? "bg-nisr-mist text-nisr-blue" : "text-nisr-navy hover:bg-nisr-mist"}`}>
            <Compass size={18} /> Find information <ChevronDown size={16} className={`transition-transform ${panelOpen ? "rotate-180" : ""}`} />
          </button>
        </nav>
        <div className="ml-auto min-w-0"><FarmChip /></div>
      </div>
      {panelOpen && (
        <div ref={panelRef} className="absolute inset-x-0 top-[70px] hidden border-b border-nisr-line bg-white shadow-card lg:block">
          <div className="wrap max-h-[calc(100vh-140px)] overflow-auto py-5"><InfoPanel onClose={() => setPanelOpen(false)} /></div>
        </div>
      )}
    </header>
  );
}

/** App-style bar on phones. */
function BottomBar({ panelOpen, setPanelOpen }) {
  const tab = ({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[12px] font-semibold ${isActive && !panelOpen ? "text-nisr-blue" : "text-nisr-muted"}`;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-nisr-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Main">
      <NavLink to="/" end className={tab} onClick={() => setPanelOpen(false)}><Home size={22} /> Home</NavLink>
      <NavLink to="/?ask=1" className={() => tab({ isActive: false })} onClick={() => setPanelOpen(false)}><MessageCircle size={22} /> Ask</NavLink>
      <NavLink to="/my-farm" className={tab} onClick={() => setPanelOpen(false)}><Wheat size={22} /> My harvest</NavLink>
      <button data-info-toggle className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[12px] font-semibold ${panelOpen ? "text-nisr-blue" : "text-nisr-muted"}`} onClick={() => setPanelOpen(!panelOpen)}>
        <Compass size={22} /> Information
      </button>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-nisr-navy pb-20 text-[15px] text-[#c9d8ec] lg:pb-0">
      <div className="wrap grid gap-8 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-sm">
            Built with the NISR Agricultural Household Survey (AHS) 2024. Answers show what the survey found on similar farms, not guaranteed results.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-base text-white">Get help with</h4>
          <ul className="grid gap-1.5">{HELP_TOPICS.map((n) => <li key={n.to}><Link className="hover:text-white" to={n.to}>{n.label}</Link></li>)}</ul>
        </div>
        <div>
          <h4 className="mb-3 text-base text-white">Look up</h4>
          <ul className="grid gap-1.5">
            {PLACES.map((n) => <li key={n.label}><Link className="hover:text-white" to={n.to}>{n.label}</Link></li>)}
            <li className="pt-2 text-sm">NISR Big Data Hackathon 2026 · Track 1: Agricultural Productivity</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname, hash } = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);
  useEffect(() => { setPanelOpen(false); }, [pathname, hash]);
  useEffect(() => {
    if (hash) {
      // Wait for the page to render, then bring the named section into view.
      const t = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" }), 80);
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
    return undefined;
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header panelOpen={panelOpen} setPanelOpen={setPanelOpen} />
      {/* Phone: the information panel opens as a sheet above the bottom bar */}
      {panelOpen && (
        <div className="fixed inset-x-0 bottom-[60px] top-[70px] z-30 overflow-auto bg-white p-4 lg:hidden">
          <InfoPanel onClose={() => setPanelOpen(false)} />
        </div>
      )}
      <main className="flex-1 pb-16 lg:pb-0"><Outlet /></main>
      <Footer />
      <BottomBar panelOpen={panelOpen} setPanelOpen={setPanelOpen} />
    </div>
  );
}
