/*
 * Kyber crystal look for the dice (spec section 9): a translucent body that goes deep at the thick end and pale at the
 * thin, a glow that shows when you look straight through it, a hot fresnel rim, and fractures and specks from object-space
 * noise (the model has no UVs, so there is no painted texture). Blue for Balance; red with an amber core for Despair.
 * A "lite" version skips transmission (an extra render pass that is heavy on phones) and keeps the rest.
 */
import * as THREE from "three";

export type Kind = "balance" | "despair";

const PALETTE = {
  balance: { deep: 0x05187a, mid: 0x1a56c8, pale: 0x78b0ec, core: 0x2a86d8, rim: 0xa0d4f0, numeral: 0xd8eefc, glow: 0x2f7fe0, attenuation: 0x0a3fe0 },
  despair: { deep: 0x5c040c, mid: 0xc4170d, pale: 0xff9c78, core: 0xff8a1f, rim: 0xfff0c8, numeral: 0xfff3dc, glow: 0xff5a2a, attenuation: 0xc8101c },
} as const;

const NOISE = /* glsl */ `
varying vec3 vObj;
uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uPale; uniform vec3 uCore; uniform vec3 uRim; uniform float uSeed;
float kSpeck; float kVein; float kG;
float h31(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

const COLOUR = /* glsl */ `
#include <color_fragment>
{
  vec3 kp = vObj + uSeed;
  kG = smoothstep(-1.1, 1.1, dot(normalize(vObj), normalize(vec3(0.3, 0.8, 0.5))));
  float cloud = vnoise(kp * 3.0) * 0.6 + vnoise(kp * 7.0) * 0.4;
  vec3 base = mix(uDeep, uMid, smoothstep(0.1, 0.8, kG + cloud * 0.15 - 0.08));
  base = mix(base, uPale, smoothstep(0.78, 1.0, kG + cloud * 0.12));
  kVein = 1.0 - smoothstep(0.0, 0.02, abs(vnoise(kp * 5.0) - 0.5));
  kSpeck = step(0.985, vnoise(kp * 38.0));
  diffuseColor.rgb = mix(base, vec3(0.02), kVein * 0.18);
}
`;

const EMISSIVE = /* glsl */ `
#include <emissivemap_fragment>
{
  float kf = pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 2.2);
  float core = pow(1.0 - kf, 3.0);
  totalEmissiveRadiance += uCore * core * 0.26 * (0.6 + kG * 0.6);
  totalEmissiveRadiance += uRim * kf * 0.26;
  totalEmissiveRadiance += vec3(1.0) * kSpeck * 0.3 + uRim * kVein * 0.12;
}
`;

export function kyberMaterial(kind: Kind, lite: boolean, seed: number): THREE.Material {
  const c = PALETTE[kind];
  const common = { color: 0xffffff, roughness: 0.16, metalness: 0, envMapIntensity: 0.28 };
  const mat = lite
    ? new THREE.MeshStandardMaterial(common)
    : new THREE.MeshPhysicalMaterial({ ...common, clearcoat: 0.6, clearcoatRoughness: 0.12, ior: 1.5, transmission: 0.25, thickness: 1.4, attenuationColor: new THREE.Color(c.attenuation), attenuationDistance: 0.9 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDeep = { value: new THREE.Color(c.deep) };
    shader.uniforms.uMid = { value: new THREE.Color(c.mid) };
    shader.uniforms.uPale = { value: new THREE.Color(c.pale) };
    shader.uniforms.uCore = { value: new THREE.Color(c.core) };
    shader.uniforms.uRim = { value: new THREE.Color(c.rim) };
    shader.uniforms.uSeed = { value: seed };
    shader.vertexShader = shader.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vObj;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvObj = position;");
    shader.fragmentShader = shader.fragmentShader.replace("#include <common>", `#include <common>\n${NOISE}`).replace("#include <color_fragment>", COLOUR).replace("#include <emissivemap_fragment>", EMISSIVE);
  };
  mat.customProgramCacheKey = () => `kyber-${kind}-${lite ? "lite" : "full"}`;
  return mat;
}

/** The numerals: separate mesh, strong emissive, so they stay readable whatever the body does */
export const numeralMaterial = (kind: Kind) => new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: PALETTE[kind].numeral, emissiveIntensity: 1.6, roughness: 0.4 });

/** A soft coloured glow laid on the table under a die, so the crystal seems to light its surroundings */
export function glowMesh(kind: Kind): THREE.Mesh {
  const size = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.35, "rgba(255,255,255,0.28)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: PALETTE[kind].glow, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.04;
  return m;
}
