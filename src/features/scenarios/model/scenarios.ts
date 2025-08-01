import { FlightMode, Waypoint } from '@/shared/types/simulation';

export interface FlightScenario {
  id: string;
  name: string;
  description: string;
  waypoints: Omit<Waypoint, 'id'>[];
  flightMode: FlightMode;
  script?: string;
}

export const scenarios: FlightScenario[] = [
  {
    id: 'hover-test',
    name: 'Hover Test',
    description: 'A simple test to ensure the drone can take off and hold a stable position at 2 meters high.',
    waypoints: [{ x: 0, y: 0, z: 2 }],
    flightMode: 'waypoint',
  },
  {
    id: 'waypoint-navigation',
    name: 'Waypoint Navigation',
    description: 'Fly a simple square pattern using the waypoint system.',
    waypoints: [
      { x: 3, y: 3, z: 2 },
      { x: 3, y: -3, z: 2 },
      { x: -3, y: -3, z: 2 },
      { x: -3, y: 3, z: 2 },
      { x: 0, y: 0, z: 2 },
    ],
    flightMode: 'waypoint',
  },
  {
    id: 'figure-eight',
    name: 'Figure-Eight Pattern',
    description: 'Fly a more complex figure-eight pattern. This is a good test for the position controller.',
    waypoints: [
      { x: 4, y: 4, z: 2.5 },
      { x: 2, y: -4, z: 2.5 },
      { x: -2, y: 4, z: 2.5 },
      { x: -4, y: -4, z: 2.5 },
      { x: 0, y: 0, z: 2.5 },
    ],
    flightMode: 'waypoint',
  },
  {
    id: 'scripted-mission',
    name: 'Scripted Mission',
    description: 'A sample mission using the scripting engine to fly a square and land.',
    waypoints: [],
    flightMode: 'position_hold',
    script: `
// Fly in a square pattern and then land.
async function mission() {
  await drone.takeoff(2);
  await drone.moveTo(2, 2, 2);
  await drone.moveTo(2, -2, 2);
  await drone.moveTo(-2, -2, 2);
  await drone.moveTo(-2, 2, 2);
  await drone.moveTo(0, 0, 2);
  await drone.land();
}

mission();
`
  }
];

export const getScenarios = () => scenarios;

export const getScenarioById = (id: string) => scenarios.find(s => s.id === id);
