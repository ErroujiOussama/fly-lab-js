/**
 * Main Drone Simulation Engine
 * Orchestrates physics, control, and data logging
 */

import { DroneModel, DroneState, MotorInputs } from '../physics/DroneModel';
import { PIDController, CascadedPIDController } from '../control/PIDController';

export interface SimulationConfig {
  timestep: number; // simulation timestep in seconds
  realTimeMultiplier: number; // 1.0 = real-time, 2.0 = 2x speed
  enablePhysics: boolean;
  enableControl: boolean;
}

export interface ControllerConfig {
  altitude: {
    kp: number;
    ki: number;
    kd: number;
    enabled: boolean;
  };
  attitude: {
    roll: { kp: number; ki: number; kd: number; enabled: boolean };
    pitch: { kp: number; ki: number; kd: number; enabled: boolean };
    yaw: { kp: number; ki: number; kd: number; enabled: boolean };
  };
  position: {
    x: {
      outer: { kp: number; ki: number; kd: number };
      inner: { kp: number; ki: number; kd: number };
      enabled: boolean;
    };
    y: {
      outer: { kp: number; ki: number; kd: number };
      inner: { kp: number; ki: number; kd: number };
      enabled: boolean;
    };
  };
}

export interface SetPoints {
  position: { x: number; y: number; z: number };
  attitude: { roll: number; pitch: number; yaw: number };
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
}

export class DroneSimulator {
  private drone: DroneModel;
  private config: SimulationConfig;
  private controllerConfig: ControllerConfig;
  
  // Controllers
  private altitudeController: PIDController;
  private rollController: PIDController;
  private pitchController: PIDController;
  private yawController: PIDController;
  private positionXController: CascadedPIDController;
  private positionYController: CascadedPIDController;
  
  private setpoints: SetPoints;
  private currentTime: number;
  private isRunning: boolean;
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  
  // Data logging
  private dataHistory: SimulationData[] = [];
  private maxHistoryLength = 10000; // ~100 seconds at 100Hz
  
  // Event callbacks
  private onUpdate?: (data: SimulationData) => void;
  private onReset?: () => void;

  constructor() {
    this.drone = new DroneModel();
    this.currentTime = 0;
    this.isRunning = false;
    
    this.config = {
      timestep: 0.01, // 100Hz simulation
      realTimeMultiplier: 1.0,
      enablePhysics: true,
      enableControl: true
    };

    this.controllerConfig = {
      altitude: { kp: 8.0, ki: 0.5, kd: 2.0, enabled: true },
      attitude: {
        roll: { kp: 6.0, ki: 0.1, kd: 1.5, enabled: true },
        pitch: { kp: 6.0, ki: 0.1, kd: 1.5, enabled: true },
        yaw: { kp: 4.0, ki: 0.05, kd: 1.0, enabled: true }
      },
      position: {
        x: {
          outer: { kp: 2.0, ki: 0.1, kd: 0.5 },
          inner: { kp: 3.0, ki: 0.0, kd: 0.8 },
          enabled: true
        },
        y: {
          outer: { kp: 2.0, ki: 0.1, kd: 0.5 },
          inner: { kp: 3.0, ki: 0.0, kd: 0.8 },
          enabled: true
        }
      }
    };

    this.setpoints = {
      position: { x: 0, y: 0, z: 2 }, // Hover at 2m height
      attitude: { roll: 0, pitch: 0, yaw: 0 }
    };

    this.initializeControllers();
  }

  private initializeControllers(): void {
    const { altitude, attitude, position } = this.controllerConfig;
    
    this.altitudeController = new PIDController(altitude, 10, 1, 0);
    this.rollController = new PIDController(attitude.roll, 5, 0.5, -0.5);
    this.pitchController = new PIDController(attitude.pitch, 5, 0.5, -0.5);
    this.yawController = new PIDController(attitude.yaw, 5, 0.3, -0.3);
    
    this.positionXController = new CascadedPIDController(
      position.x.outer,
      position.x.inner,
      3, // max velocity
      0.3 // max attitude angle
    );
    
    this.positionYController = new CascadedPIDController(
      position.y.outer,
      position.y.inner,
      3, // max velocity
      0.3 // max attitude angle
    );
  }

