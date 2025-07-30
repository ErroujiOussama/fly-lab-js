/**
 * 3D Drone Visualization using Three.js
 */

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { DroneState } from '@/shared/types/simulation';

interface DroneVisualizationProps {
  droneState: DroneState;
  className?: string;
}

export const DroneVisualization: React.FC<DroneVisualizationProps> = ({
  droneState,
  className = ''
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    droneGroup: THREE.Group;
    propellers: THREE.Mesh[];
    trajectory: THREE.Points;
    trajectoryPositions: Float32Array;
    trajectoryIndex: number;
    gridHelper: THREE.GridHelper;
    frameId?: number;
  }>();

  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    scene.fog = new THREE.Fog(0xf8fafc, 10, 50);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x1e40af, 0x94a3b8);
    gridHelper.position.y = -0.1;
    scene.add(gridHelper);

    // Create drone
    const droneGroup = new THREE.Group();
    
    // Drone body (central sphere)
    const bodyGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    droneGroup.add(body);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.5);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x374151 });
    
    const arms = [];
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Mesh(armGeometry, armMaterial);
      arm.rotation.z = Math.PI / 2;
      arm.rotation.y = (i * Math.PI) / 2;
      arm.position.x = Math.cos((i * Math.PI) / 2) * 0.125;
      arm.position.z = Math.sin((i * Math.PI) / 2) * 0.125;
      arm.castShadow = true;
      droneGroup.add(arm);
      arms.push(arm);
    }

    // Propellers
    const propellers: THREE.Mesh[] = [];
    const propellerGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.005, 32);
    const propellerMaterial = new THREE.MeshLambertMaterial({ color: 0x22c55e, transparent: true, opacity: 0.7 });
    
    for (let i = 0; i < 4; i++) {
      const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
      propeller.position.x = Math.cos((i * Math.PI) / 2) * 0.25;
      propeller.position.z = Math.sin((i * Math.PI) / 2) * 0.25;
      propeller.position.y = 0.02;
      propeller.castShadow = true;
      droneGroup.add(propeller);
      propellers.push(propeller);
    }

    // Add direction indicator (forward arrow)
    const arrowGeometry = new THREE.ConeGeometry(0.02, 0.08, 8);
    const arrowMaterial = new THREE.MeshLambertMaterial({ color: 0xef4444 });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.position.x = 0.15;
    arrow.rotation.z = -Math.PI / 2;
    droneGroup.add(arrow);

    scene.add(droneGroup);

    // Trajectory
    const maxTrajectoryPoints = 1000;
    const trajectoryPositions = new Float32Array(maxTrajectoryPoints * 3);
    const trajectoryGeometry = new THREE.BufferGeometry();
    trajectoryGeometry.setAttribute('position', new THREE.BufferAttribute(trajectoryPositions, 3));
    
    const trajectoryMaterial = new THREE.PointsMaterial({
      color: 0x3b82f6,
      size: 0.02,
      transparent: true,
      opacity: 0.6
    });
    
    const trajectory = new THREE.Points(trajectoryGeometry, trajectoryMaterial);
    scene.add(trajectory);

    // Store references
    sceneRef.current = {
      scene,
      camera,
      renderer,
      droneGroup,
      propellers,
      trajectory,
      trajectoryPositions,
      trajectoryIndex: 0,
      gridHelper
    };

    // Mouse controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let cameraDistance = 8;
    let cameraAngleX = Math.PI / 6;
    let cameraAngleY = Math.PI / 4;

    const updateCameraPosition = () => {
      if (!sceneRef.current) return;
      const { camera } = sceneRef.current;
      
      camera.position.x = cameraDistance * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);
      camera.position.y = cameraDistance * Math.sin(cameraAngleX);
      camera.position.z = cameraDistance * Math.sin(cameraAngleY) * Math.cos(cameraAngleX);
      camera.lookAt(0, 0, 0);
    };

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = event.clientX - previousMousePosition.x;
      const deltaY = event.clientY - previousMousePosition.y;
      
      cameraAngleY += deltaX * 0.01;
      cameraAngleX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngleX - deltaY * 0.01));
      
      updateCameraPosition();
      
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handleWheel = (event: WheelEvent) => {
      cameraDistance = Math.max(2, Math.min(20, cameraDistance + event.deltaY * 0.01));
      updateCameraPosition();
    };

    const handleResize = () => {
      if (!mountRef.current || !sceneRef.current) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      sceneRef.current.camera.aspect = width / height;
      sceneRef.current.camera.updateProjectionMatrix();
      sceneRef.current.renderer.setSize(width, height);
    };

    // Event listeners
    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('wheel', handleWheel);
    window.addEventListener('resize', handleResize);

    updateCameraPosition();

    // Animation loop
    const animate = () => {
      if (!sceneRef.current) return;
      
      const { renderer, scene, camera, propellers } = sceneRef.current;
      
      // Animate propellers
      propellers.forEach(propeller => {
        propeller.rotation.y += 0.3;
      });
      
      renderer.render(scene, camera);
      sceneRef.current.frameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      if (sceneRef.current?.frameId) {
        cancelAnimationFrame(sceneRef.current.frameId);
      }
      
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Update drone position and orientation
  useEffect(() => {
    if (!sceneRef.current) return;

    const { droneGroup, trajectory, trajectoryPositions } = sceneRef.current;
    const { position, orientation } = droneState;

    // Update drone position
    droneGroup.position.set(position.x, position.z, position.y); // Note: Y and Z swapped for Three.js

    // Update drone orientation (Euler angles)
    droneGroup.rotation.set(orientation.y, orientation.z, -orientation.x); // pitch, yaw, -roll

    // Update trajectory
    if (sceneRef.current.trajectoryIndex < trajectoryPositions.length / 3 - 1) {
      const index = sceneRef.current.trajectoryIndex * 3;
      trajectoryPositions[index] = position.x;
      trajectoryPositions[index + 1] = position.z;
      trajectoryPositions[index + 2] = position.y;
      
      const positionAttribute = trajectory.geometry.getAttribute('position') as THREE.BufferAttribute;
      positionAttribute.needsUpdate = true;
      trajectory.geometry.setDrawRange(0, sceneRef.current.trajectoryIndex + 1);
      
      sceneRef.current.trajectoryIndex++;
    }
  }, [droneState]);

  return (
    <div 
      ref={mountRef} 
      className={`w-full h-full bg-gradient-to-br from-background to-muted rounded-lg shadow-lg ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
};