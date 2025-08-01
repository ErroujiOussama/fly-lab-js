/**
 * Shared Types for Drone Simulation
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface DroneState {
  position: Vector3D;
  velocity: Vector3D;
  orientation: Vector3D; // roll, pitch, yaw in radians
  angularVelocity: Vector3D;
}

export interface MotorInputs {
  motor1: number; // [0, 1]
  motor2: number;
  motor3: number;
  motor4: number;
}

export type FlightMode =
  | 'manual'
  | 'stabilized'
  | 'altitude_hold'
  | 'position_hold'
  | 'waypoint';

export interface Waypoint extends Vector3D {
  id: string;
  name?: string;
}

export interface ManualInputs {
  pitch: number;    // [-1, 1]
  roll: number;     // [-1, 1]
  yaw: number;      // [-1, 1]
  throttle: number; // [0, 1]
}

export interface PIDGains {
  kp: number;
  ki: number;
  kd: number;
  enabled: boolean;
}

export interface ControllerConfig {
  altitude: PIDGains;
  attitude: {
    roll: PIDGains;
    pitch: PIDGains;
    yaw: PIDGains;
  };
  position: {
    x: {
      outer: Omit<PIDGains, 'enabled'>;
      inner: Omit<PIDGains, 'enabled'>;
      enabled: boolean;
    };
    y: {
      outer: Omit<PIDGains, 'enabled'>;
      inner: Omit<PIDGains, 'enabled'>;
      enabled: boolean;
    };
  };
}

export interface SetPoints {
  position: Vector3D;
  attitude: Vector3D;
}

export interface SimulationConfig {
  timestep: number;
  realTimeMultiplier: number;
  enablePhysics: boolean;
  enableControl: boolean;
}

export interface DroneParams {
  mass: number;
  length: number;
  inertia: {
    Ixx: number;
    Iyy: number;
    Izz: number;
  };
  dragCoeff: number;
  maxThrust: number;
  thrustToTorqueRatio: number;
}

export interface SimulationData {
  time: number;
  state: DroneState;
  motorInputs: MotorInputs;
  controlOutputs: {
    altitude: number;
    roll: number;
    pitch: number;
    yaw: number;
    positionX: number;
    positionY: number;
  };
  errors: {
    altitude: number;
    roll: number;
    pitch: number;
    yaw: number;
    positionX: number;
    positionY: number;
  };
  setpoints: SetPoints;
  flightMode: FlightMode;
  manualInputs: ManualInputs;
}