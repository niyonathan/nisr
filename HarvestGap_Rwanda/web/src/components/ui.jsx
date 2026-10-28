import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpDown, Download, Info } from "lucide-react";
import { downloadCsv } from "../format";

/** Blue page header used on every page; children render on the right (stats). */
export function PageHero({ eyebrow, title, intro, children, compact = false }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#0b63b4] via-nisr-blue to-[#0a4f94] text-white">
      <div className={`wrap relative z-10 grid items-center gap-10 ${compact ? "pb-24 pt-12" : "pb-28 pt-16"} ${children ? "lg:grid-cols-[1.1fr_0.9fr]" : ""}`}>
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#9fd3f5]">{eyebrow}</span>
          <h1 className={`mt-4 text-white ${compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"} leading-[1.08]`}>{title}</h1>
          {intro && <p className="mt-5 max-w-xl text-lg text-[#d8e8f8]">{intro}</p>}
        </div>
        {children}
      </div>
      <svg className="absolute inset-x-0 -bottom-px z-0 h-[110px] w-full" viewBox="0 0 1440 150" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 95 C 180 40 330 40 520 85 S 860 130 1040 80 S 1320 40 1440 70 V150 H0Z" fill="#fff" opacity=".1" />
        <path d="M0 120 C 220 70 420 80 620 110 S 980 140 1180 100 S 1380 90 1440 105 V150 H0Z" fill="#fff" opacity=".16" />
        <path d="M0 132 C 260 110 520 112 760 128 S 1200 140 1440 122 V150 H0Z" fill="#fff" />
      </svg>
    </div>
  );
}

/** Small translucent stat used inside the blue hero. */
export function HeroStat({ value, label }) {
  return (
    <div className="rounded-2xl border border-white/25 bg-white/10 px-5 py-4">
      <b className="num block font-display text-3xl">{value}</b>
      <span className="text-sm text-[#cfe2f6]">{label}</span>
    </div>
  );
}

