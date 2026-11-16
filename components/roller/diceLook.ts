/*
 * How the dice look. Two solid dice, each the other's colour in reverse: Balance is pale (#DAE7EB) with dark numerals (#161B20),
 * Despair is dark (#161B20) with pale numerals (#DAE7EB). Each has a slight gloss. The pale part of each die glows a little:
 * Balance's body, Despair's numerals. The numerals are separate, flat and opaque, and only those on faces turned towards the
 * camera are drawn.
 */
import * as THREE from "three";

export type Kind = "balance" | "despair";

const PALE = 0xdae7eb;
const DARK = 0x161b20;
const LOOK = {
  balance: { body: PALE, numeral: DARK },
  despair: { body: DARK, numeral: PALE },
} as const;

/** The die itself: solid, with a slight gloss. Balance, the pale one, gives off a little light. */
export function dieMaterial(kind: Kind): THREE.Material {
  const pale = kind === "balance";
  return new THREE.MeshPhysicalMaterial({
    color: LOOK[kind].body,
    roughness: 0.38,
    metalness: 0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.25,
    emissive: pale ? PALE : 0x000000,
    emissiveIntensity: pale ? 0.05 : 0,
    envMapIntensity: 1,
  });
}

/** The twelve face directions of the die. Each numeral belongs to one of them. */
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
 * Flat, unlit numerals in exactly the colour asked for, so lighting, reflections and what is behind the die can't tint them.
 * With `halo`, a faint additive copy that gives the numerals a slight glow.
 */
export function numeralMaterial(kind: Kind, halo = false): THREE.Material {
  // Set without colour conversion so the shader's output is the hex value itself
  const colour = new THREE.Color().setHex(LOOK[kind].numeral, THREE.LinearSRGBColorSpace);
  return new THREE.ShaderMaterial({
    uniforms: { uColour: { value: colour }, uAlpha: { value: halo ? 0.28 : 1 } },
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

/** A soft pale glow laid on the table under a die */
export function glowMesh(strength: number): THREE.Mesh {
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
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), color: PALE, transparent: true, opacity: strength, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.04;
  return m;
}
