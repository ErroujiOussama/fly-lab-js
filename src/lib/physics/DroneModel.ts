/**
 * Quadrotor Drone Physics Model
 * Implements 6DOF dynamics based on Newton-Euler equations
 */

export interface DroneState {
  // Position (m)
  position: { x: number; y: number; z: number };
  // Velocity (m/s)
  velocity: { x: number; y: number; z: number };
  // Orientation (rad) - Euler angles
  orientation: { roll: number; pitch: number; yaw: number };
  // Angular velocity (rad/s)
  angularVelocity: { x: number; y: number; z: number };
}

export interface DroneParameters {
  mass: number; // kg
  length: number; // arm length (m)
  inertia: {
    Ixx: number;
    Iyy: number;
    Izz: number;
  };
  dragCoeff: number;
  maxThrust: number; // N per motor
  thrustToTorqueRatio: number;
}

export interface MotorInputs {
  motor1: number; // [0, 1]
  motor2: number;
  motor3: number;
  motor4: number;
}

export class DroneModel {
  private state: DroneState;
  private params: DroneParameters;
  private gravity = 9.81; // m/s²

  constructor(initialState?: Partial<DroneState>, parameters?: Partial<DroneParameters>) {
    this.state = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      orientation: { roll: 0, pitch: 0, yaw: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
      ...initialState
    };

    this.params = {
      mass: 1.5, // kg
      length: 0.25, // 25cm arm length
      inertia: {
        Ixx: 0.0347563,
        Iyy: 0.0347563,
        Izz: 0.0577
      },
      dragCoeff: 0.01,
      maxThrust: 15, // N per motor (total max thrust = 60N for 1.5kg drone)
      thrustToTorqueRatio: 0.016,
      ...parameters
    };
  }

  getState(): DroneState {
    return { ...this.state };
  }

  setState(newState: Partial<DroneState>): void {
    this.state = { ...this.state, ...newState };
  }

  getParameters(): DroneParameters {
    return { ...this.params };
  }

  updateParameters(newParams: Partial<DroneParameters>): void {
    this.params = { ...this.params, ...newParams };
  }

  /**
   * Calculate forces and torques from motor inputs
   */
  private calculateForcesAndTorques(inputs: MotorInputs) {
    const { motor1, motor2, motor3, motor4 } = inputs;
    const { maxThrust, length, thrustToTorqueRatio } = this.params;

    // Convert normalized inputs to thrust forces
    const f1 = motor1 * maxThrust;
    const f2 = motor2 * maxThrust;
    const f3 = motor3 * maxThrust;
    const f4 = motor4 * maxThrust;

    // Total thrust (body frame Z-axis)
    const totalThrust = f1 + f2 + f3 + f4;

    // Torques about body axes
    // Roll torque (about X-axis): front-back motor difference
    const rollTorque = length * (f2 + f4 - f1 - f3) / Math.sqrt(2);
    
    // Pitch torque (about Y-axis): left-right motor difference  
    const pitchTorque = length * (f1 + f2 - f3 - f4) / Math.sqrt(2);
    
    // Yaw torque (about Z-axis): from motor reaction torques
    const yawTorque = thrustToTorqueRatio * (f1 + f3 - f2 - f4);

    return {
      thrust: totalThrust,
      torques: {
        roll: rollTorque,
        pitch: pitchTorque,
        yaw: yawTorque
      }
    };
  }

  /**
   * Rotation matrix from body frame to world frame
   */
  private getRotationMatrix() {
    const { roll, pitch, yaw } = this.state.orientation;
    
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);

