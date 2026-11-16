/*
 * The 3D dice: any mix of dice (the two d12s of a Dyad roll, advantage d6s, damage dice) thrown into a free area of the screen
 * and read from where they come to rest.
 * Loaded only when the roller is first opened (dynamic import), so Three.js stays out of the main bundle.
 * The physics result is the result: values are read from the settled dice, never rolled and replayed.
 */
import * as CANNON from "cannon-es";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { dieMaterial, engravedMaterial, glowMesh, LOOKS, numeralMaterial, type Look } from "./diceLook";

const UP = new THREE.Vector3(0, 1, 0);

/** The dice we have models for. g4, g8 and g10 are the d4, d8 and d10 in a form that rolls fairly: each number is on three faces. */
export type DieType = "d12" | "d6" | "d20" | "g4" | "g8" | "g10";
export interface DieSpec {
  type: DieType;
  look: Look;
}
/** What the numbers on each kind of die run to */
export const SIDES: Record<DieType, number> = { d12: 12, d6: 6, d20: 20, g4: 4, g8: 8, g10: 10 };

interface FaceMap {
  /** `h` is how far the face's plane is from the centre (1 for the d12) */
  faces: { normal: [number, number, number]; value: number; h?: number }[];
  colliderVertices: [number, number, number][];
}

interface Model {
  faces: FaceMap["faces"];
  shape: CANNON.ConvexPolyhedron;
  make(look: Look): THREE.Group;
}

