import { Color, Vector3 } from "three";
import { importMaterial, MaterialJSON } from "./material";
import { Point, Line, Movement, MovementGroup } from "./movements/movements";

export interface ParticlesStrokePoint {
  co: [number, number, number]; // position
  pressure: number; // Pressure of tablet at point when drawing it
  strength: number; // Color intensity (alpha factor)
  vertexColor: [number, number, number, number]; // Vertex color
}

export interface Particle {
  id: string;
  location: [number, number, number];
  rotation: [number, number, number];
  velocity: [number, number, number];
}

export class ParticleSystem {
  constructor(public name: string, public material: MaterialJSON) {}

  public particles: Particle[] = [];

  public addParticle = (layer: Particle) => {
    this.particles.push(layer);
  };
}

export interface ParticlesToMovementsSettings {
  // How long to wait at each particle before moving on.
  stopDelay?: number;

  // Pass through the point in the direction of its velocity, otherwise, stops at it from any direction.
  drawInVelocityOrientation?: boolean;
}

export class Particles {
  constructor(public name: string) {}

  private systems: ParticleSystem[] = [];

  public addSystem = (layer: ParticleSystem) => {
    this.systems.push(layer);
  };

  public toMovements = (settings: ParticlesToMovementsSettings = {}) => {
    const movements: Movement[] = [];

    for (const system of this.systems) {
      const material = importMaterial(system.material);

      for (const particle of system.particles) {
        // Convert the location to a Vector3
        const location = new Vector3(
          particle.location[0],
          particle.location[1],
          particle.location[2]
        );

        const point = new Point(location, settings.stopDelay ?? 0, material);

        // This ID is guaranteed to be stable
        point.id = particle.id;

        if (settings.drawInVelocityOrientation) {
          point.velocity.set(
            particle.velocity[0],
            particle.velocity[1],
            particle.velocity[2]
          );
        }

        movements.push(point);
      }
    }

    return movements;
  };
}

export interface ParticlesJSON {
  type: "particles";
  name: string;
  systems: {
    name: string;
    material: MaterialJSON;
    particles: {
      id: string;
      location: [number, number, number];
      rotation: [number, number, number];
      velocity: [number, number, number];
    }[];
  }[];
}

export function importParticles(json: ParticlesJSON) {
  const particles = new Particles(json.name);

  for (const jSystem of json.systems) {
    let system = new ParticleSystem(jSystem.name, jSystem.material);
    particles.addSystem(system);

    for (const jParticle of jSystem.particles) {
      system.addParticle(jParticle);
    }
  }

  return particles;
}
