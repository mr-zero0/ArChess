import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LobbyScene from './scenes/LobbyScene';
import GameScene from './scenes/GameScene';
import ReplayScene from './scenes/ReplayScene';
import TutorialScene from './scenes/TutorialScene';
import './styles/globals.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LobbyScene />} />
          <Route path="/game/:roomId" element={<GameScene />} />
          <Route path="/replay/:replayId" element={<ReplayScene />} />
          <Route path="/tutorial" element={<TutorialScene />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;