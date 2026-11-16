/*
 * The 3D dice: two d12s thrown into a free area of the screen and read from where they come to rest.
 * Loaded only when the roller is first opened (dynamic import), so Three.js stays out of the main bundle.
 * The physics result is the result: values are read from the settled dice, never rolled and replayed.
 */
import * as CANNON from "cannon-es";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { dieMaterial, glowMesh, numeralMaterial, type Kind } from "./diceLook";

const UP = new THREE.Vector3(0, 1, 0);

interface FaceMap {
  faces: { normal: [number, number, number]; value: number }[];
  colliderVertices: [number, number, number][];
}

/** Free area of the screen, in CSS pixels, where the dice may land */
export interface Area {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface DiceStage {
  throwDice(area: Area, force?: { balance: number; despair: number }): Promise<{ balance: number; despair: number; flatness: number }>;
  fade(): void;
  setVisible(on: boolean): void;
  resize(): void;
  dispose(): void;
}

function buildCollider(FACES: FaceMap) {
  const normals = FACES.faces.map((f) => new THREE.Vector3(...f.normal));
  const verts = FACES.colliderVertices.map((v) => new CANNON.Vec3(...v));
  const faceIdx = normals.map((n) => {
    const idx: number[] = [];
    verts.forEach((v, i) => {
      if (Math.abs(n.x * v.x + n.y * v.y + n.z * v.z - 1) < 1e-3) idx.push(i);
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
  const [FACES, glb] = await Promise.all([
    fetch("/dice/d12-faces.json").then((r) => r.json() as Promise<FaceMap>),
    new Promise<{ scene: THREE.Group }>((res, rej) => new GLTFLoader().load("/dice/d12.glb", res as never, undefined, rej)),
  ]);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping; // keep the two die colours as specified
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
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 40 });
  scene.add(sun);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.28 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  let bodyGeo: THREE.BufferGeometry | null = null;
  let numGeo: THREE.BufferGeometry | null = null;
  const meshes: THREE.Mesh[] = [];
  glb.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    meshes.push(m);
    if (/numer/i.test(m.name)) numGeo = m.geometry;
    else if (/body/i.test(m.name)) bodyGeo = m.geometry;
  });
  if (!bodyGeo || !numGeo) {
    meshes.sort((a, b) => b.geometry.attributes.position.count - a.geometry.attributes.position.count);
    bodyGeo = meshes[0].geometry;
    numGeo = meshes[1].geometry;
  }

  // Balance is the pale die with dark numerals, Despair the dark die with pale numerals
  const glows: THREE.Mesh[] = [];
  function makeDie(kind: Kind) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo!, dieMaterial(kind));
    const num = new THREE.Mesh(numGeo!, numeralMaterial(kind));
    body.castShadow = true;
    g.add(body, num);
    if (kind === "despair") {
      // Despair's pale numerals glow a little
      const halo = new THREE.Mesh(numGeo!, numeralMaterial(kind, true));
      halo.scale.setScalar(1.025);
      g.add(halo);
    }
    scene.add(g);
    const glow = glowMesh(kind === "balance" ? 0.2 : 0.07);
    scene.add(glow);
    glows.push(glow);
    return g;
  }

  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -45, 0) });
  world.allowSleep = true;
  world.defaultContactMaterial.friction = 0.6;
  world.defaultContactMaterial.restitution = 0.15;
  const shape = buildCollider(FACES);
  const dice = [
    { key: "balance", group: makeDie("balance"), body: new CANNON.Body({ mass: 1, shape, sleepSpeedLimit: 0.4, sleepTimeLimit: 0.3, linearDamping: 0.15, angularDamping: 0.2 }) },
    { key: "despair", group: makeDie("despair"), body: new CANNON.Body({ mass: 1, shape, sleepSpeedLimit: 0.4, sleepTimeLimit: 0.3, linearDamping: 0.15, angularDamping: 0.2 }) },
  ];
  dice.forEach((d) => world.addBody(d.body));

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
    const height = Math.max(26, 9.6 / (tan * camera.aspect)); // at least about 18.5 world units visible across: the dice are about 30% smaller than before
    camera.position.set(0, height, 0);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    view.halfH = tan * height;
    view.halfW = view.halfH * camera.aspect;
    view.height = height;
  }
  resize();

  function setArea(a: Area) {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const toX = (px: number) => (px / W) * 2 * view.halfW - view.halfW;
    const toZ = (py: number) => (py / H) * 2 * view.halfH - view.halfH;
    const pad = 0.6;
    play.x0 = toX(a.x0) + pad;
    play.x1 = toX(a.x1) - pad;
    play.z0 = toZ(a.y0) + pad;
    play.z1 = toZ(a.y1) - pad;
    // Never smaller than room for two dice
    if (play.x1 - play.x0 < 6) { const c = (play.x0 + play.x1) / 2; play.x0 = c - 3; play.x1 = c + 3; }
    if (play.z1 - play.z0 < 6) { const c = (play.z0 + play.z1) / 2; play.z0 = c - 3; play.z1 = c + 3; }
    walls[0].position.set(play.x1, 0, 0); // +x wall, normal -x
    walls[1].position.set(play.x0, 0, 0);
    walls[2].position.set(0, 0, play.z1);
    walls[3].position.set(0, 0, play.z0);
  }

  function sync() {
    dice.forEach((d, i) => {
      glows[i].position.set(d.body.position.x, 0.04, d.body.position.z);
      d.group.position.set(d.body.position.x, d.body.position.y, d.body.position.z);
      d.group.quaternion.set(d.body.quaternion.x, d.body.quaternion.y, d.body.quaternion.z, d.body.quaternion.w);
    });
  }
  function readTop(body: CANNON.Body) {
    const q = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
    let best = FACES.faces[0];
    let bd = -2;
    let bn = new THREE.Vector3();
    for (const f of FACES.faces) {
      const n = new THREE.Vector3(...f.normal).applyQuaternion(q);
      const d = n.dot(UP);
      if (d > bd) { bd = d; best = f; bn = n; }
    }
    return { value: best.value, flatness: bd, normal: bn };
  }

  let raf = 0;
  const onResize = () => resize();
  window.addEventListener("resize", onResize);
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);

  function throwDice(area: Area, force?: { balance: number; despair: number }) {
    return new Promise<{ balance: number; despair: number; flatness: number }>((resolve) => {
      cancelAnimationFrame(raf);
      resize();
      setArea(area);
      canvas.style.opacity = "1";
      dice.forEach((d, i) => {
        d.body.wakeUp();
        d.body.position.set(play.x1 - 2 - i * 2.6, rnd(5, 7), play.z1 - 2 - rnd(0, 1.5));
        d.body.quaternion.setFromEuler(rnd(0, 6.28), rnd(0, 6.28), rnd(0, 6.28));
        d.body.velocity.set(-rnd(13, 20), rnd(-2, 2), -rnd(7, 13));
        d.body.angularVelocity.set(rnd(-18, 18), rnd(-18, 18), rnd(-18, 18));
      });
      let last = performance.now();
      let simTime = 0;
      let calm = 0;
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        simTime += dt;
        world.step(1 / 60, dt, 4);
        dice.forEach((d, i) => {
          const p = d.body.position;
          const q = d.body.quaternion;
          const outside = p.x < play.x0 - 6 || p.x > play.x1 + 6 || p.z < play.z0 - 6 || p.z > play.z1 + 6;
          if (![p.x, p.y, p.z, q.x, q.y, q.z, q.w].every(Number.isFinite) || outside || p.y < -1) {
            d.body.position.set((play.x0 + play.x1) / 2 - 1.5 + i * 3, 3, (play.z0 + play.z1) / 2);
            d.body.quaternion.set(0, 0, 0, 1);
            d.body.velocity.setZero();
            d.body.angularVelocity.setZero();
            d.body.wakeUp();
            return;
          }
          // Once a die is down and slowing it settles briskly: it loses its wobble quickly, and a die balanced on an edge or
          // corner is eased on to the face it is nearest to (what gravity would do, only sooner) instead of dithering there.
          if (p.y < 2 && d.body.velocity.length() < 2.2 && d.body.angularVelocity.length() < 4) {
            d.body.angularDamping = 0.8;
            d.body.linearDamping = 0.4;
            const top = readTop(d.body);
            if (top.flatness < 0.9995) {
              const cur = new THREE.Quaternion(q.x, q.y, q.z, q.w);
              const toFlat = new THREE.Quaternion().setFromUnitVectors(top.normal, UP);
              cur.premultiply(new THREE.Quaternion().slerp(toFlat, 0.22));
              d.body.quaternion.set(cur.x, cur.y, cur.z, cur.w);
              d.body.position.y = Math.max(1, p.y * 0.78 + 0.22); // a die lying flat sits one unit above the table
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
        const reads = dice.map((d) => readTop(d.body));
        const still = dice.every((d, i) => d.body.velocity.length() < 0.25 && d.body.angularVelocity.length() < 0.4 && reads[i].flatness > 0.997);
        calm = still ? calm + 1 : 0;
        if (calm >= 8 || simTime > 6) {
          // Test builds can ask for a particular roll: the dice are turned to show it, then read as usual
          if (force) {
            [force.balance, force.despair].forEach((v, k) => {
              const f = FACES.faces.find((x) => x.value === v)!;
              const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...f.normal), UP);
              dice[k].body.quaternion.set(q.x, q.y, q.z, q.w);
            });
            sync();
            renderer.render(scene, camera);
          }
          dice.forEach((d) => {
            d.body.velocity.setZero();
            d.body.angularVelocity.setZero();
            d.body.sleep();
          });
          const out = dice.map((d) => readTop(d.body));
          if (process.env.NODE_ENV !== "production") (window as unknown as { __dyadSettle?: number[] }).__dyadSettle = [...((window as unknown as { __dyadSettle?: number[] }).__dyadSettle ?? []), simTime];
          resolve({ balance: out[0].value, despair: out[1].value, flatness: Math.min(out[0].flatness, out[1].flatness) });
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
      renderer.dispose();
    },
  };
}
