import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import Viewer from "./pages/Viewer";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CreateBuilding from "./pages/CreateBuilding";
import { LanguageProvider } from "./lib/i18n";

export default function App() {
  return (
    <LanguageProvider>
    <BrowserRouter>
      <NavBar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/view/:id" element={<Viewer />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/create" element={<CreateBuilding />} />
        </Routes>
      </main>
    </BrowserRouter>
    </LanguageProvider>
  );
}
