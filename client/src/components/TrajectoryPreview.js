import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import './TrajectoryPreview.css';

const TrajectoryPreview = ({ pieceId, gameState, launchData }) => {
  const previewRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const trajectoryRef = useRef(null);

  useEffect(() => {
    if (!previewRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = null; // Transparent background

    // Camera
    const camera = new THREE.OrthographicCamera(
      previewRef.current.clientWidth / -2,
      previewRef.current.clientWidth / 2,
      previewRef.current.clientHeight / 2,
      previewRef.current.clientHeight / -2,
      0.1,
      100
    );
    camera.position.set(0, 0, 10);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(previewRef.current.clientWidth, previewRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    previewRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Create trajectory line
    const trajectory = createTrajectoryLine(gameState, launchData);
    if (trajectory) {
      scene.add(trajectory);
      trajectoryRef.current = trajectory;
    }

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!previewRef.current) return;

      const width = previewRef.current.clientWidth;
      const height = previewRef.current.clientHeight;

      camera.left = width / -2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = height / -2;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.clear();
      }
    };
  }, [gameState, launchData, pieceId]);

  // Create the trajectory line based on physics simulation
  const createTrajectoryLine = (state, launchData) => {
    if (!state || !state.pieces) return null;

    const piece = state.pieces.find(p => p.id === pieceId);
    if (!piece) return null;

    // Simple projectile motion approximation (ignoring air resistance and bounces for preview)
    const gravity = new THREE.Vector3(0, -9.81, 0);
    const initialPosition = new THREE.Vector3(piece.position.x, piece.position.y, piece.position.z);
    const initialVelocity = new THREE.Vector3(
      launchData.x * 0.1, // Scale factor to match physics engine
      launchData.y * 0.1,
      launchData.z * 0.1
    );

    // Create points for the trajectory
    const points = [];
    const timeStep = 0.1; // seconds between points
    const maxTime = 5.0; // maximum preview time
    let time = 0;

    let position = initialPosition.clone();
    let velocity = initialVelocity.clone();

    while (time < maxTime) {
      points.push(position.clone());

      // Update physics
      velocity.add(gravity.clone().multiplyScalar(timeStep));
      position.add(velocity.clone().multiplyScalar(timeStep));

      // Simple ground collision (y=0)
      if (position.y < 0) {
        position.y = 0;
        velocity.y = Math.abs(velocity.y) * 0.5; // Bounce with energy loss
        if (Math.abs(velocity.y) < 0.1) break; // Stop bouncing
      }

      time += timeStep;
    }

    if (points.length < 2) return null;

    // Create line geometry
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 2,
      dashed: true,
      dashSize: 0.2,
      gapSize: 0.1
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances(); // Required for dashed lines

    return line;
  };

  if (!previewRef.current) {
    return <div className="trajectory-placeholder">Loading preview...</div>;
  }

  return <div ref={previewRef} className="trajectory-preview" />;
};

TrajectoryPreview.propTypes = {
  pieceId: PropTypes.string.isRequired,
  gameState: PropTypes.shape({
    pieces: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      team: PropTypes.oneOf(['white', 'black']).isRequired,
      position: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        z: PropTypes.number.isRequired
      }).isRequired,
      velocity: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired,
        z: PropTypes.number.isRequired
      }),
      hp: PropTypes.number,
      maxHp: PropTypes.number,
      power: PropTypes.number,
      radius: PropTypes.number,
      mass: PropTypes.number,
      alive: PropTypes.boolean
    }))
  }),
  launchData: PropTypes.shape({
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    z: PropTypes.number.isRequired
  })
};

export default TrajectoryPreview;