import { createContext, useContext, useEffect, useState } from "react";

const FarmContext = createContext(null);
const KEY = "harvestgap.farm";

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

/**
 * The user's farm (district, crop, land size, practices), chosen once and reused on every page.
 * Kept in this browser only; nothing is sent anywhere.
 */
export function FarmProvider({ children }) {
  const [farm, setFarmState] = useState(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(farm));
    } catch {
      /* Private mode or storage disabled: the farm is simply not remembered. */
    }
  }, [farm]);
  const setFarm = (patch) => setFarmState((f) => ({ ...f, ...patch }));
  const clearFarm = () => setFarmState({});
  return <FarmContext.Provider value={{ farm, setFarm, clearFarm }}>{children}</FarmContext.Provider>;
}

export const useFarm = () => useContext(FarmContext);