/** Free area of the screen, in CSS pixels, where the dice may land */
export interface Area {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface DiceStage {
  /** Throws these dice and resolves with the number each shows, in the same order */
  throwDice(area: Area, dice: DieSpec[], force?: number[]): Promise<{ values: number[]; flatness: number }>;
  fade(): void;
  setVisible(on: boolean): void;
  resize(): void;
  dispose(): void;
}

function buildCollider(FACES: FaceMap) {
  const normals = FACES.faces.map((f) => new THREE.Vector3(...f.normal));
  const verts = FACES.colliderVertices.map((v) => new CANNON.Vec3(...v));
  const faceIdx = normals.map((n, fi) => {
    const idx: number[] = [];
    verts.forEach((v, i) => {
      if (Math.abs(n.x * v.x + n.y * v.y + n.z * v.z - (FACES.faces[fi].h ?? 1)) < 0.012) idx.push(i);
    });
    const ref = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(n, ref).normalize();
    const w = new THREE.Vector3().crossVectors(n, u);
    const c = new THREE.Vector3();
    idx.forEach((i) => c.add(new THREE.Vector3(verts[i].x, verts[i].y, verts[i].z)));
    c.divideScalar(idx.length);
    idx.sort((a, b) => {
      const pa = new THREE.Vector3(verts[a].x, verts[a].y, verts[a].z).sub(c);
      const pb = new THREE.Vector3(verts[b].x, verts[b].y, verts[b].z).sub(c);
      return Math.atan2(pa.dot(w), pa.dot(u)) - Math.atan2(pb.dot(w), pb.dot(u));
    });
    return idx;
  });
  const shape = new CANNON.ConvexPolyhedron({ vertices: verts, faces: faceIdx });
  // Make sure cannon agrees the face normals point outwards, otherwise flip the winding
  const bad = shape.faceNormals.some((fn, i) => fn.x * normals[i].x + fn.y * normals[i].y + fn.z * normals[i].z < 0);
  return bad ? new CANNON.ConvexPolyhedron({ vertices: verts, faces: faceIdx.map((f) => f.slice().reverse()) }) : shape;
}

export async function createDiceStage(canvas: HTMLCanvasElement): Promise<DiceStage> {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping; // keep the colours as specified
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.16; // just enough for the gloss; the dice colours come from the lights below
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  camera.up.set(0, 0, -1);

  const sun = new THREE.DirectionalLight(0xffffff, 0.5);
  sun.position.set(-3, 16, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 40 });
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.28 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Models load the first time a kind of die is thrown
  const models = new Map<DieType, Promise<Model>>();
  function loadModel(type: DieType): Promise<Model> {
    let m = models.get(type);
    if (!m) {
      m = type === "d12" ? loadD12() : loadScanned(type);
      models.set(type, m);
    }
    return m;
  }
  async function loadD12(): Promise<Model> {
    const [FACES, glb] = await Promise.all([
      fetch("/dice/d12-faces.json").then((r) => r.json() as Promise<FaceMap>),
      new Promise<{ scene: THREE.Group }>((res, rej) => new GLTFLoader().load("/dice/d12.glb", res as never, undefined, rej)),
    ]);
    let bodyGeo: THREE.BufferGeometry | null = null;
    let numGeo: THREE.BufferGeometry | null = null;
    const meshes: THREE.Mesh[] = [];
    glb.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      meshes.push(mesh);
      if (/numer/i.test(mesh.name)) numGeo = mesh.geometry;
      else if (/body/i.test(mesh.name)) bodyGeo = mesh.geometry;
    });
    if (!bodyGeo || !numGeo) {
      meshes.sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count);
      bodyGeo = meshes[0].geometry;
      numGeo = meshes[1].geometry;
    }
    return {
      faces: FACES.faces,
      shape: buildCollider(FACES),
      make(look) {
        const g = new THREE.Group();
        const body = new THREE.Mesh(bodyGeo!, dieMaterial(look));
        body.castShadow = true;
        g.add(body, new THREE.Mesh(numGeo!, numeralMaterial(look)));
        if (LOOKS[look].halo > 0) {
          const halo = new THREE.Mesh(numGeo!, numeralMaterial(look, true));
          halo.scale.setScalar(1.025);
          g.add(halo);
        }
        return g;
      },
    };
  }
  async function loadScanned(type: DieType): Promise<Model> {
    const [meta, buf] = await Promise.all([
      fetch(`/dice/${type}.json`).then((r) => r.json() as Promise<FaceMap & { vertices: number; indices: number; indexBytes: number }>),
      fetch(`/dice/${type}.bin`).then((r) => r.arrayBuffer()),
    ]);
    const V = meta.vertices;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(buf, 0, V * 3), 3));
    geo.setAttribute("eng", new THREE.BufferAttribute(new Float32Array(buf, V * 12, V), 1));
    geo.setAttribute("kind", new THREE.BufferAttribute(new Float32Array(buf, V * 16, V), 1));
    geo.setAttribute("edge", new THREE.BufferAttribute(new Float32Array(buf, V * 20, V), 1));
    const idxArr = meta.indexBytes === 4 ? new Uint32Array(buf, V * 24, meta.indices) : new Uint16Array(buf, V * 24, meta.indices);
    geo.setIndex(new THREE.BufferAttribute(idxArr, 1));
    geo.computeBoundingSphere();
    return {
      faces: meta.faces,
      shape: buildCollider(meta),
      make(look) {
        const g = new THREE.Group();
        const mesh = new THREE.Mesh(geo, engravedMaterial(look));
        mesh.castShadow = true;
        g.add(mesh);
        return g;
      },
    };
  }

  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -45, 0) });
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.6;
  world.defaultContactMaterial.restitution = 0.15;

  interface Live {
    model: Model;
    group: THREE.Group;
    body: CANNON.Body;
    glow: THREE.Mesh | null;
  }
  let live: Live[] = [];
  function clearDice() {
    for (const d of live) {
      scene.remove(d.group);
      d.group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) (mesh.material as THREE.Material).dispose(); // the shared geometry stays
      });
      if (d.glow) {
        scene.remove(d.glow);
        (d.glow.material as THREE.Material).dispose();
      }
      world.removeBody(d.body);
    }
    live = [];
  }

  function addPlane(axis: [number, number, number], angle: number) {
    const b = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    b.quaternion.setFromAxisAngle(new CANNON.Vec3(...axis), angle);
    world.addBody(b);
    return b;
  }
  addPlane([1, 0, 0], -Math.PI / 2); // floor
  const ceiling = addPlane([1, 0, 0], Math.PI / 2);
  ceiling.position.set(0, 8, 0);
  // Walls: normals point INTO the play area (an earlier version had them reversed and threw the dice out)
  const walls = [addPlane([0, 1, 0], -Math.PI / 2), addPlane([0, 1, 0], Math.PI / 2), addPlane([0, 1, 0], Math.PI), addPlane([0, 1, 0], 0)];

  // World rectangle the dice may use, set from the free pixel area on each throw
  const play = { x0: -8, x1: 8, z0: -5, z1: 5 };
  const view = { halfW: 8, halfH: 5, height: 14 };

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const height = Math.max(26, 9.6 / (tan * camera.aspect)); // at least about 18.5 world units visible across
    camera.position.set(0, height, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    view.halfH = tan * height;
    view.halfW = view.halfH * camera.aspect;
    view.height = height;
  }
  resize();

  function setArea(a: Area, count: number) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const toX = (px: number) => (px / W) * 2 * view.halfW - view.halfW;
    const toZ = (py: number) => (py / H) * 2 * view.halfH - view.halfH;
    const pad = 0.6;
    play.x0 = toX(a.x0) + pad;
    play.x1 = toX(a.x1) - pad;
    play.z0 = toZ(a.y0) + pad;
    play.z1 = toZ(a.y1) - pad;
    // Never smaller than room for the dice being thrown
    const least = Math.max(6, 3.4 * Math.ceil(Math.sqrt(count)));
    if (play.x1 - play.x0 < least) { const c = (play.x0 + play.x1) / 2; play.x0 = c - least / 2; play.x1 = c + least / 2; }
    if (play.z1 - play.z0 < least) { const c = (play.z0 + play.z1) / 2; play.z0 = c - least / 2; play.z1 = c + least / 2; }
    walls[0].position.set(play.x1, 0, 0); // +x wall, normal -x
    walls[1].position.set(play.x0, 0, 0);
    walls[2].position.set(0, 0, play.z1);
    walls[3].position.set(0, 0, play.z0);
  }

  function sync() {
    for (const d of live) {
      d.glow?.position.set(d.body.position.x, 0.04, d.body.position.z);
      d.group.position.set(d.body.position.x, d.body.position.y, d.body.position.z);
      d.group.quaternion.set(d.body.quaternion.x, d.body.quaternion.y, d.body.quaternion.z, d.body.quaternion.w);
    }
  }
  function readTop(d: Live) {
    const body = d.body;
    const q = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    let best = d.model.faces[0];
    let bd = -2;
    let bn = new THREE.Vector3();
    let low = 1;
    let lowH = 1;
    for (const f of d.model.faces) {
      const n = new THREE.Vector3(...f.normal).applyQuaternion(q);
      const dd = n.dot(UP);
      if (dd > bd) { bd = dd; best = f; bn = n; }
      if (dd < low) { low = dd; lowH = f.h ?? 1; }
    }
    return { value: best.value, flatness: bd, normal: bn, restHeight: lowH };
  }

  let raf = 0;
  const onResize = () => resize();
  window.addEventListener("resize", onResize);
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);

  async function throwDice(area: Area, specs: DieSpec[], force?: number[]) {
    const kinds = await Promise.all(specs.map((s) => loadModel(s.type)));
    return new Promise<{ values: number[]; flatness: number }>((resolve) => {
      cancelAnimationFrame(raf);
      clearDice();
      resize();
      setArea(area, specs.length);
      canvas.style.opacity = "1";
      live = specs.map((spec, i) => {
        const model = kinds[i];
        const group = model.make(spec.look);
        scene.add(group);
        const strength = LOOKS[spec.look].tableGlow;
        const glow = strength > 0 ? glowMesh(spec.look, strength) : null;
        if (glow) scene.add(glow);
        const body = new CANNON.Body({ mass: 1, shape: model.shape, sleepSpeedLimit: 0.4, sleepTimeLimit: 0.3, linearDamping: 0.15, angularDamping: 0.2 });
        world.addBody(body);
        const col = i % 3;
        const row = Math.floor(i / 3);
        body.position.set(play.x1 - 2 - col * 2.8, rnd(5, 7) + row * 0.4, play.z1 - 2 - row * 2.6 - rnd(0, 1.5));
        body.quaternion.setFromEuler(rnd(0, 6.28), rnd(0, 6.28), rnd(0, 6.28));
        body.velocity.set(-rnd(13, 20), rnd(-2, 2), -rnd(7, 13));
        body.angularVelocity.set(rnd(-18, 18), rnd(-18, 18), rnd(-18, 18));
        return { model, group, body, glow };
      });
      let last = performance.now();
      let simTime = 0;
      let calm = 0;
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        simTime += dt;
        world.step(1 / 60, dt, 4);
        live.forEach((d, i) => {
          const p = d.body.position;
          const q = d.body.quaternion;
          const outside = p.x < play.x0 - 6 || p.x > play.x1 + 6 || p.z < play.z0 - 6 || p.z > play.z1 + 6;
          if (![p.x, p.y, p.z, q.x, q.y, q.z, q.w].every(Number.isFinite) || outside || p.y < -1) {
            d.body.position.set((play.x0 + play.x1) / 2 - 1.5 + (i % 3) * 3, 3, (play.z0 + play.z1) / 2 + Math.floor(i / 3) * 2.6);
            d.body.quaternion.set(0, 0, 0, 1);
            d.body.velocity.setZero();
            d.body.angularVelocity.setZero();
            d.body.wakeUp();
            return;
          }
          // Once a die is down and slowing it settles briskly: it loses its wobble quickly, and a die balanced on an edge or
          // corner is eased on to the face it is nearest to (what gravity would do, only sooner) instead of dithering there.
          const top = readTop(d);
          if (p.y < top.restHeight + 1 && d.body.velocity.length() < 2.2 && d.body.angularVelocity.length() < 4) {
            d.body.angularDamping = 0.8;
            d.body.linearDamping = 0.4;
            if (top.flatness < 0.9995) {
              const cur = new THREE.Quaternion(q.x, q.y, q.z, q.w);
              const toFlat = new THREE.Quaternion().setFromUnitVectors(top.normal, UP);
              cur.premultiply(new THREE.Quaternion().slerp(toFlat, 0.22));
              d.body.quaternion.set(cur.x, cur.y, cur.z, cur.w);
              d.body.position.y = Math.max(top.restHeight, p.y * 0.78 + 0.22 * top.restHeight); // a die lying flat rests on its face
              d.body.angularVelocity.scale(0.5, d.body.angularVelocity);
              d.body.velocity.y = Math.min(d.body.velocity.y, 0);
            }
          } else {
            d.body.angularDamping = 0.2;
            d.body.linearDamping = 0.15;
          }
        });
        sync();
        renderer.render(scene, camera);
        const reads = live.map(readTop);
        const still = live.every((d, i) => d.body.velocity.length() < 0.25 && d.body.angularVelocity.length() < 0.4 && reads[i].flatness > 0.997);
        calm = still ? calm + 1 : 0;
        if (calm >= 8 || simTime > 6 + live.length * 0.4) {
          // Test builds can ask for particular numbers: the dice are turned to show them, then read as usual
          if (force) {
            force.forEach((v, k) => {
              const f = live[k]?.model.faces.find((x) => x.value === v);
              if (!f) return;
              const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...f.normal), UP);
              live[k].body.quaternion.set(q.x, q.y, q.z, q.w);
            });
            sync();
            renderer.render(scene, camera);
          }
          live.forEach((d) => {
            d.body.velocity.setZero();
            d.body.angularVelocity.setZero();
            d.body.sleep();
          });
          const out = live.map(readTop);
          if (process.env.NODE_ENV !== "production") (window as unknown as { __dyadSettle?: number[] }).__dyadSettle = [...((window as unknown as { __dyadSettle?: number[] }).__dyadSettle ?? []), simTime];
          resolve({ values: out.map((o) => o.value), flatness: Math.min(...out.map((o) => o.flatness)) });
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
  }

  return {
    throwDice,
    fade: () => { canvas.style.opacity = "0"; },
    setVisible: (on) => { canvas.style.opacity = on ? "1" : "0"; },
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      clearDice();
      renderer.dispose();
    },
  };
}
