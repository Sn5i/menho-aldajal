import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HostScreen from './pages/HostScreen';
import PlayerScreen from './pages/PlayerScreen';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-saudi-bg text-saudi-text font-arabic" dir="rtl">
        <Routes>
          {/* The main screen for the TV/Laptop */}
          <Route path="/host" element={<HostScreen />} />
          
          {/* The screen for players on their phones */}
          <Route path="/join/:roomCode?" element={<PlayerScreen />} />
          
          {/* Default to a landing page (we can build this later, for now it goes to Host) */}
          <Route path="/" element={<HostScreen />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;