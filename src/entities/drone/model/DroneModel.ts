/**
 * Drone Physics Model
 * Implements 6DOF quadrotor dynamics with Newton-Euler equations
 */

import { DroneState, MotorInputs, Vector3D } from '@/shared/types/simulation';

interface DroneParameters {
  mass: number;
  length: number; // arm length
  inertia: {
    Ixx: number;
    Iyy: number;
    Izz: number;
  };
  dragCoeff: number;
  maxThrust: number;
  thrustToTorqueRatio: number;
}

export class DroneModel {
  private state: DroneState;
  private params: DroneParameters;
  private gravity = 9.81;

  constructor(params?: Partial<DroneParameters>) {
    this.params = {
      mass: 1.5, // kg
      length: 0.25, // m
      inertia: { Ixx: 0.0347563, Iyy: 0.0347563, Izz: 0.0577 },
      dragCoeff: 0.01,
      maxThrust: 15, // N
      thrustToTorqueRatio: 0.016,
      ...params
    };

    this.state = this.getInitialState();
  }

  private getInitialState(): DroneState {
    return {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      orientation: { x: 0, y: 0, z: 0 }, // roll, pitch, yaw
      angularVelocity: { x: 0, y: 0, z: 0 }
    };
  }

  update(motorInputs: MotorInputs, dt: number): void {
    const forces = this.calculateForces(motorInputs);
    const torques = this.calculateTorques(motorInputs);
    
    this.integrateMotion(forces, torques, dt);
  }

  private calculateForces(inputs: MotorInputs): Vector3D {
    const { motor1, motor2, motor3, motor4 } = inputs;
    const totalThrust = (motor1 + motor2 + motor3 + motor4) * this.params.maxThrust;
    const { position, velocity, orientation } = this.state;
    const roll = orientation.x;
    const pitch = orientation.y;
    const yaw = orientation.z;
    
    // Thrust in body frame (pointing up)
    const thrustBody = { x: 0, y: 0, z: totalThrust };
    
    // Transform to world frame using rotation matrix
    const forces = this.bodyToWorld(thrustBody, roll, pitch, yaw);
    
    // Add gravity
    forces.z -= this.params.mass * this.gravity;
    
    // Add drag
    const dragForce = this.calculateDrag();
    forces.x -= dragForce.x;
    forces.y -= dragForce.y;
    forces.z -= dragForce.z;
    
    return forces;
  }

  private calculateTorques(inputs: MotorInputs): Vector3D {
    const { motor1, motor2, motor3, motor4 } = inputs;
    const { length, maxThrust, thrustToTorqueRatio } = this.params;
    
    // Individual motor thrusts
    const f1 = motor1 * maxThrust;
    const f2 = motor2 * maxThrust;
    const f3 = motor3 * maxThrust;
    const f4 = motor4 * maxThrust;
    
    // Torques due to motor placement (X configuration)
    const armLength = length / Math.sqrt(2);
    const tauX = (f1 - f2 - f3 + f4) * armLength; // Roll
    const tauY = (f1 + f2 - f3 - f4) * armLength; // Pitch
    
    // Yaw torque from motor directions
    const tauZ = (f1 - f2 + f3 - f4) * thrustToTorqueRatio;
    
    return { x: tauX, y: tauY, z: tauZ };
  }

  private calculateDrag(): Vector3D {
    const { velocity } = this.state;
    const { dragCoeff } = this.params;
    
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
    const dragMagnitude = dragCoeff * speed * speed;
    
    if (speed === 0) return { x: 0, y: 0, z: 0 };
    
    return {
      x: -dragMagnitude * velocity.x / speed,
      y: -dragMagnitude * velocity.y / speed,
      z: -dragMagnitude * velocity.z / speed
    };
  }

  private bodyToWorld(bodyVector: Vector3D, roll: number, pitch: number, yaw: number): Vector3D {
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    
    return {
      x: bodyVector.x * (cy * cp) + 
         bodyVector.y * (cy * sp * sr - sy * cr) + 
         bodyVector.z * (cy * sp * cr + sy * sr),
      y: bodyVector.x * (sy * cp) + 
         bodyVector.y * (sy * sp * sr + cy * cr) + 
         bodyVector.z * (sy * sp * cr - cy * sr),
      z: bodyVector.x * (-sp) + 
         bodyVector.y * (cp * sr) + 
         bodyVector.z * (cp * cr)
    };
  }

  private integrateMotion(forces: Vector3D, torques: Vector3D, dt: number): void {
    const { mass, inertia } = this.params;
    
    // Linear motion
    const acceleration = {
      x: forces.x / mass,
      y: forces.y / mass,
      z: forces.z / mass
    };
    
    this.state.velocity.x += acceleration.x * dt;
    this.state.velocity.y += acceleration.y * dt;
    this.state.velocity.z += acceleration.z * dt;
    
    this.state.position.x += this.state.velocity.x * dt;
    this.state.position.y += this.state.velocity.y * dt;
    this.state.position.z += this.state.velocity.z * dt;
    
    // Angular motion
    const angularAcceleration = {
      x: torques.x / inertia.Ixx,
      y: torques.y / inertia.Iyy,
      z: torques.z / inertia.Izz
    };
    
    this.state.angularVelocity.x += angularAcceleration.x * dt;
    this.state.angularVelocity.y += angularAcceleration.y * dt;
    this.state.angularVelocity.z += angularAcceleration.z * dt;
    
    this.state.orientation.x += this.state.angularVelocity.x * dt;
    this.state.orientation.y += this.state.angularVelocity.y * dt;
    this.state.orientation.z += this.state.angularVelocity.z * dt;
    
    // Prevent ground penetration
    if (this.state.position.z < 0) {
      this.state.position.z = 0;
      this.state.velocity.z = Math.max(0, this.state.velocity.z);
    }
  }

  getState(): DroneState {
    return { ...this.state };
  }

  setState(newState: Partial<DroneState>): void {
    this.state = { ...this.state, ...newState };
  }

  reset(): void {
    this.state = this.getInitialState();
  }

  setParameters(params: Partial<DroneParameters>): void {
    this.params = { ...this.params, ...params };
  }

  getParameters(): DroneParameters {
    return { ...this.params };
  }
}