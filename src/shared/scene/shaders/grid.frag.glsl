const float TAU = 6.28318530718;
const vec2 WELL_CENTER = vec2(0.0, -18.0);
const float RING_SPACING = 3.4;
const float SPOKES = 16.0;
const float SPIN = 0.004;

uniform vec3 uAccent;
uniform float uTime;
uniform float uFocus;
uniform float uBrightness;

varying vec3 vWorld;
varying float vWell;

float lineAt(float coordinate, float width) {
  return 1.0 - min(abs(fract(coordinate - 0.5) - 0.5) / width, 1.0);
}

void main() {
  vec2 offset = vWorld.xz - WELL_CENTER;
  float radius = length(offset);
  float angle = atan(offset.y, offset.x) + uTime * SPIN;

  float ringCoordinate = radius / RING_SPACING;
  float ring = lineAt(ringCoordinate, fwidth(ringCoordinate));

  float spokeCoordinate = angle / TAU * SPOKES;
  float spokeWrapped = fract(angle / TAU + 0.5) * SPOKES;
  float spoke = lineAt(spokeCoordinate, min(fwidth(spokeCoordinate), fwidth(spokeWrapped))) * smoothstep(1.5, 6.0, radius);

  float distanceToCamera = length(vWorld.xz - cameraPosition.xz);
  float fade = 1.0 - smoothstep(10.0, 62.0, distanceToCamera);
  float horizon = smoothstep(8.0, 40.0, distanceToCamera);
  float curvature = 0.55 + 0.45 * vWell;
  float intensity = max(ring, spoke) * fade * (0.18 + horizon * 0.26) * curvature * (1.0 - uFocus * 0.5) * uBrightness;
  gl_FragColor = vec4(uAccent, intensity);
}
