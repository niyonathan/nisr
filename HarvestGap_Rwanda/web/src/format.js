export const fmt = (v) => (v == null || Number.isNaN(v) ? "—" : Math.round(v).toLocaleString("en-US"));

/** 0.234 → "23%". With sign, positive values get a "+" and negatives a proper minus. */
export const pct = (v, sign = false) => {
  if (v == null || Number.isNaN(v)) return "—";
  const n = Math.round(v * 100);
  if (!sign) return `${n}%`;
  return n > 0 ? `+${n}%` : n < 0 ? `−${Math.abs(n)}%` : "0%";
};

/** Crop names mid-sentence: "maize", but keep proper nouns like "Irish potato". */
export const cropText = (c) => (c.startsWith("Irish") ? c : c.toLowerCase());

export const PROVINCES = ["Kigali", "North", "South", "East", "West"];

/** Downloads rows as a CSV file. */
export function downloadCsv(filename, rows, columns) {
  const escape = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((c) => escape(c.label)).join(","), ...rows.map((r) => columns.map((c) => escape(c.csv ? c.csv(r) : r[c.key])).join(","))];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
