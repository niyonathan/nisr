import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../data";

const SHADES = ["#dbe9f7", "#a9cbee", "#6fa6dc", "#2f78c2", "#0a4f94"];
const NONE = "#eceff3";
const W = 600, H = 520;

/** Rounded cut points that split districts into five roughly equal groups. */
function cutsFor(values) {
  const v = [...values].sort((a, b) => a - b);
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  const top = v[v.length - 1];
  const step = top <= 1 ? 0.01 : top < 3000 ? 100 : top < 15000 ? 500 : 1000;
  const cuts = [0.2, 0.4, 0.6, 0.8].map((p) => Math.round(q(p) / step) * step);
  return [...new Set(cuts)].filter((c) => c > 0);
}

/**
 * Choropleth of Rwanda's 30 districts.
 * values: { [district]: number | null }, format: number → label.
 * Clicking a district opens its profile unless onSelect is given.
 */
export default function RwandaMap({ values, format, selected, onSelect, caption }) {
  const { geo } = useData();
  const navigate = useNavigate();
  const box = useRef(null);
  const [tip, setTip] = useState(null);

  const paths = useMemo(() => {
    const pts = geo.features.flatMap((f) => f.geometry.coordinates.flat());
    const [x0, x1] = [Math.min(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[0]))];
    const [y0, y1] = [Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[1]))];
    const k = Math.cos(((y0 + y1) / 2) * (Math.PI / 180));
    const s = Math.min((W - 20) / ((x1 - x0) * k), (H - 20) / (y1 - y0));
    const ox = (W - (x1 - x0) * k * s) / 2, oy = (H - (y1 - y0) * s) / 2;
    const proj = ([lon, lat]) => [ox + (lon - x0) * k * s, oy + (y1 - lat) * s];
    return geo.features.map((f) => ({
      district: f.properties.district,
      d: f.geometry.coordinates.map((r) => "M" + r.map((p) => proj(p).map((n) => n.toFixed(1)).join(",")).join("L") + "Z").join(""),
    }));
  }, [geo]);

  const present = Object.values(values).filter((v) => v != null);
  const cuts = present.length ? cutsFor(present) : [];
  const colors = SHADES.slice(SHADES.length - (cuts.length + 1));
  const colorOf = (v) => (v == null ? NONE : colors[cuts.filter((c) => v >= c).length]);
  const legend = cuts.length
    ? [`under ${format(cuts[0])}`, ...cuts.slice(0, -1).map((c, i) => `${format(c)} – ${format(cuts[i + 1])}`), `${format(cuts[cuts.length - 1])} and above`]
    : [];

  const move = (e, district) => {
    const r = box.current.getBoundingClientRect();
    setTip({ district, x: Math.min(e.clientX - r.left + 14, r.width - 200), y: e.clientY - r.top + 14 });
  };

  return (
    <div ref={box} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={caption || "Map of Rwanda's districts"}>
        {paths.map((p) => (
          <path key={p.district} d={p.d} fill={colorOf(values[p.district])}
            stroke={p.district === selected ? "#123b7a" : "#fff"} strokeWidth={p.district === selected ? 2.6 : 1.1}
            className="cursor-pointer transition-opacity hover:opacity-80"
            onMouseMove={(e) => move(e, p.district)} onMouseLeave={() => setTip(null)}
            onClick={() => (onSelect ? onSelect(p.district) : navigate(`/districts/${encodeURIComponent(p.district)}`))}>
            <title>{p.district}</title>
          </path>
        ))}
      </svg>
      {tip && (
        <div className="pointer-events-none absolute z-20 rounded-xl border border-nisr-line bg-white px-3 py-2 text-sm shadow-card" style={{ left: tip.x, top: tip.y }}>
          <b className="block text-nisr-navy">{tip.district}</b>
          {values[tip.district] == null ? "Too few farms surveyed" : format(values[tip.district])}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-nisr-muted">
        {legend.map((l, i) => (
          <span key={l} className="inline-flex items-center gap-1.5"><i className="inline-block h-3.5 w-3.5 rounded" style={{ background: colors[i] }} />{l}</span>
        ))}
        <span className="inline-flex items-center gap-1.5"><i className="inline-block h-3.5 w-3.5 rounded" style={{ background: NONE }} />too few farms</span>
      </div>
    </div>
  );
}
