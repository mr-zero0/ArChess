import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Menu from '../components/Menu';
import './TutorialScene.css';

const TutorialScene = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [tutorialData, setTutorialData] = useState(null);

  // Tutorial steps data
  const tutorialSteps = [
    {
      id: 1,
      title: "Welcome to Physics Chess!",
      content: "Learn how to launch pieces and destroy the enemy king.",
      image: "/assets/tutorial/welcome.png",
      action: "Click 'Next' to continue"
    },
    {
      id: 2,
      title: "Basic Controls",
      content: "Click and drag on a piece to launch it. The longer you drag, the stronger the launch.",
      image: "/assets/tutorial/controls.png",
      action: "Try launching a pawn"
    },
    {
      id: 3,
      title: "Piece Types",
      content: "Each piece has different HP, power, and special abilities. Learn their strengths!",
      image: "/assets/tutorial/pieces.png",
      action: "Open the piece info panel"
    },
    {
      id: 4,
      title: "Special Abilities",
      content: "Each piece has unique abilities. Press and hold to activate special abilities.",
      image: "/assets/tutorial/abilities.png",
      action: "Try a knight's jump ability"
    },
    {
      id: 5,
      title: "Win Condition",
      content: "Destroy the enemy king (reduce its HP to 0) to win the game!",
      image: "/assets/tutorial/win.png",
      action: "Launch a piece at the enemy king"
    },
    {
      id: 6,
      title: "Game Modes",
      content: "Try different game modes like Timed, Points, and Survivor for varied gameplay.",
      image: "/assets/tutorial/modes.png",
      action: "Select a different game mode when creating a room"
    },
    {
      id: 7,
      title: "You're Ready!",
      content: "You've completed the tutorial! Now go play and have fun!",
      image: "/assets/tutorial/ready.png",
      action: "Click 'Finish Tutorial' to go to the lobby"
    }
  ];

  useEffect(() => {
    // Load tutorial data (in a real app, this might come from an API)
    setTutorialData(tutorialSteps[step]);
  }, [step]);

  const handleNext = () => {
    if (step < tutorialSteps.length - 1) {
      setStep(step + 1);
    } else {
      setIsComplete(true);
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleFinish = () => {
    navigate('/');
  };

  if (isComplete) {
    return (
      <div className="tutorial-scene complete">
        <div className="tutorial-content">
          <h1>Tutorial Complete!</h1>
          <p>You've learned the basics of Physics Chess Variant. Ready to play?</p>
          <Button onClick={handleFinish} variant="primary">
            Go to Lobby
          </Button>
        </div>
      </div>
    );
  }

  const currentStep = tutorialSteps[step];

  return (
    <div className="tutorial-scene">
      <div className="tutorial-header">
        <h1>Physics Chess Tutorial</h1>
        <div className="tutorial-progress">
          <span>{step + 1} of {tutorialSteps.length}</span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((step + 1) / tutorialSteps.length) * 100}%` }}
            ></div>
          </div>
        </div>
        <Button onClick={handlePrev} variant="secondary" disabled={step === 0}>
          Previous
        </Button>
        <Button onClick={handleNext} variant={step === tutorialSteps.length - 1 ? 'primary' : 'secondary'}>
          {step === tutorialSteps.length - 1 ? 'Finish Tutorial' : 'Next'}
        </Button>
      </div>

      <div className="tutorial-body">
        <div className="tutorial-image">
          {/* In a real app, this would show an image or video */}
          <div className="tutorial-placeholder">
            <p>[Tutorial Image: {currentStep.title}]</p>
          </div>
        </div>

        <div className="tutorial-content">
          <h2>{currentStep.title}</h2>
          <p>{currentStep.content}</p>
          <div className="tutorial-action">
            <p><strong>Action:</strong> {currentStep.action}</p>
          </div>
        </div>
      </div>

      <div className="tutorial-footer">
        <p>Physics Chess Variant • Tutorial System</p>
      </div>
    </div>
  );
};

export default TutorialScene;