import { Link, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Overview from "./pages/Overview";
import MyFarm from "./pages/MyFarm";
import Irrigation from "./pages/Irrigation";
import SoilFertility from "./pages/SoilFertility";
import Productivity from "./pages/Productivity";
import PostHarvest from "./pages/PostHarvest";
import Exports from "./pages/Exports";
import Districts from "./pages/Districts";
import DistrictProfile from "./pages/DistrictProfile";
import About from "./pages/About";

function NotFound() {
  return (
    <div className="wrap py-24 text-center">
      <h1 className="text-3xl">Page not found</h1>
      <p className="mt-2 text-nisr-muted">The page you opened doesn't exist. <Link className="font-bold" to="/">Go to the home page</Link>.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="rwanda" element={<Overview />} />
        <Route path="my-farm" element={<MyFarm />} />
        <Route path="irrigation" element={<Irrigation />} />
        <Route path="soil-fertility" element={<SoilFertility />} />
        <Route path="productivity" element={<Productivity />} />
        <Route path="post-harvest" element={<PostHarvest />} />
        <Route path="exports" element={<Exports />} />
        <Route path="districts" element={<Districts />} />
        <Route path="districts/:name" element={<DistrictProfile />} />
        <Route path="about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
