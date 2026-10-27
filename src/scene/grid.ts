import { Mesh, PlaneGeometry, ShaderMaterial, type IUniform } from 'three';
import fragmentShader from './shaders/grid.frag.glsl?raw';
import vertexShader from './shaders/grid.vert.glsl?raw';

const GRID_SIZE = 200;
const GRID_HEIGHT = -2.2;

/**
 * Ground grid drawn by a shader, fading with distance and brighter towards the horizon.
 */
export function createGrid(uniforms: Record<string, IUniform>): Mesh<PlaneGeometry, ShaderMaterial> {
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const grid = new Mesh(new PlaneGeometry(GRID_SIZE, GRID_SIZE), material);
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(0, GRID_HEIGHT, -GRID_SIZE / 2 + 10);
  return grid;
}
