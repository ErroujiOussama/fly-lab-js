/**
 * 3D Drone Visualization using Three.js
 */

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { DroneState, Waypoint, Vector3D } from '@/shared/types/simulation';

interface DroneVisualizationProps {
  droneState: DroneState;
  waypoints: Waypoint[];
  currentWaypointIndex: number;
  onAddWaypoint: (position: Vector3D) => void;
  className?: string;
}

export const DroneVisualization: React.FC<DroneVisualizationProps> = ({
  droneState,
  waypoints,
  currentWaypointIndex,
  onAddWaypoint,
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
    gridHelper: THREE.Plane;
    waypointGroup: THREE.Group;
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
    // Grid (using a plane for raycasting)
    const gridGeometry = new THREE.PlaneGeometry(20, 20);
    const gridMaterial = new THREE.MeshLambertMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const gridHelper = new THREE.Mesh(gridGeometry, gridMaterial);
    gridHelper.rotation.x = -Math.PI / 2;
    gridHelper.receiveShadow = true;
    scene.add(gridHelper);

    const gridLines = new THREE.GridHelper(20, 20, 0x1e40af, 0x94a3b8);
    scene.add(gridLines);

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

    // Waypoint visualization group
    const waypointGroup = new THREE.Group();
    scene.add(waypointGroup);

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
      gridHelper,
      waypointGroup
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
      isDragging = false; // Will be set to true on mousemove
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - previousMousePosition.x;
      const deltaY = event.clientY - previousMousePosition.y;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        isDragging = true;
      }

      if (!isDragging) return;
      
      cameraAngleY += deltaX * 0.01;
      cameraAngleX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngleX - deltaY * 0.01));
      
      updateCameraPosition();
      
      previousMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseUp = (event: MouseEvent) => {
      if (!isDragging && sceneRef.current) {
        // This is a click, not a drag
        const { camera, renderer, gridHelper } = sceneRef.current;
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObject(gridHelper);

        if (intersects.length > 0) {
          const point = intersects[0].point;
          onAddWaypoint({ x: point.x, y: point.z, z: 2 }); // Default new waypoints to 2m altitude
        }
      }
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

  // Update waypoints visualization
  useEffect(() => {
    if (!sceneRef.current) return;
    const { waypointGroup } = sceneRef.current;

    // Clear previous waypoints
    while (waypointGroup.children.length > 0) {
      waypointGroup.remove(waypointGroup.children[0]);
    }

    if (waypoints.length === 0) return;

    // Materials
    const pendingMaterial = new THREE.MeshLambertMaterial({ color: 0x64748b });
    const currentMaterial = new THREE.MeshLambertMaterial({ color: 0x2563eb });
    const completedMaterial = new THREE.MeshLambertMaterial({ color: 0x16a34a });
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.7 });

    const waypointGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16);
    const points: THREE.Vector3[] = [];

    waypoints.forEach((wp, index) => {
      let material = pendingMaterial;
      if (index < currentWaypointIndex) {
        material = completedMaterial;
      } else if (index === currentWaypointIndex) {
        material = currentMaterial;
      }

      const waypointMesh = new THREE.Mesh(waypointGeometry, material);
      waypointMesh.position.set(wp.x, wp.z, wp.y); // Y and Z swapped
      waypointGroup.add(waypointMesh);

      const textSprite = createTextSprite(`${index + 1}`, { fontsize: 24, fontface: 'Arial', textColor: { r: 255, g: 255, b: 255, a: 1.0 }});
      textSprite.position.set(wp.x, wp.z + 0.3, wp.y);
      waypointGroup.add(textSprite);

      points.push(new THREE.Vector3(wp.x, wp.z, wp.y));
    });

    // Line path
    if (points.length > 1) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      waypointGroup.add(line);
    }

  }, [waypoints, currentWaypointIndex]);

  return (
    <div 
      ref={mountRef} 
      className={`w-full h-full bg-gradient-to-br from-background to-muted rounded-lg shadow-lg ${className}`}
      style={{ minHeight: '400px' }}
    />
  );
};

// Helper to create text sprites
function createTextSprite(message: string, parameters: any) {
  parameters = parameters || {};
  const fontface = parameters.fontface || 'Arial';
  const fontsize = parameters.fontsize || 18;
  const borderThickness = parameters.borderThickness || 4;
  const borderColor = parameters.borderColor || { r: 0, g: 0, b: 0, a: 1.0 };
  const backgroundColor = parameters.backgroundColor || { r: 255, g: 255, b: 255, a: 1.0 };
  const textColor = parameters.textColor || { r: 0, g: 0, b: 0, a: 1.0 };

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return new THREE.Sprite();

  context.font = `Bold ${fontsize}px ${fontface}`;
  const metrics = context.measureText(message);
  const textWidth = metrics.width;

  context.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
  context.strokeStyle = `rgba(${borderColor.r}, ${borderColor.g}, ${borderColor.b}, ${borderColor.a})`;
  context.lineWidth = borderThickness;

  context.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, 1.0)`;
  context.fillText(message, borderThickness, fontsize + borderThickness);

  const texture = new THREE.Texture(canvas);
  texture.needsUpdate = true;

  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.5, 0.25, 1.0);
  return sprite;
}