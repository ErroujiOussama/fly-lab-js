# Fly Lab JS – Web Quadrotor Flight Simulator

> Browser-based quadcopter simulator with real-time 6DOF physics, cascaded PID control loops, interactive parameter tuning, and Three.js visualization.

## Key Features
- 6DOF Newton–Euler dynamics (mass, inertia tensor, thrust, drag)
- Cascaded PID: position → velocity → attitude (roll, pitch, yaw) + altitude hold
- Manual vs position-hold flight modes
- Adjustable physical & control parameters (mass, arm length, drag, thrust ratios)
- Real-time 3D scene (body, propellers, trajectory trail, grid)
- Telemetry logging for attitude, position, setpoints, errors, motor outputs
- Clean React + TypeScript + Tailwind UI with engineering design system

## Educational Focus
The project emphasizes clarity: each control loop is tunable, with tooltips and structured panels to illustrate how gains influence stability, responsiveness, and overshoot.

## TODO 
- [ ] Add motor dynamics & response lag
- [ ] Implement wind & turbulence models
- [ ] Introduce waypoint / trajectory planner
- [ ] Export/import tuning profiles
- [ ] Flight log playback & comparison mode

## Technologies
React • TypeScript • Three.js 

