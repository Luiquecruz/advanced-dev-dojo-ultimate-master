const vec2 WELL_CENTER = vec2(0.0, -18.0);
const float WELL_DEPTH_MIN = 0.4;
const float WELL_DEPTH_MAX = 11.0;
const float WELL_RADIUS_MIN = 4.5;
const float WELL_RADIUS_MAX = 17.0;
const float DEPTH_CURVE = 1.6;

uniform float uMass;

varying vec3 vWorld;
varying float vWell;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec2 offset = world.xz - WELL_CENTER;
  float radius = mix(WELL_RADIUS_MIN, WELL_RADIUS_MAX, uMass);
  float well = exp(-dot(offset, offset) / (radius * radius));
  world.y -= mix(WELL_DEPTH_MIN, WELL_DEPTH_MAX, pow(uMass, DEPTH_CURVE)) * well;
  vWorld = world.xyz;
  vWell = well;
  gl_Position = projectionMatrix * viewMatrix * world;
}
