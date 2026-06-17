import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Panel from "./pages/Panel";
import Search from "./pages/Search";
import Stats from "./pages/Stats";
import Profile from "./pages/Profile";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Panel />} />
        <Route path="/search" element={<Search />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </Layout>
  );
}
