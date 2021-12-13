import { Color, Vector3 } from "three";
import { MaterialJSON } from "./material";

export interface ParticlesStrokePoint {
  co: [number, number, number]; // position
  pressure: number; // Pressure of tablet at point when drawing it
  strength: number; // Color intensity (alpha factor)
  vertexColor: [number, number, number, number]; // Vertex color
}

export interface Particle {
  location: [number, number, number];
  rotation: [number, number, number];
  velocity: [number, number, number];
}

export class ParticleSystem {
  constructor(public name: string, public material: MaterialJSON) {}

  private particles: Particle[] = [];

  public addParticle = (layer: Particle) => {
    this.particles.push(layer);
  };
}

export class Particles {
  constructor(public name: string) {}

  private systems: ParticleSystem[] = [];

  public addSystem = (layer: ParticleSystem) => {
    this.systems.push(layer);
  };
}

export interface ParticlesJSON {
  type: "particles";
  name: string;
  systems: {
    name: string;
    material: MaterialJSON;
    particles: {
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
