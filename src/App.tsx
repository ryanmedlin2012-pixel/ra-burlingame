import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import ArtworkDetail from './pages/ArtworkDetail';
import Bio from './pages/Bio';
import Statement from './pages/Statement';
import Cv from './pages/Cv';
import Contact from './pages/Contact';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/work" element={<Gallery />} />
        <Route path="/piece/:id" element={<ArtworkDetail />} />
        <Route path="/bio" element={<Bio />} />
        <Route path="/statement" element={<Statement />} />
        <Route path="/cv" element={<Cv />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
    </BrowserRouter>
  );
}