  setConfig(config: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setControllerConfig(config: Partial<ControllerConfig>): void {
    this.controllerConfig = { ...this.controllerConfig, ...config };
    this.updateControllerGains();
  }

  private updateControllerGains(): void {
    const { altitude, attitude, position } = this.controllerConfig;
    
    this.altitudeController.setGains(altitude);
    this.altitudeController.setEnabled(altitude.enabled);
    
    this.rollController.setGains(attitude.roll);
    this.rollController.setEnabled(attitude.roll.enabled);
    
    this.pitchController.setGains(attitude.pitch);
    this.pitchController.setEnabled(attitude.pitch.enabled);
    
    this.yawController.setGains(attitude.yaw);
    this.yawController.setEnabled(attitude.yaw.enabled);
    
    this.positionXController.setOuterGains(position.x.outer);
    this.positionXController.setInnerGains(position.x.inner);
    this.positionXController.setEnabled(position.x.enabled);
    
    this.positionYController.setOuterGains(position.y.outer);
    this.positionYController.setInnerGains(position.y.inner);
    this.positionYController.setEnabled(position.y.enabled);
  }

  setSetpoints(setpoints: Partial<SetPoints>): void {
    this.setpoints = { ...this.setpoints, ...setpoints };
  }

  private calculateControlOutputs(state: DroneState, dt: number) {
    const { position, orientation, velocity } = state;
    
    // Altitude control (Z-axis)
    const altitudeOutput = this.altitudeController.update(
      this.setpoints.position.z,
      position.z,
      dt
    );

    // Position control (X, Y axes) -> desired attitude angles
    const pitchDesired = this.positionXController.update(
      this.setpoints.position.x,
      position.x,
      velocity.x,
      dt
    );

    const rollDesired = -this.positionYController.update(
      this.setpoints.position.y,
      position.y,
      velocity.y,
      dt
    );

    // Attitude control
    const rollOutput = this.rollController.update(
      rollDesired,
      orientation.roll,
      dt
    );

    const pitchOutput = this.pitchController.update(
      pitchDesired,
      orientation.pitch,
      dt
    );

    const yawOutput = this.yawController.update(
      this.setpoints.attitude.yaw,
      orientation.yaw,
      dt
    );

    return {
      altitude: altitudeOutput,
      roll: rollOutput,
      pitch: pitchOutput,
      yaw: yawOutput,
      positionX: pitchDesired,
      positionY: rollDesired
    };
  }

  private controlOutputsToMotorInputs(controlOutputs: any): MotorInputs {
    const { altitude, roll, pitch, yaw } = controlOutputs;
    
    // Base thrust for hovering (normalized)
    const baseThrust = 0.65; // Approximately hover thrust
    
    // Combine control outputs
    const motor1 = baseThrust + altitude + pitch + yaw;  // Front-left
    const motor2 = baseThrust + altitude + pitch - yaw;  // Front-right
    const motor3 = baseThrust + altitude - pitch + yaw;  // Rear-left
    const motor4 = baseThrust + altitude - pitch - yaw;  // Rear-right

    // Apply roll control
    const rollAdjustment = roll * 0.3;
    
    return {
      motor1: Math.max(0, Math.min(1, motor1 - rollAdjustment)),
      motor2: Math.max(0, Math.min(1, motor2 + rollAdjustment)),
      motor3: Math.max(0, Math.min(1, motor3 - rollAdjustment)),
      motor4: Math.max(0, Math.min(1, motor4 + rollAdjustment))
    };
  }

  private step(): void {
    const state = this.drone.getState();
    const dt = this.config.timestep;

    let motorInputs: MotorInputs;
    let controlOutputs: any;
    let errors: any;

    if (this.config.enableControl) {
      controlOutputs = this.calculateControlOutputs(state, dt);
      motorInputs = this.controlOutputsToMotorInputs(controlOutputs);
      
      // Calculate errors for logging
      errors = {
        altitude: this.altitudeController.getState().error,
        roll: this.rollController.getState().error,
        pitch: this.pitchController.getState().error,
        yaw: this.yawController.getState().error,
        positionX: this.positionXController.getOuterState().error,
        positionY: this.positionYController.getOuterState().error
      };
    } else {
      // Manual mode or no control
      motorInputs = { motor1: 0.6, motor2: 0.6, motor3: 0.6, motor4: 0.6 };
      controlOutputs = { altitude: 0, roll: 0, pitch: 0, yaw: 0, positionX: 0, positionY: 0 };
      errors = { altitude: 0, roll: 0, pitch: 0, yaw: 0, positionX: 0, positionY: 0 };
    }

    // Update physics
    if (this.config.enablePhysics) {
      this.drone.update(motorInputs, dt);
    }

    // Log data
    const data: SimulationData = {
      time: this.currentTime,
      state: this.drone.getState(),
      motorInputs,
      controlOutputs,
      errors,
      setpoints: { ...this.setpoints }
    };

    this.dataHistory.push(data);
    if (this.dataHistory.length > this.maxHistoryLength) {
      this.dataHistory.shift();
    }

    this.currentTime += dt;

    // Notify observers
    if (this.onUpdate) {
      this.onUpdate(data);
    }
  }

  private animate = (frameTime: number): void => {
    if (!this.isRunning) return;

    const deltaTime = frameTime - this.lastFrameTime;
    const targetDelta = this.config.timestep * 1000 / this.config.realTimeMultiplier;

    if (deltaTime >= targetDelta) {
      this.step();
      this.lastFrameTime = frameTime;
    }

    this.animationId = requestAnimationFrame(this.animate);
  };

  start(): void {
    if (!this.isRunning) {
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.animationId = requestAnimationFrame(this.animate);
    }
  }

  pause(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  reset(): void {
    this.pause();
    this.drone.reset();
    this.currentTime = 0;
    this.dataHistory = [];
    
    // Reset controllers
    this.altitudeController.reset();
    this.rollController.reset();
    this.pitchController.reset();
    this.yawController.reset();
    this.positionXController.reset();
    this.positionYController.reset();

    if (this.onReset) {
      this.onReset();
    }
  }

  getDroneState(): DroneState {
    return this.drone.getState();
  }

  getDataHistory(): SimulationData[] {
    return [...this.dataHistory];
  }

  getCurrentData(): SimulationData | null {
    return this.dataHistory[this.dataHistory.length - 1] || null;
  }

  isSimulationRunning(): boolean {
    return this.isRunning;
  }

  setUpdateCallback(callback: (data: SimulationData) => void): void {
    this.onUpdate = callback;
  }

  setResetCallback(callback: () => void): void {
    this.onReset = callback;
  }

  getControllerConfig(): ControllerConfig {
    return { ...this.controllerConfig };
  }

  getSetpoints(): SetPoints {
    return { ...this.setpoints };
  }
}