export function Section({ eyebrow, title, intro, children, alt = false, id }) {
  return (
    <section id={id} className={`py-16 ${alt ? "bg-nisr-mist" : ""}`}>
      <div className="wrap">
        {(title || eyebrow) && (
          <div className="mb-8 max-w-3xl">
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2 className="mt-2 text-[28px] sm:text-[32px]">{title}</h2>}
            {intro && <p className="mt-2 text-lg text-nisr-muted">{intro}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

const TONES = {
  blue: "bg-[#e3eef9] text-nisr-blue",
  green: "bg-[#e2f3e8] text-[#1d7a46]",
  amber: "bg-[#fff1d9] text-[#8a5300]",
  red: "bg-[#fde4e1] text-[#b3261e]",
  grey: "bg-[#edf1f5] text-nisr-muted",
};

export function Pill({ tone = "blue", children }) {
  return <span className={`inline-block rounded-full px-3 py-1 text-[13px] font-bold ${TONES[tone]}`}>{children}</span>;
}

/** Headline number card. */
export function StatCard({ icon: Icon, value, label, note, tone = "blue" }) {
  return (
    <div className="card flex flex-col gap-2 p-5">
      {Icon && <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${TONES[tone]}`}><Icon size={22} /></span>}
      <b className="num font-display text-[32px] leading-none text-nisr-navy">{value}</b>
      <span className="font-semibold text-nisr-navy">{label}</span>
      {note && <span className="text-sm text-nisr-muted">{note}</span>}
    </div>
  );
}

/** One-sentence takeaway at the top of a topic page. */
export function Headline({ children }) {
  return (
    <div className="card -mt-16 relative z-10 border-l-4 border-l-nisr-blue p-6 sm:p-7">
      <p className="font-display text-lg leading-relaxed text-nisr-navy sm:text-xl">{children}</p>
    </div>
  );
}

export function Note({ children }) {
  return (
    <p className="flex gap-2 text-sm text-nisr-muted">
      <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function Card({ title, subtitle, children, className = "", action }) {
  return (
    <div className={`card p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-lg">{title}</h3>}
            {subtitle && <p className="mt-1 text-[15px] text-nisr-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/** Horizontal bars, all on one scale. rows: [{label, value, display, highlight, faint, to}] */
export function BarList({ rows, color = "#0a5ca8", max }) {
  const top = max ?? Math.max(...rows.map((r) => r.value), 0.0001);
  return (
    <ul className="grid gap-3">
      {rows.map((r) => (
        <li key={r.label} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 text-[15px] ${r.faint ? "opacity-45" : ""}`}>
          <span className={r.highlight ? "font-bold text-nisr-blue" : ""}>{r.to ? <Link className="hover:underline" to={r.to}>{r.label}</Link> : r.label}</span>
          <b className="num text-right text-nisr-navy">{r.display}</b>
          <span className="col-span-2 h-2.5 overflow-hidden rounded-full bg-[#e6edf5]">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(1, (100 * r.value) / top)}%`, background: r.highlight ? "#f2a33a" : r.color || color }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Numbered "top districts to act on" list with an action tag. */
export function RankList({ rows }) {
  const top = Math.max(...rows.map((r) => r.value), 0.0001);
  return (
    <ol className="grid">
      {rows.map((r, i) => (
        <li key={r.label} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-t border-nisr-line py-3 text-[15px] first:border-t-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-nisr-mist text-[13px] font-bold text-nisr-navy">{i + 1}</span>
          <span>
            <Link to={`/districts/${encodeURIComponent(r.label)}`} className="font-semibold text-nisr-navy hover:text-nisr-blue">{r.label}</Link>
            {r.tag && <span className="ml-2 align-middle text-xs font-bold text-nisr-muted">{r.tag}</span>}
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-[#e6edf5]">
              <span className="block h-full rounded-full bg-nisr-blue" style={{ width: `${(100 * r.value) / top}%` }} />
            </span>
          </span>
          <b className="num text-nisr-navy">{r.display}</b>
        </li>
      ))}
    </ol>
  );
}

/** Sortable table with CSV download. columns: [{key, label, render?, csv?, numeric?}] */
export function DataTable({ rows, columns, filename, initialSort, maxHeight = 520 }) {
  const [sort, setSort] = useState(initialSort || { key: columns[0].key, dir: 1 });
  const sorted = useMemo(() => {
    const out = [...rows];
    out.sort((a, b) => {
      const x = a[sort.key], y = b[sort.key];
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "string" ? x.localeCompare(y) : x - y) * sort.dir;
    });
    return out;
  }, [rows, sort]);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-nisr-muted">{rows.length} rows · click a column to sort</span>
        {filename && (
          <button className="inline-flex items-center gap-2 rounded-lg border border-nisr-line px-3 py-2 text-sm font-bold text-nisr-blue hover:bg-nisr-mist"
            onClick={() => downloadCsv(filename, sorted, columns)}>
            <Download size={16} /> Download CSV
          </button>
        )}
      </div>
      <div className="overflow-auto rounded-xl border border-nisr-line" style={{ maxHeight }}>
        <table className="num w-full border-collapse text-[15px]">
          <thead className="sticky top-0 z-10 bg-nisr-mist">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir > 0 ? "ascending" : "descending") : "none"}
                  className={`whitespace-nowrap px-3 py-2.5 font-bold text-nisr-navy ${c.numeric ? "text-right" : "text-left"}`}>
                  <button className="inline-flex items-center gap-1" onClick={() => setSort({ key: c.key, dir: sort.key === c.key ? -sort.dir : c.numeric ? -1 : 1 })}>
                    {c.label} <ArrowUpDown size={13} className="opacity-50" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={i} className="border-t border-nisr-line odd:bg-white even:bg-[#fafcfe]">
                {columns.map((c) => (
                  <td key={c.key} className={`whitespace-nowrap px-3 py-2 ${c.numeric ? "text-right" : ""}`}>{c.render ? c.render(r) : r[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Tile linking to another page. */
export function LinkTile({ to, icon: Icon, title, text, tag }) {
  return (
    <Link to={to} className="card group flex flex-col gap-2 border-t-4 border-t-nisr-blue p-5 transition-shadow hover:shadow-[0_12px_28px_rgba(18,59,122,0.12)]">
      {Icon && <Icon size={26} className="text-nisr-blue" aria-hidden="true" />}
      <b className="font-display text-[17px] text-nisr-navy">{title}</b>
      <span className="flex-1 text-[15px] text-nisr-muted">{text}</span>
      {tag && <span className="text-xs font-bold text-[#8a5300]">{tag}</span>}
      <span className="inline-flex items-center gap-1 text-[15px] font-bold text-nisr-blue">Open <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></span>
    </Link>
  );
}

/** Segmented control for switching what a map or chart shows. */
export function Tabs({ options, value, onChange, label }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={value === o.value} onClick={() => onChange(o.value)}
          className={`rounded-full border px-3.5 py-2 text-[15px] font-semibold transition-colors ${value === o.value ? "border-nisr-blue bg-nisr-blue text-white" : "border-[#c8d6e6] bg-white text-nisr-navy hover:bg-nisr-mist"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
