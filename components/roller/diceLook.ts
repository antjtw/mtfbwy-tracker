/*
 * How the dice look. Each look is a solid die with a slightly different finish and flat, opaque numerals that no light, reflection
 * or background can tint. The Dyad pair is frosted crystal: Balance blue with gold numerals, Despair red with white numerals. Every
 * other die is ivory with dark numerals.
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
}

export const LOOKS: Record<Look, LookSpec> = {
  balance: { body: 0x2b84c4, numeral: 0xe5bb4d, roughness: 0.3, clearcoat: 0.7, emissive: 0x174f80, tableGlow: 0.2, halo: 0.22 },
  despair: { body: 0xc8121d, numeral: 0xffffff, roughness: 0.62, clearcoat: 0.12, emissive: 0x500006, tableGlow: 0.1, halo: 0.26 },
  advantage: { body: 0xefe8d6, numeral: 0x30343a, roughness: 0.5, clearcoat: 0.25, tableGlow: 0, halo: 0 },
  disadvantage: { body: 0xefe8d6, numeral: 0x30343a, roughness: 0.5, clearcoat: 0.25, tableGlow: 0, halo: 0 },
  cream: { body: 0xefe8d6, numeral: 0x30343a, roughness: 0.5, clearcoat: 0.25, tableGlow: 0, halo: 0 },
  slate: { body: 0xefe8d6, numeral: 0x30343a, roughness: 0.5, clearcoat: 0.25, tableGlow: 0, halo: 0 },
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
    toneMapped: false, // the ivory dice keep the colours as specified; only the crystal is tone mapped
  });
}

/** Raw output colour: the shader writes the hex value itself, so nothing in the scene can change it */
const raw = (hex: number) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);

/** The body of a die made from a scanned mesh: the engraved numerals are part of it and are painted flat in the numeral colour */
export function engravedMaterial(look: Look): THREE.Material {
  const m = physical(look);
  m.flatShading = true;
  return banded(
    m,
    (shader) => {
      shader.uniforms.uNum = { value: raw(LOOKS[look].numeral) };
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uNum;")
        .replace("#include <dithering_fragment>", "#include <dithering_fragment>\nif (vEng > 0.5) gl_FragColor = vec4(uNum, 1.0);");
    },
    "engraved",
  );
}

/** Frosted crystal for the Dyad d12s (after the frosted-crystal-dice spec): milky partial transmission, polished bevels over frosted faces, a pale-to-deep gradient and a rim glow */
export const CRYSTAL = {
  balance: { tint: 0xa9dcf5, deep: 0x0a5fc0, glow: 0x39b8ff, numerals: { color: 0xe0b04a, metalness: 1, roughness: 0.3, emissive: 0x3a2400, emissiveIntensity: 0.6, envMapIntensity: 1.8 } },
  despair: { tint: 0xff9a9a, deep: 0xb00018, glow: 0xff3050, numerals: { color: 0xffffff, metalness: 0.1, roughness: 0.35, emissive: 0xffffff, emissiveIntensity: 0.25, envMapIntensity: 1 } },
} as const;

export function crystalMaterials(look: "balance" | "despair", radius: number, env: THREE.Texture) {
  const p = CRYSTAL[look];
  const k = radius / 2.2; // the spec's numbers are for dice about 2.2 across the corners
  const frost = 0.6, polish = 0.2, edgeWidth = 0.05 * k, glow = 0.5, gradient = 0.55;
  const glass = new THREE.MeshPhysicalMaterial({
    color: p.tint,
    metalness: 0,
    roughness: frost,
    transmission: 0.8,
    thickness: 2.4 * k,
    ior: 1.5,
    attenuationColor: new THREE.Color(p.deep),
    attenuationDistance: 2.6 * k,
    specularIntensity: 1,
    clearcoat: 0.2,
    clearcoatRoughness: 0.1,
    envMap: env,
    envMapIntensity: 1.5,
    emissive: new THREE.Color(p.glow),
    emissiveIntensity: 0.06,
    flatShading: true,
  });
  glass.onBeforeCompile = (sh) => {
    sh.uniforms.uPolish = { value: polish };
    sh.uniforms.uFrost = { value: frost };
    sh.uniforms.uEdgeW = { value: edgeWidth };
    sh.uniforms.uGrad = { value: gradient };
    sh.uniforms.uR = { value: radius };
    sh.uniforms.uDeep = { value: new THREE.Color(p.deep).multiplyScalar(2.2) };
    sh.uniforms.uGlow = { value: new THREE.Color(p.glow).multiplyScalar(glow) };
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aEdge;\nvarying float vEdge;\nvarying float vObjY;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvEdge = aEdge;\nvObjY = position.y;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying float vEdge;\nvarying float vObjY;\nuniform float uGrad;\nuniform float uR;\nuniform vec3 uDeep;\nuniform float uPolish;\nuniform float uFrost;\nuniform float uEdgeW;\nuniform vec3 uGlow;")
      .replace("#include <color_fragment>", "#include <color_fragment>\nfloat gy = smoothstep(-0.9, 0.9, vObjY / uR);\ndiffuseColor.rgb = mix(diffuseColor.rgb * uDeep, diffuseColor.rgb, mix(1.0, gy, uGrad));")
      // polished bevels, frosted face centres
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(uPolish, uFrost, smoothstep(0.0, uEdgeW, vEdge));")
      // rim glow, with a little extra at the bevels where real glass catches light
      .replace(
        "#include <opaque_fragment>",
        `float nv = saturate(dot(normalize(normal), normalize(vViewPosition)));
         float fres = pow(1.0 - nv, 3.0);
         float bevel = 1.0 - smoothstep(0.0, uEdgeW * 2.5, vEdge);
         outgoingLight += uGlow * (fres * 0.9 + bevel * 0.25);
         #include <opaque_fragment>`,
      );
  };
  glass.customProgramCacheKey = () => "frosted-crystal-v2";
  const nm = p.numerals;
  const numerals = new THREE.MeshStandardMaterial({
    color: nm.color,
    metalness: nm.metalness,
    roughness: nm.roughness,
    envMap: env,
    envMapIntensity: nm.envMapIntensity,
    emissive: new THREE.Color(nm.emissive),
    emissiveIntensity: nm.emissiveIntensity,
    flatShading: true,
  });
  return { glass, numerals };
}

/** A dark studio of emissive strip lights: facets only read as crystal when they have bright, hard-edged things to reflect */
export function buildStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x05080d);
  const strip = (w: number, h: number, x: number, y: number, z: number, intensity: number, color = 0xffffff) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  strip(24, 3, 0, 14, 0, 3.2); // overhead key strip
  strip(3, 20, -16, 4, 6, 4, 0xcfe6ff); // cool left strip
  strip(3, 20, 16, 4, -6, 4, 0xffe6c8); // warm right strip
  strip(18, 2.5, 0, 3, 18, 6); // front fill
  strip(30, 30, 0, -16, 0, 0.35, 0x6aa8ff); // soft bounce from below
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.02).texture;
  pm.dispose();
  return tex;
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
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: LOOKS[look].body, transparent: true, opacity: strength, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.04;
  return m;
}
