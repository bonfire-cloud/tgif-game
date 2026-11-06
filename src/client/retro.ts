/** Bonfire Arcade's fixed scene palette, shared by materials and the final pass. */
export const ARCADE_PALETTE = [
  "#0b0b2b",
  "#1d2b53",
  "#5f3f8b",
  "#a94faa",
  "#ff77a8",
  "#e43b44",
  "#ff8b28",
  "#ffec27",
  "#a7f070",
  "#28c8a8",
  "#29adff",
  "#8fd3ff",
  "#5b6c8f",
  "#ab8d6f",
  "#d9c7a3",
  "#fff1e8",
];
const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
export function arcadeColour(hex: string) {
  const c = rgb(hex);
  let best = ARCADE_PALETTE[0],
    distance = Infinity;
  for (const colour of ARCADE_PALETTE) {
    const p = rgb(colour);
    const d =
      (c[0] - p[0]) ** 2 * 0.3 +
      (c[1] - p[1]) ** 2 * 0.59 +
      (c[2] - p[2]) ** 2 * 0.11;
    if (d < distance) {
      distance = d;
      best = colour;
    }
  }
  return best;
}
export const PALETTE_FRAGMENT = `
precision highp float;
varying vec2 vUV;
uniform sampler2D textureSampler;
void main(void) {
  vec3 c = texture2D(textureSampler, vUV).rgb;
  vec2 cell = mod(floor(gl_FragCoord.xy), 2.0);
  float bayer = cell.x * 2.0 + cell.y * 3.0 - cell.x * cell.y * 4.0;
  c = clamp(c + (bayer / 4.0 - 0.375) * 0.045, 0.0, 1.0);
  vec3 best = vec3(0.0); float bestDistance = 100.0;
  ${ARCADE_PALETTE.map((hex) => {
    const c = rgb(hex);
    return `{ vec3 p=vec3(${c.map((v) => v.toFixed(6)).join(",")}); vec3 d=c-p; float distance=dot(d*d,vec3(0.3,0.59,0.11)); if(distance<bestDistance){bestDistance=distance;best=p;} }`;
  }).join("\n")}
  gl_FragColor = vec4(best, 1.0);
}`;
