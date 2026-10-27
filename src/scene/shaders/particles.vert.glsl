attribute float aSeed;
attribute float aSize;

uniform float uTime;
uniform float uSpeed;
uniform float uFocus;
uniform float uPixelRatio;

varying float vAlpha;
varying float vTint;

void main() {
  float band = floor(aSeed * 2.999);
  float bandStart = band < 0.5 ? -40.0 : (band < 1.5 ? -22.0 : -8.0);
  float bandDepth = band < 0.5 ? 18.0 : 14.0;
  float velocity = 0.35 + band * 0.45;

  vec3 moved = position;
  float travel = mod(moved.z - bandStart + uTime * velocity, bandDepth);
  moved.z = bandStart + travel;
  moved.x += cos(uTime * 0.12 + aSeed * 25.0) * 0.35;
  moved.y += sin(uTime * 0.15 + aSeed * 40.0) * 0.35;

  vec4 viewPosition = modelViewMatrix * vec4(moved, 1.0);
  gl_Position = projectionMatrix * viewPosition;

  float edgeFade = smoothstep(0.0, 3.0, travel) * (1.0 - smoothstep(bandDepth - 3.0, bandDepth, travel));
  float twinkle = 1.0 - 0.3 * clamp(uSpeed, 0.0, 1.0) * (0.5 + 0.5 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 90.0));
  vAlpha = edgeFade * twinkle * (1.0 - uFocus * 0.6) * (0.22 + band * 0.2);
  vTint = fract(aSeed * 13.37);
  gl_PointSize = aSize * uPixelRatio * (36.0 / max(-viewPosition.z, 0.5));
}
