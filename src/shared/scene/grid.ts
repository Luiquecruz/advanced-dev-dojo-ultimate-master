import { Mesh, PlaneGeometry, ShaderMaterial, type IUniform } from 'three';
import fragmentShader from './shaders/grid.frag.glsl?raw';
import vertexShader from './shaders/grid.vert.glsl?raw';

const GRID_SIZE = 200;
const GRID_SEGMENTS = 160;
const GRID_HEIGHT = -2.2;

/**
 * Radial ground grid drawn by a shader: rings and spokes around a point ahead of the camera, curved down into a well
 * like the classic picture of mass bending space. Fades with distance and is brighter towards the horizon.
 */
export function createGrid(uniforms: Record<string, IUniform>): Mesh<PlaneGeometry, ShaderMaterial> {
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
  });
  const grid = new Mesh(new PlaneGeometry(GRID_SIZE, GRID_SIZE, GRID_SEGMENTS, GRID_SEGMENTS), material);
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(0, GRID_HEIGHT, -GRID_SIZE / 2 + 10);
  return grid;
}
