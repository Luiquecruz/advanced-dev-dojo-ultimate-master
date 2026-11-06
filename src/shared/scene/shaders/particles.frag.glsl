uniform vec3 uAccent;
uniform float uBrightness;

varying float vAlpha;
varying float vTint;
varying float vSharpness;

void main() {
  float distanceToCenter = length(gl_PointCoord - 0.5);
  float edge = fwidth(distanceToCenter);
  float core = exp(-distanceToCenter * distanceToCenter * vSharpness);
  float halo = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
  float disc = 1.0 - smoothstep(0.5 - edge, 0.5, distanceToCenter);
  float intensity = (core * 0.85 + halo * halo * 0.22) * disc;
  vec3 color = mix(uAccent, vec3(0.92, 0.96, 1.0), vTint * 0.45 + core * 0.25);
  gl_FragColor = vec4(color, intensity * vAlpha * uBrightness);
}
