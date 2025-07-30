/**
 * PID Controller Implementation
 * Supports individual and cascaded control loops
 */

import { PIDGains } from '@/shared/types/simulation';

interface PIDState {
  error: number;
  integral: number;
  derivative: number;
  lastError: number;
  output: number;
}

export class PIDController {
  private gains: PIDGains;
  private state: PIDState;
  private outputMin: number;
  private outputMax: number;
  private enabled: boolean;

  constructor(
    gains: PIDGains,
    outputMax: number = 1,
    outputMin: number = -1
  ) {
    this.gains = { ...gains };
    this.outputMin = outputMin;
    this.outputMax = outputMax;
    this.enabled = gains.enabled;
    
    this.state = {
      error: 0,
      integral: 0,
      derivative: 0,
      lastError: 0,
      output: 0
    };
  }

  update(setpoint: number, measurement: number, dt: number): number {
    if (!this.enabled) return 0;

    this.state.error = setpoint - measurement;
    this.state.integral += this.state.error * dt;
    this.state.derivative = (this.state.error - this.state.lastError) / dt;
    
    // Calculate output
    this.state.output = 
      this.gains.kp * this.state.error +
      this.gains.ki * this.state.integral +
      this.gains.kd * this.state.derivative;
    
    // Clamp output
    this.state.output = Math.max(this.outputMin, Math.min(this.outputMax, this.state.output));
    
    // Anti-windup: limit integral if output is saturated
    if ((this.state.output >= this.outputMax && this.state.error > 0) ||
        (this.state.output <= this.outputMin && this.state.error < 0)) {
      this.state.integral -= this.state.error * dt;
    }
    
    this.state.lastError = this.state.error;
    return this.state.output;
  }

  reset(): void {
    this.state = {
      error: 0,
      integral: 0,
      derivative: 0,
      lastError: 0,
      output: 0
    };
  }

  setGains(gains: PIDGains): void {
    this.gains = { ...gains };
    this.enabled = gains.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.reset();
    }
  }

  getState(): PIDState {
    return { ...this.state };
  }

  getGains(): PIDGains {
    return { ...this.gains };
  }
}

export class CascadedPIDController {
  private outerController: PIDController;
  private innerController: PIDController;
  private maxInnerSetpoint: number;
  private enabled: boolean;

  constructor(
    outerGains: Omit<PIDGains, 'enabled'>,
    innerGains: Omit<PIDGains, 'enabled'>,
    maxVelocity: number = 3,
    maxInnerSetpoint: number = 0.3
  ) {
    this.outerController = new PIDController(
      { ...outerGains, enabled: true },
      maxVelocity,
      -maxVelocity
    );
    this.innerController = new PIDController(
      { ...innerGains, enabled: true },
      maxInnerSetpoint,
      -maxInnerSetpoint
    );
    this.maxInnerSetpoint = maxInnerSetpoint;
    this.enabled = true;
  }

  update(
    positionSetpoint: number,
    position: number,
    velocity: number,
    dt: number
  ): number {
    if (!this.enabled) return 0;

    // Outer loop: position -> velocity setpoint
    const velocitySetpoint = this.outerController.update(positionSetpoint, position, dt);
    
    // Inner loop: velocity -> attitude setpoint
    const attitudeSetpoint = this.innerController.update(velocitySetpoint, velocity, dt);
    
    return Math.max(-this.maxInnerSetpoint, Math.min(this.maxInnerSetpoint, attitudeSetpoint));
  }

  reset(): void {
    this.outerController.reset();
    this.innerController.reset();
  }

  setOuterGains(gains: Omit<PIDGains, 'enabled'>): void {
    this.outerController.setGains({ ...gains, enabled: true });
  }

  setInnerGains(gains: Omit<PIDGains, 'enabled'>): void {
    this.innerController.setGains({ ...gains, enabled: true });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.outerController.setEnabled(enabled);
    this.innerController.setEnabled(enabled);
  }

  getOuterState() {
    return this.outerController.getState();
  }

  getInnerState() {
    return this.innerController.getState();
  }
}