/**
 * Manual Control Panel for Direct Drone Control
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Gamepad2, 
  Plane, 
  RotateCw, 
  ArrowUp, 
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Info
} from 'lucide-react';
import { FlightMode, ManualInputs } from '@/lib/simulation/DroneSimulator';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

interface ManualControlPanelProps {
  flightMode: FlightMode;
  manualInputs: ManualInputs;
  onFlightModeChange: (mode: FlightMode) => void;
  onManualInputsChange: (inputs: Partial<ManualInputs>) => void;
  onResetInputs: () => void;
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

const getFlightModeDescription = (mode: FlightMode): string => {
  switch (mode) {
    case 'manual':
      return 'Full manual control - no stabilization';
    case 'stabilized':
      return 'Manual with attitude stabilization';
    case 'altitude_hold':
      return 'Altitude hold + manual attitude';
    case 'position_hold':
      return 'Full autonomous position hold';
  }
};

const getFlightModeColor = (mode: FlightMode): "destructive" | "secondary" | "default" | "outline" => {
  switch (mode) {
    case 'manual':
      return 'destructive';
    case 'stabilized':
      return 'outline';
    case 'altitude_hold':
      return 'secondary';
    case 'position_hold':
      return 'default';
  }
};

export const ManualControlPanel: React.FC<ManualControlPanelProps> = ({
  flightMode,
  manualInputs,
  onFlightModeChange,
  onManualInputsChange,
  onResetInputs
}) => {
  const isManualMode = flightMode === 'manual';
  const isStabilizedMode = flightMode === 'stabilized';
  const isAltitudeHoldMode = flightMode === 'altitude_hold';

  return (
    <div className="space-y-4">
      {/* Flight Mode Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Flight Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Current Mode</Label>
            <Select value={flightMode} onValueChange={onFlightModeChange}>
              <SelectTrigger className="w-full bg-background border-2 hover:border-primary/50 transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border-2 shadow-lg z-50">
                <SelectItem value="manual" className="hover:bg-muted cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4" />
                    Manual
                  </div>
                </SelectItem>
                <SelectItem value="stabilized" className="hover:bg-muted cursor-pointer">
                  <div className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4" />
                    Stabilized
                  </div>
                </SelectItem>
                <SelectItem value="altitude_hold" className="hover:bg-muted cursor-pointer">
                  <div className="flex items-center gap-2">
                    <ArrowUp className="h-4 w-4" />
                    Altitude Hold
                  </div>
                </SelectItem>
                <SelectItem value="position_hold" className="hover:bg-muted cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4" />
                    Position Hold
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <Badge variant={getFlightModeColor(flightMode)} className="text-xs">
              {flightMode.replace('_', ' ').toUpperCase()}
            </Badge>
            <InfoTooltip content={getFlightModeDescription(flightMode)} />
          </div>

          <p className="text-xs text-muted-foreground">
            {getFlightModeDescription(flightMode)}
          </p>
        </CardContent>
      </Card>

      {/* Manual Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gamepad2 className="h-5 w-5" />
            Manual Controls
            <Button
              variant="outline"
              size="sm"
              onClick={onResetInputs}
              className="ml-auto h-7 text-xs"
            >
              Reset
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Throttle Control */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">Throttle</Label>
              <InfoTooltip content="Vertical thrust control - higher values make drone climb" />
              <Badge variant="outline" className="ml-auto text-xs">
                {(manualInputs.throttle * 100).toFixed(0)}%
              </Badge>
            </div>
            <Slider
              value={[manualInputs.throttle]}
              onValueChange={([value]) => onManualInputsChange({ throttle: value })}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
              disabled={flightMode === 'position_hold'}
            />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>Descent</span>
              <span>Hover</span>
              <span>Climb</span>
            </div>
          </div>

          <Separator />

          {/* Pitch Control */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-chart-2 rotate-90" />
              <Label className="text-sm font-medium">Pitch</Label>
              <InfoTooltip content="Forward/backward movement - positive pitch moves drone forward" />
              <Badge variant="outline" className="ml-auto text-xs">
                {(manualInputs.pitch * 100).toFixed(0)}%
              </Badge>
            </div>
            <Slider
              value={[manualInputs.pitch]}
              onValueChange={([value]) => onManualInputsChange({ pitch: value })}
              min={-1}
              max={1}
              step={0.01}
              className="w-full"
              disabled={flightMode === 'position_hold'}
            />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>Backward</span>
              <span>Center</span>
              <span>Forward</span>
            </div>
          </div>

          {/* Roll Control */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4 text-chart-3" />
              <Label className="text-sm font-medium">Roll</Label>
              <InfoTooltip content="Left/right movement - positive roll moves drone right" />
              <Badge variant="outline" className="ml-auto text-xs">
                {(manualInputs.roll * 100).toFixed(0)}%
              </Badge>
            </div>
            <Slider
              value={[manualInputs.roll]}
              onValueChange={([value]) => onManualInputsChange({ roll: value })}
              min={-1}
              max={1}
              step={0.01}
              className="w-full"
              disabled={flightMode === 'position_hold'}
            />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>Left</span>
              <span>Center</span>
              <span>Right</span>
            </div>
          </div>

          {/* Yaw Control */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <RotateCw className="h-4 w-4 text-chart-4" />
              <Label className="text-sm font-medium">Yaw</Label>
              <InfoTooltip content="Rotation control - positive yaw rotates drone clockwise" />
              <Badge variant="outline" className="ml-auto text-xs">
                {(manualInputs.yaw * 100).toFixed(0)}%
              </Badge>
            </div>
            <Slider
              value={[manualInputs.yaw]}
              onValueChange={([value]) => onManualInputsChange({ yaw: value })}
              min={-1}
              max={1}
              step={0.01}
              className="w-full"
              disabled={false} // Yaw is available in most modes
            />
            <div className="text-xs text-muted-foreground flex justify-between">
              <span>CCW</span>
              <span>Center</span>
              <span>CW</span>
            </div>
          </div>

          {/* Control effectiveness info */}
          <div className="bg-muted/30 rounded-md p-3 space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Control Effectiveness</h4>
            <div className="space-y-1 text-xs text-muted-foreground">
              {isManualMode && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-destructive"></div>
                  <span>Full manual - no stabilization</span>
                </div>
              )}
              {isStabilizedMode && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  <span>Manual inputs + attitude stabilization</span>
                </div>
              )}
              {isAltitudeHoldMode && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  <span>Altitude locked, manual attitude control</span>
                </div>
              )}
              {flightMode === 'position_hold' && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <span>Full autonomous flight to setpoints</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Virtual Joystick Visualization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Control Visualization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* Left stick (Throttle + Yaw) */}
            <div className="space-y-2">
              <Label className="text-xs">Left Stick</Label>
              <div className="relative w-20 h-20 mx-auto bg-muted rounded-full border-2 border-border">
                <div 
                  className="absolute w-3 h-3 bg-primary rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100"
                  style={{
                    left: `${50 + (manualInputs.yaw * 35)}%`,
                    top: `${50 - (manualInputs.throttle - 0.5) * 70}%`
                  }}
                />
              </div>
              <div className="text-xs text-center text-muted-foreground">
                Throttle/Yaw
              </div>
            </div>

            {/* Right stick (Pitch + Roll) */}
            <div className="space-y-2">
              <Label className="text-xs">Right Stick</Label>
              <div className="relative w-20 h-20 mx-auto bg-muted rounded-full border-2 border-border">
                <div 
                  className="absolute w-3 h-3 bg-chart-2 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-100"
                  style={{
                    left: `${50 + (manualInputs.roll * 35)}%`,
                    top: `${50 - (manualInputs.pitch * 35)}%`
                  }}
                />
              </div>
              <div className="text-xs text-center text-muted-foreground">
                Pitch/Roll
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};