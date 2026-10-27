uniform vec3 uAccent;
uniform float uTime;
uniform float uFocus;
uniform float uBrightness;

varying vec3 vWorld;

float gridLine(vec2 coordinate) {
  vec2 distanceToLine = abs(fract(coordinate - 0.5) - 0.5) / fwidth(coordinate);
  return 1.0 - min(min(distanceToLine.x, distanceToLine.y), 1.0);
}

void main() {
  vec2 coordinate = vWorld.xz / 2.0 + vec2(0.0, uTime * 0.25);
  float distanceToCamera = length(vWorld.xz - cameraPosition.xz);
  float fade = 1.0 - smoothstep(6.0, 60.0, distanceToCamera);
  float horizon = smoothstep(10.0, 45.0, distanceToCamera);
  float intensity = gridLine(coordinate) * fade * (0.18 + horizon * 0.35) * (1.0 - uFocus * 0.5) * uBrightness;
  gl_FragColor = vec4(uAccent, intensity);
}
