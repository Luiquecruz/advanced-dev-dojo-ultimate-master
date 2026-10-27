import { AdditiveBlending, BufferGeometry, Float32BufferAttribute, Points, ShaderMaterial, type IUniform } from 'three';
import fragmentShader from './shaders/particles.frag.glsl?raw';
import vertexShader from './shaders/particles.vert.glsl?raw';

const BAND_START = [-40, -22, -8];
const BAND_DEPTH = [18, 14, 14];
const SPREAD_X = 18;
const MIN_Y = -2;
const MAX_Y = 8;

/**
 * Particle field in three depth bands, animated entirely in the vertex shader.
 */
export function createParticles(count: number, uniforms: Record<string, IUniform>): Points<BufferGeometry, ShaderMaterial> {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  for (let index = 0; index < count; index++) {
    const seed = Math.random();
    const band = Math.floor(seed * 2.999);
    seeds[index] = seed;
    sizes[index] = 1 + Math.random() ** 3 * 1.8 + band * 0.4;
    positions[index * 3] = (Math.random() * 2 - 1) * SPREAD_X;
    positions[index * 3 + 1] = MIN_Y + Math.random() * (MAX_Y - MIN_Y);
    positions[index * 3 + 2] = BAND_START[band] + Math.random() * BAND_DEPTH[band];
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new Float32BufferAttribute(seeds, 1));
  geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));

  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const points = new Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
