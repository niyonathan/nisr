import { createContext, useContext, useEffect, useState } from "react";

const DataContext = createContext(null);

/** Builds lookup tables once, so pages can ask "maize in Musanze" without searching arrays. */
function index(raw) {
  const districtCrop = new Map(raw.districtCrops.map((r) => [`${r.district}|${r.crop}`, r]));
  const crop = new Map(raw.crops.map((r) => [r.crop, r]));
  const district = new Map(raw.districts.map((r) => [r.district, r]));
  const effectsByCrop = new Map();
  raw.effects.forEach((e) => effectsByCrop.set(e.crop, [...(effectsByCrop.get(e.crop) || []), e]));
  const gap = new Map(raw.gaps.map((r) => [`${r.district}|${r.crop}`, r]));
  const scenario = new Map(raw.scenarios.map((r) => [`${r.district}|${r.crop}`, r]));
  // Crops with enough plots to be meaningful on the farm tool, most common first.
  const farmCrops = raw.crops.filter((c) => c.n >= 100).sort((a, b) => b.n - a.n).map((c) => c.crop);
  const districtNames = raw.districts.map((d) => d.district).sort();
  return {
    ...raw,
    farmCrops,
    districtNames,
    getDistrict: (d) => district.get(d),
    getCrop: (c) => crop.get(c),
    getDistrictCrop: (d, c) => districtCrop.get(`${d}|${c}`),
    getEffects: (c) => effectsByCrop.get(c) || [],
    getGap: (d, c) => gap.get(`${d}|${c}`),
    getScenario: (d, c) => scenario.get(`${d}|${c}`),
    cropsInDistrict: (d) => raw.districtCrops.filter((r) => r.district === d),
    districtsForCrop: (c) => raw.districtCrops.filter((r) => r.crop === c),
  };
}

export function DataProvider({ children }) {
  const [state, setState] = useState({ data: null, error: null });
  useEffect(() => {
    fetch("/data/agrilens.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load the survey data (HTTP ${r.status}).`);
        return r.json();
      })
      .then((raw) => setState({ data: index(raw), error: null }))
      .catch((error) => setState({ data: null, error }));
  }, []);

  if (state.error) {
    return (
      <div className="wrap py-24 text-center">
        <h1 className="text-2xl">The data didn't load</h1>
        <p className="mt-2 text-nisr-muted">{state.error.message} Refresh the page to try again.</p>
      </div>
    );
  }
  if (!state.data) {
    return <div className="wrap py-24 text-center text-nisr-muted">Loading survey data…</div>;
  }
  return <DataContext.Provider value={state.data}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);
