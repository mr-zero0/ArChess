import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import ReplayPlayer from '../components/ReplayPlayer';
import './ReplayScene.css';

const ReplayScene = () => {
  const { replayId } = useParams();
  const navigate = useNavigate();
  const [replayData, setReplayData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Fetch replay data from API
    const fetchReplay = async () => {
      try {
        setIsLoading(true);
        setError(null);
        // In a real app, this would be an API call
        // const response = await fetch(`/api/replays/${replayId}`);
        // const data = await response.json();
        // For now, we'll simulate with dummy data
        await new Promise(resolve => setTimeout(resolve, 1000));
        const dummyData = {
          id: replayId,
          title: `Replay #${replayId}`,
          description: 'A sample replay',
          duration: 120,
          moves: [
            { time: 0, type: 'launch', pieceId: 'pawn-0', force: { x: 5, y: 10, z: 0 } },
            { time: 2, type: 'collision', pieceA: 'pawn-0', pieceB: 'pawn-8', damage: 15 },
            { time: 5, type: 'launch', pieceId: 'knight-0', force: { x: -3, y: 8, z: 0 } },
            { time: 8, type: 'king-dead', team: 'black' }
          ]
        };
        setReplayData(dummyData);
      } catch (err) {
        setError('Failed to load replay');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReplay();
  }, [replayId]);

  if (isLoading) {
    return (
      <div className="replay-scene loading">
        <div className="replay-loading-spinner"></div>
        <p>Loading replay...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="replay-scene error">
        <h2>Error</h2>
        <p>{error}</p>
        <Button onClick={() => navigate('/')}>Return to Lobby</Button>
      </div>
    );
  }

  if (!replayData) {
    return (
      <div className="replay-scene empty">
        <h2>Replay Not Found</h2>
        <p>The replay with ID ${replayId} does not exist.</p>
        <Button onClick={() => navigate('/')}>Return to Lobby</Button>
      </div>
    );
  }

  return (
    <div className="replay-scene">
      <div className="replay-header">
        <h1>{replayData.title}</h1>
        <p className="replay-description">{replayData.description}</p>
        <div className="replay-meta">
          <span>Duration: {replayData.duration}s</span>
          <span>Moves: {replayData.moves.length}</span>
        </div>
      </div>

      <div className="replay-body">
        <ReplayPlayer
          replayData={replayData}
          onFinish={() => navigate('/')}
        />
      </div>

      <div className="replay-footer">
        <Button onClick={() => navigate('/')}>Return to Lobby</Button>
        {/* In a real app, we would have share, like, download buttons */}
      </div>
    </div>
  );
};

export default ReplayScene;