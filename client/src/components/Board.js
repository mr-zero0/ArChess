import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import './Board.css';

const Board = ({ gameState, myTeam, onPieceSelect, selectedPieceId }) => {
  const boardRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const piecesRef = useRef(new Map()); // Three.js meshes for pieces

  useEffect(() => {
    if (!boardRef.current) return;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x87ceeb); // Sky blue

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      boardRef.current.clientWidth / boardRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 10, 15);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(boardRef.current.clientWidth, boardRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    boardRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    // Board (checkered plane)
    const boardSize = gameState?.config?.boardSize || 8;
    const boardGeometry = new THREE.PlaneGeometry(boardSize, boardSize);
    const boardMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Saddle brown
    });
    const boardMesh = new THREE.Mesh(boardGeometry, boardMaterial);
    boardMesh.rotation.x = -Math.PI / 2; // Rotate to horizontal
    boardMesh.position.y = 0.01; // Slightly above zero to avoid z-fighting
    scene.add(boardMesh);

    // Grid helper
    const gridHelper = new THREE.GridHelper(boardSize, boardSize);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);

    // Add pieces
    if (gameState && gameState.pieces) {
      addPiecesToScene(gameState.pieces);
    }

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 5;
    controls.maxDistance = 30;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      controls.update();

      // Update piece positions from game state
      if (gameState && gameState.pieces) {
        updatePiecePositions(gameState.pieces);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      if (!boardRef.current) return;

      camera.aspect = boardRef.current.clientWidth / boardRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(boardRef.current.clientWidth, boardRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    // Handle click selection
    const handleClick = (event) => {
      if (!onPieceSelect) return;

      const rect = boardRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      // Create array of meshes to check against
      const meshes = Array.from(piecesRef.current.values());
      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        const intersected = intersects[0];
        // Find the piece ID from userData
        let pieceId = null;
        let current = intersected.object;
        while (current && !pieceId) {
          if (current.userData && current.userData.pieceId) {
            pieceId = current.userData.pieceId;
            break;
          }
          current = current.parent;
        }

        if (pieceId) {
          onPieceSelect(pieceId);
        }
      }
    };

    boardRef.current.addEventListener('click', handleClick);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      boardRef.current.removeEventListener('click', handleClick);

      // Dispose geometries and materials
      scene.traverse((object) => {
        if (object.isMesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      if (sceneRef.current) {
        // Clear scene
        sceneRef.current.clear();
      }
    };
  }, [gameState, myTeam, onPieceSelect, selectedPieceId]);

  // Add pieces to the scene
  const addPiecesToScene = (pieces) => {
    if (!sceneRef.current) return;

    pieces.forEach(piece => {
      // Don't add dead pieces
      if (!piece.alive) return;

      // Create piece mesh based on type
      const { geometry, material, offsetY } = createPieceMesh(piece);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(piece.position.x, piece.position.y + offsetY, piece.position.z);
      mesh.rotation.y = Math.random() * Math.PI * 2; // Random initial rotation

      // Store piece ID for selection
      mesh.userData = { pieceId: piece.id };

      // Add to scene and refs
      sceneRef.current.add(mesh);
      piecesRef.current.set(piece.id, mesh);
    });
  };

  // Update piece positions
  const updatePiecePositions = (pieces) => {
    pieces.forEach(piece => {
      const mesh = piecesRef.current.get(piece.id);
      if (mesh && piece.alive) {
        // Smoothly interpolate position (simple version)
        mesh.position.lerp(
          new THREE.Vector3(piece.position.x, piece.position.y + 0.01, piece.position.z),
          0.1
        );
        // Optional: rotate based on velocity for visual effect
        // mesh.rotation.y += 0.01;
      } else if (mesh && !piece.alive) {
        // Remove dead pieces (fade out effect could be added)
        sceneRef.current.remove(mesh);
        piecesRef.current.delete(piece.id);

        // Dispose geometry and material
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });
  };

  // Create mesh based on piece type
  const createPieceMesh = (piece) => {
    const size = piece.radius * 2; // Diameter
    let geometry, material, offsetY = 0;

    // Different geometries for different piece types (simplified)
    switch (piece.type) {
      case 'pawn':
        geometry = new THREE.CylinderGeometry(size * 0.4, size * 0.5, size * 0.8, 8);
        offsetY = size * 0.4; // Half height
        break;
      case 'knight':
        // Using a more complex shape would be better, but for now use a dodecahedron
        geometry = new THREE.DodecahedronGeometry(size * 0.5);
        offsetY = size * 0.5;
        break;
      case 'bishop':
        geometry = new THREE.ConeGeometry(size * 0.4, size * 0.8, 8);
        offsetY = size * 0.4;
        break;
      case 'rook':
        geometry = new THREE.CylinderGeometry(size * 0.5, size * 0.5, size * 0.6, 8);
        offsetY = size * 0.3;
        break;
      case 'queen':
        // Combine sphere and cone
        geometry = new THREE.SphereGeometry(size * 0.4, 8, 8);
        offsetY = size * 0.4;
        break;
      case 'king':
        geometry = new THREE.SphereGeometry(size * 0.45, 8, 8);
        offsetY = size * 0.45;
        break;
      default:
        geometry = new THREE.SphereGeometry(size * 0.4, 8, 8);
        offsetY = size * 0.4;
    }

    // Material based on team and material properties
    const teamColor = piece.team === 'white' ? 0xf0f0f0 : 0x2c2c2c;

    // Could use piece material properties for more variation
    material = new THREE.MeshStandardMaterial({
      color: teamColor,
      metalness: 0.1,
      roughness: 0.8,
    });

    // Add team-based emissive for selection highlight
    if (selectedPieceId === piece.id) {
      material.emissive = new THREE.Color(0xffff00);
      material.emissiveIntensity = 0.5;
    }

    return { geometry, material, offsetY };
  };

  if (!boardRef.current) {
    return <div className="board-placeholder">Initializing board...</div>;
  }

  return <div ref={boardRef} className="board-container" />;
};

Board.propTypes = {
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
    })),
    config: PropTypes.shape({
      boardSize: PropTypes.number
    })
  }),
  myTeam: PropTypes.oneOf(['white', 'black']),
  onPieceSelect: PropTypes.func,
  selectedPieceId: PropTypes.string
};

export default Board;