/*
 * How the dice look. Each look is a solid die with a slightly different finish and flat, opaque numerals that no light, reflection
 * or background can tint. The Dyad pair is Balance (polished blue, gold numerals) and Despair (frosted red, white numerals). Every
 * other die is matte painted stone after the ship interiors: ivory (or dark grey) with inset panels, some left plain, some grey,
 * some orange, and engraved numerals.
 */
import * as THREE from "three";

export type Look = "balance" | "despair" | "advantage" | "disadvantage" | "cream" | "slate";

export interface LookSpec {
  body: number;
  numeral: number;
  roughness: number;
  clearcoat: number;
  /** A little light from the body itself (0 for none) */
  emissive?: number;
  /** Strength of the soft glow laid on the table under the die */
  tableGlow: number;
  /** A faint halo round the numerals (the d12 only) */
  halo: number;
  /** For the inset-panel dice: the fill of a plain, a grey and an orange panel, and the colour of the panel's outline */
  panels?: [number, number, number];
  outline?: number;
}

export const LOOKS: Record<Look, LookSpec> = {
  balance: { body: 0x2b84c4, numeral: 0xe5bb4d, roughness: 0.3, clearcoat: 0.7, emissive: 0x174f80, tableGlow: 0.2, halo: 0.22 },
  despair: { body: 0xc8121d, numeral: 0xffffff, roughness: 0.62, clearcoat: 0.12, emissive: 0x500006, tableGlow: 0.1, halo: 0.26 },
  advantage: { body: 0xe9e2cf, numeral: 0x30343a, roughness: 0.88, clearcoat: 0, tableGlow: 0, halo: 0, panels: [0xe9e2cf, 0xa3a6a6, 0xe8a64e], outline: 0xb2a98f },
  disadvantage: { body: 0x676d72, numeral: 0xe9e2cf, roughness: 0.88, clearcoat: 0, tableGlow: 0, halo: 0, panels: [0x676d72, 0x7c8286, 0xe8a64e], outline: 0x4c5155 },
  cream: { body: 0xe9e2cf, numeral: 0x30343a, roughness: 0.88, clearcoat: 0, tableGlow: 0, halo: 0, panels: [0xe9e2cf, 0xa3a6a6, 0xe8a64e], outline: 0xb2a98f },
  slate: { body: 0x676d72, numeral: 0xe9e2cf, roughness: 0.88, clearcoat: 0, tableGlow: 0, halo: 0, panels: [0x676d72, 0x7c8286, 0xe8a64e], outline: 0x4c5155 },
};

/** Light and dark bands across the die, so it reads as stone or glass rather than flat plastic. Turns with the die. */
function banded(m: THREE.MeshPhysicalMaterial, extra?: (shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, THREE.IUniform> }) => void, key = "banded") {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float eng;\nattribute float kind;\nattribute float edge;\nvarying float vEng;\nvarying float vLy;\nvarying float vKind;\nvarying float vEdge;\nvarying vec3 vPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvEng = eng; vLy = position.y; vKind = kind; vEdge = edge; vPos = position;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vEng;\nvarying float vLy;\nvarying float vKind;\nvarying float vEdge;\nvarying vec3 vPos;")
      .replace("#include <color_fragment>", "#include <color_fragment>\ndiffuseColor.rgb *= mix(0.84, 1.1, smoothstep(-1.3, 1.3, vLy));");
    extra?.(shader);
  };
  m.customProgramCacheKey = () => key;
  return m;
}

function physical(look: Look): THREE.MeshPhysicalMaterial {
  const s = LOOKS[look];
  return new THREE.MeshPhysicalMaterial({
    color: s.body,
    roughness: s.roughness,
    metalness: 0,
    clearcoat: s.clearcoat,
    clearcoatRoughness: 0.25,
    emissive: s.emissive ?? 0x000000,
    emissiveIntensity: s.emissive ? 0.18 : 0,
    envMapIntensity: 1,
  });
}

/** Raw output colour: the shader writes the hex value itself, so nothing in the scene can change it */
const raw = (hex: number) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);

/** The body of the d12, whose numerals are a separate mesh */
export function dieMaterial(look: Look): THREE.Material {
  return banded(physical(look), undefined, "d12body");
}

