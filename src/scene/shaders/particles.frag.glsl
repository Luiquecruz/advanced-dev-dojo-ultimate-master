uniform vec3 uAccent;
uniform float uBrightness;

varying float vAlpha;
varying float vTint;

void main() {
  float distanceToCenter = length(gl_PointCoord - 0.5);
  float core = smoothstep(0.5, 0.0, distanceToCenter);
  vec3 color = mix(uAccent, vec3(0.92, 0.96, 1.0), vTint * 0.45);
  gl_FragColor = vec4(color, core * core * vAlpha * uBrightness);
}
