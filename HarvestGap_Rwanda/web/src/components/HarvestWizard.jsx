import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Search } from "lucide-react";
import { useData } from "../data";

const PRACTICES = [
  ["improved_seed", "Improved (certified) seed"],
  ["inorganic_fertilizer", "Fertilizer (NPK, DAP, urea)"],
  ["organic_fertilizer", "Manure or compost"],
  ["pesticide", "Pesticide or fungicide"],
];
export const CONCERNS = [
  ["harvest", "My harvest is too small"],
  ["water", "Not enough water"],
  ["soil", "Poor or tired soil"],
  ["store", "Storing or selling my harvest"],
];
const SIZES = [["0.1", "Very small (0.1 ha)"], ["0.25", "Small (0.25 ha)"], ["0.5", "Half a hectare"], ["1", "One hectare"], ["2", "Two hectares"]];

const choice = (on) => `rounded-xl border px-4 py-3 text-left text-[16px] transition-colors ${on ? "border-nisr-blue bg-[#eef5fd] font-semibold text-nisr-blue" : "border-[#d6e2ef] bg-white text-nisr-ink hover:border-nisr-blue"}`;

/** Five short questions, one per screen, then a short "working on it" moment. */
export default function HarvestWizard({ initial = {}, onDone }) {
  const D = useData();
  const [step, setStep] = useState(0);
  const [a, setA] = useState({ district: initial.district || "", crop: initial.crop || "", area: "0.5", uses: [], concern: "harvest" });
  const [search, setSearch] = useState("");
  const [working, setWorking] = useState(-1);
  // Always hand over the latest answers, even if the last tap and "Create" happen together.
  const latest = useRef(a);
  const set = (patch) => setA((x) => { latest.current = { ...x, ...patch }; return latest.current; });

  const steps = [
    {
      q: "Where is your farm?", hint: "Choose your district.", ok: !!a.district,
      body: (
        <>
          <label className="relative mb-4 block">
            <span className="sr-only">Search districts</span>
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nisr-muted" />
            <input className="field pl-10" placeholder="Type to search…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {D.districtNames.filter((d) => d.toLowerCase().includes(search.trim().toLowerCase())).map((d) => (
              <button key={d} className={choice(a.district === d)} onClick={() => { set({ district: d }); setStep(1); }}>{d}</button>
            ))}
          </div>
        </>
      ),
    },
    {
      q: "What do you grow?", hint: "Choose the crop you want a report for.", ok: !!a.crop,
      body: (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {D.farmCrops.map((c) => (
            <button key={c} className={choice(a.crop === c)} onClick={() => { set({ crop: c }); setStep(2); }}>{c}</button>
          ))}
        </div>
      ),
    },
    {
      q: "How big is the field?", hint: "Pick a size or type it in hectares. 1 hectare = 100 m × 100 m.", ok: parseFloat(a.area) > 0,
      body: (
        <>
          <div className="grid gap-2 sm:grid-cols-3">
            {SIZES.map(([v, l]) => <button key={v} className={choice(a.area === v)} onClick={() => set({ area: v })}>{l}</button>)}
          </div>
          <label className="mt-4 block max-w-xs">
            <span className="label">Or type the size (hectares)</span>
            <input className="field" type="number" min="0.01" max="100" step="0.05" inputMode="decimal" value={a.area} onChange={(e) => set({ area: e.target.value })} />
          </label>
        </>
      ),
    },
    {
      q: "What do you already use?", hint: "Tap all that apply, or none.", ok: true,
      body: (
        <div className="grid gap-2 sm:grid-cols-2">
          {PRACTICES.map(([p, l]) => {
            const on = a.uses.includes(p);
            return (
              <button key={p} aria-pressed={on} className={`${choice(on)} flex items-center gap-3`} onClick={() => set({ uses: on ? a.uses.filter((x) => x !== p) : [...a.uses, p] })}>
                <span className={`flex h-5 w-5 items-center justify-center rounded border ${on ? "border-nisr-blue bg-nisr-blue text-white" : "border-[#b9c8da]"}`}>{on && <Check size={14} />}</span>{l}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      q: "What worries you most?", hint: "Your report will start with this.", ok: true,
      body: (
        <div className="grid gap-2 sm:grid-cols-2">
          {CONCERNS.map(([v, l]) => <button key={v} className={choice(a.concern === v)} onClick={() => set({ concern: v })}>{l}</button>)}
        </div>
      ),
    },
  ];

  const finish = () => {
    const lines = 4;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return onDone(latest.current);
    setWorking(0);
    for (let i = 1; i <= lines; i++) setTimeout(() => setWorking(i), 400 * i);
    setTimeout(() => onDone(latest.current), 400 * lines + 200);
    return undefined;
  };

  if (working >= 0) {
    const local = D.getDistrictCrop(a.district, a.crop);
    const lines = [
      local ? `Finding farms like yours: ${local.n} ${a.crop.toLowerCase()} plots in ${a.district}` : `Finding farms like yours: ${a.crop.toLowerCase()} plots across Rwanda`,
      "Comparing with the average for Rwanda",
      "Checking what farmers who harvest more do",
      "Writing your report",
    ];
    return (
      <div className="card mx-auto max-w-2xl p-8">
        <h2 className="text-2xl">Preparing your harvest report…</h2>
        <ul className="mt-5 grid gap-3 text-[16px]">
          {lines.map((l, i) => (
            <li key={l} className={`flex items-center gap-3 transition-opacity ${i <= working ? "opacity-100" : "opacity-30"}`}>
              {i < working ? <Check size={18} className="text-[#1d7a46]" /> : <Loader2 size={18} className={i === working ? "animate-spin text-nisr-blue" : "text-nisr-muted"} />}
              {l}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const s = steps[step];
  const last = step === steps.length - 1;
  return (
    <div className="card mx-auto max-w-3xl p-6 sm:p-8">
      <div className="flex items-center justify-between text-sm text-nisr-muted">
        <span>Step {step + 1} of {steps.length}</span>
        <span>{[a.district, a.crop].filter(Boolean).join(" · ")}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e6edf5]" aria-hidden="true">
        <div className="h-full rounded-full bg-nisr-blue transition-all" style={{ width: `${(100 * (step + 1)) / steps.length}%` }} />
      </div>
      <h2 className="mt-6 text-2xl sm:text-3xl">{s.q}</h2>
      <p className="mb-5 mt-1 text-nisr-muted">{s.hint}</p>
      {s.body}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-nisr-navy hover:bg-nisr-mist ${step === 0 ? "invisible" : ""}`} onClick={() => setStep(step - 1)}>
          <ArrowLeft size={18} /> Back
        </button>
        <button className="btn-primary disabled:cursor-not-allowed disabled:opacity-40" disabled={!s.ok} onClick={() => (last ? finish() : setStep(step + 1))}>
          {last ? "Create my report" : "Next"} <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
