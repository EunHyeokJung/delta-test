import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage, FullModePage, DeltaModePage, HybridModePage } from './pages';
import './styles/index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/full" element={<FullModePage />} />
        <Route path="/delta" element={<DeltaModePage />} />
        <Route path="/hybrid" element={<HybridModePage />} />
      </Routes>
    </Router>
  );
}

export default App; 