import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { useData } from "../data";
import { fmt, pct, PROVINCES } from "../format";
import { DataTable, HeroStat, PageHero, Pill, Section, Tabs } from "../components/ui";

export default function Districts() {
  const D = useData();
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState("All");
  const list = D.districts
    .filter((d) => (province === "All" || d.province === province) && d.district.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => a.district.localeCompare(b.district));

  const columns = [
    { key: "district", label: "District", render: (r) => <Link className="font-semibold" to={`/districts/${encodeURIComponent(r.district)}`}>{r.district}</Link> },
    { key: "province", label: "Province" },
    { key: "n_households", label: "Households surveyed", numeric: true },
    { key: "irrigated_rate", label: "Irrigated", numeric: true, render: (r) => pct(r.irrigated_rate) },
    { key: "no_water_rate", label: "No water", numeric: true, render: (r) => pct(r.no_water_rate) },
    { key: "inorganic_fertilizer_rate", label: "Mineral fertilizer", numeric: true, render: (r) => pct(r.inorganic_fertilizer_rate) },
    { key: "improved_seed_rate", label: "Improved seed", numeric: true, render: (r) => pct(r.improved_seed_rate) },
    { key: "anti_erosion_rate", label: "Anti-erosion", numeric: true, render: (r) => pct(r.anti_erosion_rate) },
    { key: "extension_this_season_rate", label: "Extension advice", numeric: true, render: (r) => pct(r.extension_this_season_rate) },
    { key: "extension_post_harvest_rate", label: "Post-harvest advice", numeric: true, render: (r) => pct(r.extension_post_harvest_rate) },
    { key: "poor_rate", label: "Poor households", numeric: true, render: (r) => pct(r.poor_rate) },
  ];

  return (
    <>
      <PageHero compact eyebrow="My district" title="Rwanda's 30 districts, side by side"
        intro="Open any district for its full profile: crops and yields, irrigation, soil, advice coverage and priorities.">
        <div className="grid grid-cols-2 gap-3.5">
          <HeroStat value={30} label="districts" />
          <HeroStat value={5} label="provinces" />
          <HeroStat value={fmt(D.survey.households)} label="households surveyed" />
          <HeroStat value={D.districtCrops.length} label="district × crop yield estimates" />
        </div>
      </PageHero>

      <div className="wrap relative z-10 -mt-14">
        <div className="card flex flex-wrap items-center gap-4 p-5">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search districts</span>
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nisr-muted" />
            <input className="field pl-10" placeholder="Search a district…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <Tabs label="Province" value={province} onChange={setProvince} options={["All", ...PROVINCES].map((p) => ({ value: p, label: p }))} />
        </div>
      </div>

      <Section>
        {list.length === 0 && <p className="text-nisr-muted">No district matches "{query}".</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((d) => (
            <Link key={d.district} to={`/districts/${encodeURIComponent(d.district)}`}
              className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(18,59,122,0.12)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl">{d.district}</h3>
                  <span className="text-sm text-nisr-muted">{d.province} Province · {d.n_households} households</span>
                </div>
                {d.low_sample && <Pill tone="amber">Small sample</Pill>}
              </div>
              <dl className="num mt-4 grid grid-cols-3 gap-2 text-center">
                {[["Irrigated", d.irrigated_rate], ["Fertilizer", d.inorganic_fertilizer_rate], ["No water", d.no_water_rate]].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-nisr-mist px-2 py-2.5">
                    <dt className="text-xs font-bold text-nisr-muted">{k}</dt>
                    <dd className="font-display text-xl text-nisr-navy">{pct(v)}</dd>
                  </div>
                ))}
              </dl>
              <span className="mt-4 inline-flex items-center gap-1 font-bold text-nisr-blue">Open profile <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </Section>

      <Section alt title="Compare all districts" intro="Shares of farm plots or farming households. Sort any column, or download the table.">
        <div className="card p-5"><DataTable rows={D.districts} columns={columns} filename="harvestgap_districts.csv" initialSort={{ key: "district", dir: 1 }} /></div>
      </Section>
    </>
  );
}