    return {
      R11: cp * cy,
      R12: sr * sp * cy - cr * sy,
      R13: cr * sp * cy + sr * sy,
      R21: cp * sy,
      R22: sr * sp * sy + cr * cy,
      R23: cr * sp * sy - sr * cy,
      R31: -sp,
      R32: sr * cp,
      R33: cr * cp
    };
  }

  /**
   * Update drone state using numerical integration (RK4)
   */
  update(inputs: MotorInputs, dt: number): void {
    // RK4 integration
    const k1 = this.computeDerivatives(this.state, inputs);
    
    const state2 = this.addStateDerivative(this.state, k1, dt * 0.5);
    const k2 = this.computeDerivatives(state2, inputs);
    
    const state3 = this.addStateDerivative(this.state, k2, dt * 0.5);
    const k3 = this.computeDerivatives(state3, inputs);
    
    const state4 = this.addStateDerivative(this.state, k3, dt);
    const k4 = this.computeDerivatives(state4, inputs);

    // Combine derivatives
    const finalDerivative = {
      position: {
        x: (k1.position.x + 2*k2.position.x + 2*k3.position.x + k4.position.x) / 6,
        y: (k1.position.y + 2*k2.position.y + 2*k3.position.y + k4.position.y) / 6,
        z: (k1.position.z + 2*k2.position.z + 2*k3.position.z + k4.position.z) / 6
      },
      velocity: {
        x: (k1.velocity.x + 2*k2.velocity.x + 2*k3.velocity.x + k4.velocity.x) / 6,
        y: (k1.velocity.y + 2*k2.velocity.y + 2*k3.velocity.y + k4.velocity.y) / 6,
        z: (k1.velocity.z + 2*k2.velocity.z + 2*k3.velocity.z + k4.velocity.z) / 6
      },
      orientation: {
        roll: (k1.orientation.roll + 2*k2.orientation.roll + 2*k3.orientation.roll + k4.orientation.roll) / 6,
        pitch: (k1.orientation.pitch + 2*k2.orientation.pitch + 2*k3.orientation.pitch + k4.orientation.pitch) / 6,
        yaw: (k1.orientation.yaw + 2*k2.orientation.yaw + 2*k3.orientation.yaw + k4.orientation.yaw) / 6
      },
      angularVelocity: {
        x: (k1.angularVelocity.x + 2*k2.angularVelocity.x + 2*k3.angularVelocity.x + k4.angularVelocity.x) / 6,
        y: (k1.angularVelocity.y + 2*k2.angularVelocity.y + 2*k3.angularVelocity.y + k4.angularVelocity.y) / 6,
        z: (k1.angularVelocity.z + 2*k2.angularVelocity.z + 2*k3.angularVelocity.z + k4.angularVelocity.z) / 6
      }
    };

    // Update state
    this.state.position.x += finalDerivative.position.x * dt;
    this.state.position.y += finalDerivative.position.y * dt;
    this.state.position.z += finalDerivative.position.z * dt;

    this.state.velocity.x += finalDerivative.velocity.x * dt;
    this.state.velocity.y += finalDerivative.velocity.y * dt;
    this.state.velocity.z += finalDerivative.velocity.z * dt;

    this.state.orientation.roll += finalDerivative.orientation.roll * dt;
    this.state.orientation.pitch += finalDerivative.orientation.pitch * dt;
    this.state.orientation.yaw += finalDerivative.orientation.yaw * dt;

    this.state.angularVelocity.x += finalDerivative.angularVelocity.x * dt;
    this.state.angularVelocity.y += finalDerivative.angularVelocity.y * dt;
    this.state.angularVelocity.z += finalDerivative.angularVelocity.z * dt;

    // Normalize angles
    this.state.orientation.roll = this.normalizeAngle(this.state.orientation.roll);
    this.state.orientation.pitch = this.normalizeAngle(this.state.orientation.pitch);
    this.state.orientation.yaw = this.normalizeAngle(this.state.orientation.yaw);
  }

  private computeDerivatives(state: DroneState, inputs: MotorInputs) {
    const forces = this.calculateForcesAndTorques(inputs);
    const R = this.getRotationMatrix();
    
    // Position derivatives = velocity
    const positionDot = { ...state.velocity };

    // Velocity derivatives from forces
    const { mass, dragCoeff } = this.params;
    
    // Drag forces (simplified)
    const dragX = -dragCoeff * state.velocity.x * Math.abs(state.velocity.x);
    const dragY = -dragCoeff * state.velocity.y * Math.abs(state.velocity.y);
    const dragZ = -dragCoeff * state.velocity.z * Math.abs(state.velocity.z);

    // Forces in world frame
    const forceX = R.R13 * forces.thrust + dragX;
    const forceY = R.R23 * forces.thrust + dragY;
    const forceZ = R.R33 * forces.thrust - mass * this.gravity + dragZ;

    const velocityDot = {
      x: forceX / mass,
      y: forceY / mass,
      z: forceZ / mass
    };

    // Orientation derivatives from angular velocity
    const { roll, pitch } = state.orientation;
    const { x: p, y: q, z: r } = state.angularVelocity;
    
    const orientationDot = {
      roll: p + q * Math.sin(roll) * Math.tan(pitch) + r * Math.cos(roll) * Math.tan(pitch),
      pitch: q * Math.cos(roll) - r * Math.sin(roll),
      yaw: (q * Math.sin(roll) + r * Math.cos(roll)) / Math.cos(pitch)
    };

    // Angular velocity derivatives from torques
    const { Ixx, Iyy, Izz } = this.params.inertia;
    
    const angularVelocityDot = {
      x: (forces.torques.roll + (Iyy - Izz) * q * r) / Ixx,
      y: (forces.torques.pitch + (Izz - Ixx) * p * r) / Iyy,
      z: (forces.torques.yaw + (Ixx - Iyy) * p * q) / Izz
    };

    return {
      position: positionDot,
      velocity: velocityDot,
      orientation: orientationDot,
      angularVelocity: angularVelocityDot
    };
  }

  private addStateDerivative(state: DroneState, derivative: any, dt: number): DroneState {
    return {
      position: {
        x: state.position.x + derivative.position.x * dt,
        y: state.position.y + derivative.position.y * dt,
        z: state.position.z + derivative.position.z * dt
      },
      velocity: {
        x: state.velocity.x + derivative.velocity.x * dt,
        y: state.velocity.y + derivative.velocity.y * dt,
        z: state.velocity.z + derivative.velocity.z * dt
      },
      orientation: {
        roll: state.orientation.roll + derivative.orientation.roll * dt,
        pitch: state.orientation.pitch + derivative.orientation.pitch * dt,
        yaw: state.orientation.yaw + derivative.orientation.yaw * dt
      },
      angularVelocity: {
        x: state.angularVelocity.x + derivative.angularVelocity.x * dt,
        y: state.angularVelocity.y + derivative.angularVelocity.y * dt,
        z: state.angularVelocity.z + derivative.angularVelocity.z * dt
      }
    };
  }

  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  reset(): void {
    this.state = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      orientation: { roll: 0, pitch: 0, yaw: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 }
    };
  }
}