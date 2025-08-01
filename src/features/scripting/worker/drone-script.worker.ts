/// <reference lib="webworker" />

import { DroneState, Vector3D } from "@/shared/types/simulation";

// --- Drone API exposed to the user script ---

const drone = {
  /**
   * Commands the drone to take off to a specific altitude.
   * @param altitude The target altitude in meters.
   */
  async takeoff(altitude: number): Promise<void> {
    console.log(`API: Taking off to ${altitude}m`);
    return postCommand('takeoff', { altitude });
  },

  /**
   * Commands the drone to land at its current position.
   */
  async land(): Promise<void> {
    console.log('API: Landing');
    return postCommand('land');
  },

  /**
   * Commands the drone to move to an absolute position.
   * @param x The target X coordinate.
   * @param y The target Y coordinate.
   * @param z The target Z coordinate.
   */
  async moveTo(x: number, y: number, z: number): Promise<void> {
    console.log(`API: Moving to (${x}, ${y}, ${z})`);
    return postCommand('moveTo', { x, y, z });
  },

  /**
   * Pauses the script execution for a specified duration.
   * @param ms The duration to sleep in milliseconds.
   */
  async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Retrieves the current telemetry data of the drone.
   * @returns A promise that resolves with the drone's current state.
   */
  async getTelemetry(): Promise<DroneState> {
    return postCommand('getTelemetry');
  },
};

// --- Worker Internals ---

let commandId = 0;
const commandPromises = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();

/**
 * Sends a command to the main thread and returns a promise that resolves when the command is completed.
 */
function postCommand<T>(type: string, payload: any = {}): Promise<T> {
  const id = commandId++;
  return new Promise((resolve, reject) => {
    commandPromises.set(id, { resolve, reject });
    self.postMessage({ type, payload, id });
  });
}

/**
 * Handles messages from the main thread.
 */
self.onmessage = (event: MessageEvent) => {
  const { type, payload, id, error } = event.data;

  if (type === 'executeScript') {
    // Expose the drone API to the script's scope
    (self as any).drone = drone;

    try {
      // Using Function constructor as a safer alternative to eval
      const scriptFunction = new Function('return (async () => {' + payload.code + '})()');
      scriptFunction().then(() => {
        self.postMessage({ type: 'scriptFinished' });
      }).catch((e: any) => {
        self.postMessage({ type: 'scriptError', error: e.message });
      });
    } catch (e: any) {
      self.postMessage({ type: 'scriptError', error: e.message });
    }
  } else if (type === 'commandResponse' && commandPromises.has(id)) {
    const promise = commandPromises.get(id);
    if (promise) {
      if (error) {
        promise.reject(new Error(error));
      } else {
        promise.resolve(payload);
      }
      commandPromises.delete(id);
    }
  }
};

console.log("Drone script worker initialized.");
