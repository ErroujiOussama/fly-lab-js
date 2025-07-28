/**
 * PID Controller Implementation for Drone Control
 */

export interface PIDGains {
  kp: number; // Proportional gain
  ki: number; // Integral gain
  kd: number; // Derivative gain
}

export interface PIDState {
  error: number;
  integral: number;
  derivative: number;
  lastError: number;
  output: number;
}

export class PIDController {
  private gains: PIDGains;
  private state: PIDState;
  private integralMax: number;
  private outputMax: number;
  private outputMin: number;
  private enabled: boolean;

  constructor(
    gains: PIDGains,
    integralMax = 10,
    outputMax = 1,
    outputMin = -1
  ) {
    this.gains = { ...gains };
    this.integralMax = integralMax;
    this.outputMax = outputMax;
    this.outputMin = outputMin;
    this.enabled = true;
    
    this.state = {
      error: 0,
      integral: 0,
      derivative: 0,
      lastError: 0,
      output: 0
    };
  }

  update(setpoint: number, measurement: number, dt: number): number {
    if (!this.enabled) {
      return 0;
    }

    // Calculate error
    this.state.error = setpoint - measurement;

    // Calculate integral with anti-windup
    this.state.integral += this.state.error * dt;
    this.state.integral = Math.max(-this.integralMax, Math.min(this.integralMax, this.state.integral));

    // Calculate derivative
    this.state.derivative = (this.state.error - this.state.lastError) / dt;

    // Calculate PID output
    const proportional = this.gains.kp * this.state.error;
    const integral = this.gains.ki * this.state.integral;
    const derivative = this.gains.kd * this.state.derivative;

    this.state.output = proportional + integral + derivative;

    // Apply output limits
    this.state.output = Math.max(this.outputMin, Math.min(this.outputMax, this.state.output));

    // Store error for next iteration
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

  setGains(gains: Partial<PIDGains>): void {
    this.gains = { ...this.gains, ...gains };
  }

  getGains(): PIDGains {
    return { ...this.gains };
  }

  getState(): PIDState {
    return { ...this.state };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.reset();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setLimits(integralMax: number, outputMax: number, outputMin: number): void {
    this.integralMax = integralMax;
    this.outputMax = outputMax;
    this.outputMin = outputMin;
  }
}

/**
 * Cascaded PID Controller for Position Control
 */
export class CascadedPIDController {
  private outerController: PIDController; // Position to velocity
  private innerController: PIDController; // Velocity to acceleration/attitude

  constructor(
    outerGains: PIDGains,
    innerGains: PIDGains,
    maxVelocity = 5,
    maxAcceleration = 10
  ) {
    this.outerController = new PIDController(outerGains, 10, maxVelocity, -maxVelocity);
    this.innerController = new PIDController(innerGains, 10, maxAcceleration, -maxAcceleration);
  }

  update(
    positionSetpoint: number,
    position: number,
    velocity: number,
    dt: number
  ): number {
    // Outer loop: position -> velocity setpoint
    const velocitySetpoint = this.outerController.update(positionSetpoint, position, dt);
    
    // Inner loop: velocity -> acceleration/attitude command
    const output = this.innerController.update(velocitySetpoint, velocity, dt);
    
    return output;
  }

  reset(): void {
    this.outerController.reset();
    this.innerController.reset();
  }

  setOuterGains(gains: Partial<PIDGains>): void {
    this.outerController.setGains(gains);
  }

  setInnerGains(gains: Partial<PIDGains>): void {
    this.innerController.setGains(gains);
  }

  getOuterState(): PIDState {
    return this.outerController.getState();
  }

  getInnerState(): PIDState {
    return this.innerController.getState();
  }

  setEnabled(enabled: boolean): void {
    this.outerController.setEnabled(enabled);
    this.innerController.setEnabled(enabled);
  }
}