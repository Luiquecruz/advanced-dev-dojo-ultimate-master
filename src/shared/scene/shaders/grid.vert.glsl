const vec2 WELL_CENTER = vec2(0.0, -18.0);
const float WELL_DEPTH = 3.2;
const float WELL_RADIUS = 7.5;

varying vec3 vWorld;
varying float vWell;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec2 offset = world.xz - WELL_CENTER;
  float well = exp(-dot(offset, offset) / (WELL_RADIUS * WELL_RADIUS));
  world.y -= WELL_DEPTH * well;
  vWorld = world.xyz;
  vWell = well;
  gl_Position = projectionMatrix * viewMatrix * world;
}
