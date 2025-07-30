/**
 * Control Panel for PID Tuning and Simulation Parameters
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Info, 
  Settings, 
  Target,
  Plane
} from 'lucide-react';
import { SimulationConfig, ControllerConfig, SetPoints } from '@/features/simulation';
import { DroneParams } from '@/shared/types/simulation';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface ControlPanelProps {
  isRunning: boolean;
  controllerConfig: ControllerConfig;
  setpoints: SetPoints;
  droneParams: DroneParams;
  simulationConfig: SimulationConfig;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onControllerConfigChange: (config: Partial<ControllerConfig>) => void;
  onSetpointsChange: (setpoints: Partial<SetPoints>) => void;
  onDroneParamsChange: (params: Partial<DroneParams>) => void;
  onSimulationConfigChange: (config: Partial<SimulationConfig>) => void;
}

const InfoTooltip: React.FC<{ content: string }> = ({ content }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3 w-3 text-muted-foreground cursor-help" />
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs text-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isRunning,
  controllerConfig,
  setpoints,
  droneParams,
  simulationConfig,
  onStart,
  onPause,
  onReset,
  onControllerConfigChange,
  onSetpointsChange,
  onDroneParamsChange,
  onSimulationConfigChange
}) => {
  const updateControllerGain = (
    controller: keyof ControllerConfig,
    axis: string | null,
    gain: 'kp' | 'ki' | 'kd',
    value: number
  ) => {
    if (controller === 'altitude') {
      onControllerConfigChange({
        altitude: { ...controllerConfig.altitude, [gain]: value }
      });
    } else if (controller === 'attitude' && axis) {
      onControllerConfigChange({
        attitude: {
          ...controllerConfig.attitude,
          [axis]: { ...controllerConfig.attitude[axis as keyof typeof controllerConfig.attitude], [gain]: value }
        }
      });
    } else if (controller === 'position' && axis) {
      const axisConfig = controllerConfig.position[axis as keyof typeof controllerConfig.position];
      if ('outer' in axisConfig && 'inner' in axisConfig) {
        // For cascaded controllers, we'll update outer loop gains
        onControllerConfigChange({
          position: {
            ...controllerConfig.position,
            [axis]: {
              ...axisConfig,
              outer: { ...axisConfig.outer, [gain]: value }
            }
          }
        });
      }
    }
  };

  const toggleController = (controller: keyof ControllerConfig, axis?: string) => {
    if (controller === 'altitude') {
      onControllerConfigChange({
        altitude: { ...controllerConfig.altitude, enabled: !controllerConfig.altitude.enabled }
      });
    } else if (controller === 'attitude' && axis) {
      onControllerConfigChange({
        attitude: {
          ...controllerConfig.attitude,
          [axis]: { 
            ...controllerConfig.attitude[axis as keyof typeof controllerConfig.attitude], 
            enabled: !controllerConfig.attitude[axis as keyof typeof controllerConfig.attitude].enabled 
          }
        }
      });
    } else if (controller === 'position' && axis) {
      const axisConfig = controllerConfig.position[axis as keyof typeof controllerConfig.position];
      onControllerConfigChange({
        position: {
          ...controllerConfig.position,
          [axis]: { ...axisConfig, enabled: !axisConfig.enabled }
        }
      });
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Simulation Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Simulation Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              variant={isRunning ? "secondary" : "default"}
              onClick={isRunning ? onPause : onStart}
              className="flex items-center gap-2"
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isRunning ? 'Pause' : 'Start'}
            </Button>
            <Button variant="outline" onClick={onReset} className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Badge variant="secondary" className="ml-auto">
              {simulationConfig.realTimeMultiplier}x Speed
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Physics</Label>
                <InfoTooltip content="Enable/disable physics simulation" />
              </div>
              <Switch
                checked={simulationConfig.enablePhysics}
                onCheckedChange={(enabled) => onSimulationConfigChange({ enablePhysics: enabled })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Control</Label>
                <InfoTooltip content="Enable/disable automatic control systems" />
              </div>
              <Switch
                checked={simulationConfig.enableControl}
                onCheckedChange={(enabled) => onSimulationConfigChange({ enableControl: enabled })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Simulation Speed</Label>
              <InfoTooltip content="Adjust simulation playback speed" />
            </div>
            <Slider
              value={[simulationConfig.realTimeMultiplier]}
              onValueChange={([value]) => onSimulationConfigChange({ realTimeMultiplier: value })}
              min={0.1}
              max={5}
              step={0.1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              {simulationConfig.realTimeMultiplier.toFixed(1)}x
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Setpoints */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Setpoints
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">X Position (m)</Label>
              <Input
                type="number"
                value={setpoints.position.x}
                onChange={(e) => onSetpointsChange({
                  position: { ...setpoints.position, x: parseFloat(e.target.value) || 0 }
                })}
                step="0.1"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Y Position (m)</Label>
              <Input
                type="number"
                value={setpoints.position.y}
                onChange={(e) => onSetpointsChange({
                  position: { ...setpoints.position, y: parseFloat(e.target.value) || 0 }
                })}
                step="0.1"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Altitude (m)</Label>
              <Input
                type="number"
                value={setpoints.position.z}
                onChange={(e) => onSetpointsChange({
                  position: { ...setpoints.position, z: parseFloat(e.target.value) || 0 }
                })}
                step="0.1"
                min="0"
                className="h-8 text-xs"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Yaw Angle (rad)</Label>
            <Slider
              value={[setpoints.attitude.z]}
              onValueChange={([value]) => onSetpointsChange({
                attitude: { ...setpoints.attitude, z: value }
              })}
              min={-Math.PI}
              max={Math.PI}
              step={0.1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">
              {setpoints.attitude.z.toFixed(2)} rad ({(setpoints.attitude.z * 180 / Math.PI).toFixed(0)}°)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Altitude Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Altitude Control
            <Switch
              checked={controllerConfig.altitude.enabled}
              onCheckedChange={() => toggleController('altitude')}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {['kp', 'ki', 'kd'].map((gain) => {
            const value = controllerConfig.altitude[gain as keyof typeof controllerConfig.altitude] as number;
            const maxValues = { kp: 20, ki: 5, kd: 10 };
            
            return (
              <div key={gain} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs capitalize">{gain}</Label>
                  <InfoTooltip content={
                    gain === 'kp' ? 'Proportional gain - responds to current error' :
                    gain === 'ki' ? 'Integral gain - eliminates steady-state error' :
                    'Derivative gain - reduces overshoot and oscillation'
                  } />
                </div>
                <Slider
                  value={[value]}
                  onValueChange={([newValue]) => updateControllerGain('altitude', null, gain as any, newValue)}
                  min={0}
                  max={maxValues[gain as keyof typeof maxValues]}
                  step={0.1}
                  className="w-full"
                  disabled={!controllerConfig.altitude.enabled}
                />
                <div className="text-xs text-muted-foreground">{value.toFixed(1)}</div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Attitude Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Attitude Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {['roll', 'pitch', 'yaw'].map((axis) => {
            const config = controllerConfig.attitude[axis as keyof typeof controllerConfig.attitude];
            
            return (
              <div key={axis} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm capitalize font-medium">{axis}</Label>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={() => toggleController('attitude', axis)}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {['kp', 'ki', 'kd'].map((gain) => {
                    const value = config[gain as keyof typeof config] as number;
                    const maxValues = { kp: 15, ki: 2, kd: 5 };
                    
                    return (
                      <div key={gain} className="space-y-1">
                        <Label className="text-xs capitalize">{gain}</Label>
                        <Slider
                          value={[value]}
                          onValueChange={([newValue]) => updateControllerGain('attitude', axis, gain as any, newValue)}
                          min={0}
                          max={maxValues[gain as keyof typeof maxValues]}
                          step={0.1}
                          className="w-full"
                          disabled={!config.enabled}
                        />
                        <div className="text-xs text-muted-foreground">{value.toFixed(1)}</div>
                      </div>
                    );
                  })}
                </div>
                
                {axis !== 'yaw' && <Separator className="my-2" />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Position Control */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Position Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {['x', 'y'].map((axis) => {
            const config = controllerConfig.position[axis as keyof typeof controllerConfig.position];
            
            return (
              <div key={axis} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm capitalize font-medium">{axis.toUpperCase()} Position</Label>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={() => toggleController('position', axis)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs">Outer Loop (Position → Velocity)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['kp', 'ki', 'kd'].map((gain) => {
                      const value = config.outer[gain as keyof typeof config.outer] as number;
                      const maxValues = { kp: 5, ki: 1, kd: 2 };
                      
                      return (
                        <div key={gain} className="space-y-1">
                          <Label className="text-xs capitalize">{gain}</Label>
                          <Slider
                            value={[value]}
                            onValueChange={([newValue]) => updateControllerGain('position', axis, gain as any, newValue)}
                            min={0}
                            max={maxValues[gain as keyof typeof maxValues]}
                            step={0.1}
                            className="w-full"
                            disabled={!config.enabled}
                          />
                          <div className="text-xs text-muted-foreground">{value.toFixed(1)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {axis !== 'y' && <Separator className="my-2" />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Drone Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Drone Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Mass (kg)</Label>
              <InfoTooltip content="Total mass of the quadrotor including battery and payload" />
            </div>
            <Slider
              value={[droneParams.mass]}
              onValueChange={([value]) => onDroneParamsChange({ mass: value })}
              min={0.5}
              max={5}
              step={0.1}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">{droneParams.mass.toFixed(1)} kg</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Arm Length (m)</Label>
              <InfoTooltip content="Distance from center to motor (affects moment arm)" />
            </div>
            <Slider
              value={[droneParams.length]}
              onValueChange={([value]) => onDroneParamsChange({ length: value })}
              min={0.1}
              max={0.5}
              step={0.01}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">{droneParams.length.toFixed(2)} m</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs">Drag Coefficient</Label>
              <InfoTooltip content="Air resistance factor affecting linear motion" />
            </div>
            <Slider
              value={[droneParams.dragCoeff]}
              onValueChange={([value]) => onDroneParamsChange({ dragCoeff: value })}
              min={0}
              max={0.1}
              step={0.001}
              className="w-full"
            />
            <div className="text-xs text-muted-foreground">{droneParams.dragCoeff.toFixed(3)}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};