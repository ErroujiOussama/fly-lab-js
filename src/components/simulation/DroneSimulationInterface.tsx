/**
 * Main Drone Simulation Interface
 */

import React, { useState, useEffect, useRef } from 'react';
import { DroneSimulator, FlightMode, ManualInputs, SimulationData } from '@/features/simulation';
import { DroneVisualization } from './DroneVisualization';
import { SimulationCharts } from '../charts/SimulationCharts';
import { ControlPanel } from '../controls/ControlPanel';
import { ManualControlPanel } from '@/features/manual-control';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  BarChart3, 
  Settings,
  Monitor,
  BookOpen,
  Zap
} from 'lucide-react';

export const DroneSimulationInterface: React.FC = () => {
  const simulatorRef = useRef<DroneSimulator>();
  const [currentData, setCurrentData] = useState<SimulationData | null>(null);
  const [dataHistory, setDataHistory] = useState<SimulationData[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [flightMode, setFlightMode] = useState<FlightMode>('position_hold');
  const [manualInputs, setManualInputs] = useState<ManualInputs>({
    pitch: 0,
    roll: 0,
    yaw: 0,
    throttle: 0.5
  });

  // Initialize simulator
  useEffect(() => {
    simulatorRef.current = new DroneSimulator();
    
    simulatorRef.current.setUpdateCallback((data: SimulationData) => {
      setCurrentData(data);
      setDataHistory(prev => [...prev.slice(-1000), data]); // Keep last 1000 points
    });

    simulatorRef.current.setResetCallback(() => {
      setCurrentData(null);
      setDataHistory([]);
      setFlightMode('position_hold');
      setManualInputs({
        pitch: 0,
        roll: 0,
        yaw: 0,
        throttle: 0.5
      });
    });

    return () => {
      if (simulatorRef.current) {
        simulatorRef.current.pause();
      }
    };
  }, []);

  const handleStart = () => {
    if (simulatorRef.current) {
      simulatorRef.current.start();
      setIsRunning(true);
    }
  };

  const handlePause = () => {
    if (simulatorRef.current) {
      simulatorRef.current.pause();
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    if (simulatorRef.current) {
      simulatorRef.current.reset();
      setIsRunning(false);
    }
  };

  const handleControllerConfigChange = (config: any) => {
    if (simulatorRef.current) {
      simulatorRef.current.setControllerConfig(config);
    }
  };

  const handleSetpointsChange = (setpoints: any) => {
    if (simulatorRef.current) {
      simulatorRef.current.setSetpoints(setpoints);
    }
  };

  const handleDroneParamsChange = (params: any) => {
    if (simulatorRef.current) {
      // Update drone parameters (would need to be implemented in simulator)
      console.log('Drone params changed:', params);
    }
  };

  const handleSimulationConfigChange = (config: any) => {
    if (simulatorRef.current) {
      simulatorRef.current.setConfig(config);
    }
  };

  const handleFlightModeChange = (mode: FlightMode) => {
    if (simulatorRef.current) {
      simulatorRef.current.setFlightMode(mode);
      setFlightMode(mode);
    }
  };

  const handleManualInputsChange = (inputs: Partial<ManualInputs>) => {
    if (simulatorRef.current) {
      const newInputs = { ...manualInputs, ...inputs };
      simulatorRef.current.setManualInputs(newInputs);
      setManualInputs(newInputs);
    }
  };

  const handleResetManualInputs = () => {
    const resetInputs = {
      pitch: 0,
      roll: 0,
      yaw: 0,
      throttle: 0.5
    };
    if (simulatorRef.current) {
      simulatorRef.current.setManualInputs(resetInputs);
      setManualInputs(resetInputs);
    }
  };

  // Current state for display
  const droneState = currentData?.state || {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: { x: 0, y: 0, z: 0 }, // roll, pitch, yaw
    angularVelocity: { x: 0, y: 0, z: 0 }
  };

  const controllerConfig = simulatorRef.current?.getControllerConfig() || {
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

  const setpoints = simulatorRef.current?.getSetpoints() || {
    position: { x: 0, y: 0, z: 2 },
    attitude: { x: 0, y: 0, z: 0 } // roll, pitch, yaw
  };

  const droneParams = {
    mass: 1.5,
    length: 0.25,
    inertia: { Ixx: 0.0347563, Iyy: 0.0347563, Izz: 0.0577 },
    dragCoeff: 0.01,
    maxThrust: 15,
    thrustToTorqueRatio: 0.016
  };


  const simulationConfig = {
    timestep: 0.01,
    realTimeMultiplier: 1.0,
    enablePhysics: true,
    enableControl: true
  };

  return (
    <div className="h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Quadrotor Flight Simulator</h1>
            </div>
            <Badge variant="secondary" className="text-xs">
              Educational Platform
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            {currentData && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Mode:</span>
                  <span className="font-mono capitalize">{flightMode.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Activity className="h-4 w-4 text-success" />
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-mono">{currentData.time.toFixed(1)}s</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Alt:</span>
                  <span className="font-mono">{droneState.position.z.toFixed(2)}m</span>
                </div>
                <Badge variant={isRunning ? "default" : "secondary"}>
                  {isRunning ? "Running" : "Paused"}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="h-[calc(100vh-4rem)]">
        {/* Control Panel */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
          <div className="h-full border-r bg-card/30">
            <Tabs defaultValue="pid" className="h-full">
              <div className="p-4 border-b bg-card/50">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="pid" className="flex items-center gap-2 text-xs">
                    <Settings className="h-3 w-3" />
                    PID Control
                  </TabsTrigger>
                  <TabsTrigger value="manual" className="flex items-center gap-2 text-xs">
                    <Activity className="h-3 w-3" />
                    Manual
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="pid" className="h-[calc(100%-7rem)] m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <ControlPanel
                      isRunning={isRunning}
                      controllerConfig={controllerConfig}
                      setpoints={setpoints}
                      droneParams={droneParams}
                      simulationConfig={simulationConfig}
                      onStart={handleStart}
                      onPause={handlePause}
                      onReset={handleReset}
                      onControllerConfigChange={handleControllerConfigChange}
                      onSetpointsChange={handleSetpointsChange}
                      onDroneParamsChange={handleDroneParamsChange}
                      onSimulationConfigChange={handleSimulationConfigChange}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="manual" className="h-[calc(100%-7rem)] m-0">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    <ManualControlPanel
                      flightMode={flightMode}
                      manualInputs={manualInputs}
                      onFlightModeChange={handleFlightModeChange}
                      onManualInputsChange={handleManualInputsChange}
                      onResetInputs={handleResetManualInputs}
                    />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main Visualization Area */}
        <ResizablePanel defaultSize={75} minSize={50}>
          <ResizablePanelGroup direction="vertical">
            {/* 3D Visualization */}
            <ResizablePanel defaultSize={60} minSize={40}>
              <div className="h-full">
                <div className="p-4 border-b bg-card/30">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Monitor className="h-4 w-4" />
                    3D Simulation View
                  </h2>
                </div>
                <div className="h-[calc(100%-4rem)] p-4">
                  <DroneVisualization droneState={droneState} className="h-full" />
                </div>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Charts and Data */}
            <ResizablePanel defaultSize={40} minSize={30}>
              <div className="h-full bg-card/20">
                <Tabs defaultValue="charts" className="h-full">
                  <div className="border-b bg-card/30">
                    <div className="flex items-center justify-between p-4">
                      <TabsList className="grid w-auto grid-cols-3">
                        <TabsTrigger value="charts" className="flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Charts
                        </TabsTrigger>
                        <TabsTrigger value="data" className="flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Data
                        </TabsTrigger>
                        <TabsTrigger value="help" className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Help
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  </div>

                  <TabsContent value="charts" className="h-[calc(100%-5rem)] m-0 p-4">
                    <ScrollArea className="h-full">
                      <SimulationCharts data={dataHistory} />
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="data" className="h-[calc(100%-5rem)] m-0 p-4">
                    <ScrollArea className="h-full">
                      <div className="space-y-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Current State</CardTitle>
                          </CardHeader>
                          <CardContent className="text-xs font-mono space-y-2">
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <div className="font-semibold text-foreground">Position (m)</div>
                                <div>X: {droneState.position.x.toFixed(3)}</div>
                                <div>Y: {droneState.position.y.toFixed(3)}</div>
                                <div>Z: {droneState.position.z.toFixed(3)}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">Velocity (m/s)</div>
                                <div>X: {droneState.velocity.x.toFixed(3)}</div>
                                <div>Y: {droneState.velocity.y.toFixed(3)}</div>
                                <div>Z: {droneState.velocity.z.toFixed(3)}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-foreground">Attitude (rad)</div>
                                <div>Roll: {droneState.orientation.x.toFixed(3)}</div>
                                <div>Pitch: {droneState.orientation.y.toFixed(3)}</div>
                                <div>Yaw: {droneState.orientation.z.toFixed(3)}</div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {currentData && (
                          <>
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Flight Status</CardTitle>
                              </CardHeader>
                              <CardContent className="text-xs font-mono space-y-2">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <div className="font-semibold text-foreground">Flight Mode</div>
                                    <div className="capitalize">{currentData.flightMode.replace('_', ' ')}</div>
                                  </div>
                                  <div>
                                    <div className="font-semibold text-foreground">Manual Inputs</div>
                                    <div>Throttle: {(currentData.manualInputs.throttle * 100).toFixed(0)}%</div>
                                    <div>Pitch: {(currentData.manualInputs.pitch * 100).toFixed(0)}%</div>
                                    <div>Roll: {(currentData.manualInputs.roll * 100).toFixed(0)}%</div>
                                    <div>Yaw: {(currentData.manualInputs.yaw * 100).toFixed(0)}%</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Motor Outputs</CardTitle>
                              </CardHeader>
                              <CardContent className="text-xs font-mono">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>Motor 1: {(currentData.motorInputs.motor1 * 100).toFixed(1)}%</div>
                                  <div>Motor 2: {(currentData.motorInputs.motor2 * 100).toFixed(1)}%</div>
                                  <div>Motor 3: {(currentData.motorInputs.motor3 * 100).toFixed(1)}%</div>
                                  <div>Motor 4: {(currentData.motorInputs.motor4 * 100).toFixed(1)}%</div>
                                </div>
                              </CardContent>
                            </Card>
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="help" className="h-[calc(100%-5rem)] m-0 p-4">
                    <ScrollArea className="h-full">
                      <div className="space-y-4 text-sm">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Quick Start Guide</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-xs">
                            <div>
                              <h4 className="font-semibold">1. Basic Controls</h4>
                              <p className="text-muted-foreground">Use the Start/Pause buttons to control simulation. Reset restores initial conditions.</p>
                            </div>
                            <div>
                              <h4 className="font-semibold">2. PID Tuning</h4>
                              <p className="text-muted-foreground">Adjust Kp, Ki, Kd values in real-time. Higher Kp = faster response, higher Kd = less overshoot.</p>
                            </div>
                            <div>
                              <h4 className="font-semibold">3. Setpoints</h4>
                              <p className="text-muted-foreground">Change target position and yaw angle. Drone will automatically fly to new setpoint.</p>
                            </div>
                            <div>
                              <h4 className="font-semibold">5. Manual Control</h4>
                              <p className="text-muted-foreground">Switch to Manual tab to control the drone directly with virtual joysticks.</p>
                            </div>
                            <div>
                              <h4 className="font-semibold">6. Flight Modes</h4>
                              <p className="text-muted-foreground">Manual = direct control, Stabilized = assisted, Altitude Hold = hover, Position Hold = autonomous.</p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Flight Modes Explained</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-xs">
                            <div>
                              <strong>Manual:</strong> Direct motor control - challenging but educational
                            </div>
                            <div>
                              <strong>Stabilized:</strong> Manual inputs with automatic attitude stabilization
                            </div>
                            <div>
                              <strong>Altitude Hold:</strong> Maintains altitude while allowing manual attitude control
                            </div>
                            <div>
                              <strong>Position Hold:</strong> Full autonomous flight to GPS coordinates
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Understanding PID</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-xs">
                            <div>
                              <strong>Proportional (Kp):</strong> Responds to current error magnitude
                            </div>
                            <div>
                              <strong>Integral (Ki):</strong> Eliminates steady-state offset
                            </div>
                            <div>
                              <strong>Derivative (Kd):</strong> Predicts future error, reduces overshoot
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Physics Model</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-xs">
                            <div>✓ 6-DOF Newton-Euler dynamics</div>
                            <div>✓ Accurate motor-to-thrust mapping</div>
                            <div>✓ Aerodynamic drag effects</div>
                            <div>✓ Cascaded position control</div>
                          </CardContent>
                        </Card>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};