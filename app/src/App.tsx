import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Dashboard } from "@/pages/Dashboard";
import { Reader } from "@/pages/Reader";
import { QA } from "@/pages/QA";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/wiki/:slug" element={<Reader />} />
          <Route path="/qa" element={<QA />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