/** The body of a die made from a scanned mesh: the engraved numerals are part of it and are painted flat in the numeral colour */
export function engravedMaterial(look: Look): THREE.Material {
  const m = physical(look);
  m.flatShading = true;
  return banded(
    m,
    (shader) => {
      const spec = LOOKS[look];
      shader.uniforms.uNum = { value: raw(spec.numeral) };
      const panel = (hex: number) => new THREE.Color(hex);
      shader.uniforms.uPanel0 = { value: panel(spec.panels?.[0] ?? spec.body) };
      shader.uniforms.uPanel1 = { value: panel(spec.panels?.[1] ?? spec.body) };
      shader.uniforms.uPanel2 = { value: panel(spec.panels?.[2] ?? spec.body) };
      shader.uniforms.uOutline = { value: panel(spec.outline ?? spec.body) };
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uNum;\nuniform vec3 uPanel0;\nuniform vec3 uPanel1;\nuniform vec3 uPanel2;\nuniform vec3 uOutline;")
        // Inset panels: the face inside the rim takes its panel colour, with a thin outline on the rim, and a fine speckle over the lot
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          {
            vec3 tint = vKind < 0.5 ? uPanel0 : (vKind < 1.5 ? uPanel1 : uPanel2);
            float inside = smoothstep(0.125, 0.135, vEdge);
            diffuseColor.rgb = mix(diffuseColor.rgb, tint, inside);
            float ln = 1.0 - smoothstep(0.0, 0.012, abs(vEdge - 0.125));
            diffuseColor.rgb = mix(diffuseColor.rgb, uOutline, ln * 0.85);
            float grain = fract(sin(dot(floor(vPos * 90.0), vec3(12.9898, 78.233, 45.164))) * 43758.5453);
            diffuseColor.rgb *= 0.95 + 0.1 * grain;
          }`,
        )
        .replace("#include <dithering_fragment>", "#include <dithering_fragment>\nif (vEng > 0.5) gl_FragColor = vec4(uNum, 1.0);");
    },
    "engraved",
  );
}

/** The twelve face directions of the d12. Each numeral belongs to one of them. */
const FACE_NORMALS = /* glsl */ `
const float FA = 0.850651; const float FB = 0.525731;
vec3 dieFaceNormal(vec3 p) {
  vec3 best = vec3(0.0); float bd = -2.0; vec3 q = normalize(p);
  for (int i = 0; i < 12; i++) {
    float s1 = (i & 1) == 0 ? 1.0 : -1.0; float s2 = (i & 2) == 0 ? 1.0 : -1.0;
    vec3 n = i < 4 ? vec3(0.0, s1 * FA, s2 * FB) : (i < 8 ? vec3(s1 * FB, 0.0, s2 * FA) : vec3(s1 * FA, s2 * FB, 0.0));
    float d = dot(q, n);
    if (d > bd) { bd = d; best = n; }
  }
  return best;
}
`;

/**
 * The d12's numerals: flat, unlit, in exactly the colour asked for, drawn only on faces turned towards the camera.
 * With `halo`, a faint additive copy that gives them a slight glow.
 */
export function numeralMaterial(look: Look, halo = false): THREE.Material {
  return new THREE.ShaderMaterial({
    uniforms: { uColour: { value: raw(LOOKS[look].numeral) }, uAlpha: { value: halo ? LOOKS[look].halo : 1 } },
    vertexShader: /* glsl */ `
      ${FACE_NORMALS}
      varying vec3 vFaceN;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = -mv.xyz;
        vFaceN = normalize(normalMatrix * dieFaceNormal(position));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColour;
      uniform float uAlpha;
      varying vec3 vFaceN;
      varying vec3 vView;
      void main() {
        if (dot(normalize(vView), normalize(vFaceN)) < 0.12) discard;
        gl_FragColor = vec4(uColour, uAlpha);
      }
    `,
    transparent: halo,
    blending: halo ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: !halo,
  });
}

/** A soft glow laid on the table under a die */
export function glowMesh(look: Look, strength: number): THREE.Mesh {
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
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: LOOKS[look].body, transparent: true, opacity: strength, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.04;
  return m;
}
