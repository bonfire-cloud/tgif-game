import { Engine } from "@babylonjs/core/Engines/engine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { Vector3, Matrix } from "@babylonjs/core/Maths/math.vector.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator.js";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture.js";
import { DESKS, BUMPERS, type Snapshot } from "../shared/game.js";
export type Point = { x: number; y: number };
export function createOffice(
  canvas: HTMLCanvasElement,
  onAim: (point: Point, fire: boolean) => void,
  onProject: (points: Point[]) => void,
) {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
  });
  engine.setHardwareScalingLevel(
    Math.min(2, window.devicePixelRatio > 1.5 ? 1.25 : 1),
  );
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString("#423553ff");
  const camera = new FreeCamera("fika-camera", new Vector3(0, 13, -9), scene);
  camera.setTarget(new Vector3(0, 0, 0));
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  const hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.75;
  hemi.groundColor = Color3.FromHexString("#685078");
  const sun = new DirectionalLight(
    "friday-sunset",
    new Vector3(-0.7, -1, 0.5),
    scene,
  );
  sun.position = new Vector3(7, 12, -6);
  sun.intensity = 1.0;
  sun.diffuse = Color3.FromHexString("#ffd6a2");
  const shadows = new ShadowGenerator(1024, sun);
  shadows.useBlurExponentialShadowMap = true;
  shadows.blurKernel = 24;
  const mats: Record<string, StandardMaterial> = {};
  function mat(name: string, color: string, glow = 0) {
    if (mats[name]) return mats[name];
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.specularColor = new Color3(0.12, 0.1, 0.1);
    if (glow) m.emissiveColor = Color3.FromHexString(color).scale(glow);
    mats[name] = m;
    return m;
  }
  const ink = mat("ink", "#251d3a"),
    cream = mat("cream", "#f5e7cc"),
    beige = mat("beige", "#c5ad8b"),
    orange = mat("orange", "#ff7a3d"),
    teal = mat("teal", "#49b8b0"),
    green = mat("green", "#a9d978", 0.3),
    purple = mat("purple", "#6c4c85"),
    pink = mat("pink", "#e882ad");
  function box(
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    m: StandardMaterial,
    cast = true,
  ) {
    const mesh = MeshBuilder.CreateBox(
      name,
      { width: w, height: h, depth: d },
      scene,
    );
    mesh.position.set(x, y, z);
    mesh.material = m;
    mesh.receiveShadows = true;
    if (cast) shadows.addShadowCaster(mesh);
    return mesh;
  }
  function cyl(
    name: string,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    m: StandardMaterial,
  ) {
    const mesh = MeshBuilder.CreateCylinder(
      name,
      { diameter: r * 2, height: h, tessellation: 32 },
      scene,
    );
    mesh.position.set(x, y, z);
    mesh.material = m;
    shadows.addShadowCaster(mesh);
    return mesh;
  }
  box("carpet", 0, -0.6, 0, 35, 0.2, 25, mat("carpet", "#57435f"), false);
  box("table-shadow", 0, -0.26, 0.08, 11.65, 0.4, 7.15, ink);
  box("table-edge", 0, -0.04, 0, 11.5, 0.3, 7, beige);
  box("laminate", 0, 0.12, 0, 11.3, 0.08, 6.8, cream);
  for (const x of [-5.65, 5.65]) box("rail", x, 0.22, 0, 0.1, 0.18, 6.8, beige);
  for (const z of [-3.35, 3.35])
    box("rail", 0, 0.22, z, 11.3, 0.18, 0.1, beige);
  // Window light is part of the set, leaving the playing surface quiet.
  for (let i = 0; i < 5; i++) {
    const stripe = box(
      "window-light",
      5 + i * 0.65,
      -0.48,
      1 - i * 0.35,
      0.26,
      0.015,
      13,
      mat("sunstripe", "#b58c8a"),
      false,
    );
    stripe.rotation.y = -0.7;
  }
  const stations = DESKS.map((d) => {
    const length = Math.hypot(d.x, d.y),
      ox = (d.x / length) * 0.48,
      oz = (d.y / length) * 0.48;
    const pad = cyl("desk-pad-" + d.id, d.x, 0.18, d.y, 0.62, 0.025, beige);
    const monitor = box(
      "crt",
      d.x + ox,
      0.46,
      d.y + oz,
      0.6,
      0.51,
      0.43,
      beige,
    );
    box("crt-screen", d.x + ox, 0.47, d.y + oz - 0.225, 0.43, 0.32, 0.025, ink);
    box(
      "phosphor",
      d.x + ox,
      0.48,
      d.y + oz - 0.241,
      0.32,
      0.025,
      0.012,
      green,
      false,
    );
    box(
      "screen-line",
      d.x + ox - 0.08,
      0.4,
      d.y + oz - 0.242,
      0.16,
      0.018,
      0.012,
      green,
      false,
    );
    box("monitor-foot", d.x + ox, 0.21, d.y + oz, 0.39, 0.12, 0.33, beige);
    const chair = cyl(
      "chair",
      d.x + (d.x / length) * 1.08,
      -0.1,
      d.y + (d.y / length) * 1.08,
      0.3,
      0.18,
      [orange, teal, purple, pink][d.id % 4],
    );
    box(
      "chair-back",
      chair.position.x,
      0.13,
      chair.position.z + 0.17,
      0.52,
      0.5,
      0.11,
      [orange, teal, purple, pink][d.id % 4],
    );
    return { pad, monitor };
  });
  // A deployment slot, paperwork, and two physical mug bumpers.
  box("deploy-base", 0, 0.2, 0, 1.35, 0.16, 0.94, ink);
  box("deploy-slot", 0, 0.3, 0, 0.92, 0.06, 0.17, green);
  const deployTexture = new DynamicTexture(
    "deploy-label",
    { width: 256, height: 96 },
    scene,
    false,
  );
  deployTexture.drawText(
    "DEPLOY",
    null,
    66,
    "bold 46px monospace",
    "#a9d978",
    "#251d3a",
    true,
  );
  const dm = new StandardMaterial("deploy-label-material", scene);
  dm.diffuseTexture = deployTexture;
  dm.emissiveColor = Color3.White().scale(0.3);
  const sign = MeshBuilder.CreateGround(
    "deploy-label",
    { width: 1.1, height: 0.4 },
    scene,
  );
  sign.position.set(0, 0.291, -0.22);
  sign.material = dm;
  for (const [i, mug] of BUMPERS.entries()) {
    cyl("coffee-mug", mug.x, 0.43, mug.y, mug.r, 0.55, i ? teal : orange);
    cyl(
      "coffee",
      mug.x,
      0.711,
      mug.y,
      mug.r * 0.82,
      0.014,
      mat("coffee", "#633b31"),
    );
    const handle = MeshBuilder.CreateTorus(
      "mug-handle",
      { diameter: 0.32, thickness: 0.08, tessellation: 16 },
      scene,
    );
    handle.position.set(mug.x + 0.33, 0.43, mug.y);
    handle.rotation.x = Math.PI / 2;
    handle.material = i ? teal : orange;
    shadows.addShadowCaster(handle);
  }
  for (const [x, z, r] of [
    [-2.7, 1.15, -0.2],
    [2.6, -1.1, 0.15],
  ]) {
    const note = box(
      "sticky-note",
      x,
      0.18,
      z,
      0.37,
      0.01,
      0.32,
      mat("postit", "#e9ce6b"),
      false,
    );
    note.rotation.y = r;
  }
  // Cables are set dressing outside the playing area.
  for (let i = 0; i < 4; i++)
    MeshBuilder.CreateTube(
      "ethernet-" + i,
      {
        path: [
          new Vector3(4 + i * 0.16, -0.05, 3.5),
          new Vector3(5.5 + i * 0.2, -0.3, 4.0),
          new Vector3(6.2, -0.42, 2.3 - i * 0.35),
        ],
        radius: 0.025,
        tessellation: 8,
      },
      scene,
    ).material = i % 2 ? teal : purple;
  const plantPot = cyl("plant-pot", -6.4, -0.12, -3.1, 0.32, 0.52, orange);
  for (let i = 0; i < 5; i++) {
    const leaf = MeshBuilder.CreateSphere(
      "plant-leaf",
      { diameter: 0.5, segments: 6 },
      scene,
    );
    leaf.position.set(
      plantPot.position.x + Math.cos(i * 2) * 0.25,
      0.28 + i * 0.09,
      plantPot.position.z + Math.sin(i * 2) * 0.25,
    );
    leaf.scaling.set(0.55, 1.4, 0.65);
    leaf.rotation.z = Math.sin(i) * 0.5;
    leaf.material = green;
    shadows.addShadowCaster(leaf);
  }
  const pucks = new Map<number, { mesh: Mesh; light: Mesh }>();
  const returnGuides = new Map<number, LinesMesh>();
  let state: Snapshot | null = null;
  let desk: number | null = null;
  let aim: Point | null = null;
  let line: Mesh | null = null;
  function project() {
    const vp = camera.viewport.toGlobal(
      engine.getRenderWidth(),
      engine.getRenderHeight(),
    );
    const points = DESKS.map((d) => {
      const p = Vector3.Project(
        new Vector3(d.x, 0.25, d.y),
        Matrix.Identity(),
        scene.getTransformMatrix(),
        vp,
      );
      return {
        x: (p.x / engine.getRenderWidth()) * 100,
        y: (p.y / engine.getRenderHeight()) * 100,
      };
    });
    onProject(points);
  }
  function resize() {
    engine.resize();
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const span = Math.max(3.4, 6.6 / aspect);
    camera.orthoLeft = -span * aspect;
    camera.orthoRight = span * aspect;
    camera.orthoTop = span;
    camera.orthoBottom = -span;
    project();
  }
  const obs = new ResizeObserver(resize);
  obs.observe(canvas);
  const pick = (e: PointerEvent, fire: boolean) => {
    const bounds = canvas.getBoundingClientRect();
    const ray = scene.createPickingRay(
      ((e.clientX - bounds.left) * engine.getRenderWidth()) / bounds.width,
      ((e.clientY - bounds.top) * engine.getRenderHeight()) / bounds.height,
      Matrix.Identity(),
      camera,
    );
    const t = (0.32 - ray.origin.y) / ray.direction.y;
    const p = ray.origin.add(ray.direction.scale(t));
    aim = { x: p.x, y: p.z };
    onAim(aim, fire);
  };
  canvas.addEventListener("pointermove", (e) => pick(e, false));
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button === 0) pick(e, true);
  });
  canvas.addEventListener("pointerleave", () => {
    aim = null;
  });
  engine.runRenderLoop(() => {
    if (state) {
      for (const b of state.builds) {
        let p = pucks.get(b.id);
        if (!p) {
          const mesh = cyl("build-" + b.id, b.x, 0.37, b.y, 0.19, 0.19, orange),
            light = box(
              "build-stamp",
              b.x,
              0.475,
              b.y,
              0.15,
              0.025,
              0.13,
              cream,
              false,
            );
          p = { mesh, light };
          pucks.set(b.id, p);
        }
        const target = new Vector3(b.x, 0.37, b.y);
        p.mesh.position = Vector3.Lerp(p.mesh.position, target, 0.42);
        p.light.position.set(p.mesh.position.x, 0.475, p.mesh.position.z);
        p.mesh.material = b.stamps.length >= 3 ? green : orange;
        p.light.material = b.stamps.length >= 3 ? ink : cream;
      }
      for (const [id, p] of pucks)
        if (!state.builds.some((b) => b.id === id)) {
          p.mesh.dispose();
          p.light.dispose();
          pucks.delete(id);
        }
      stations.forEach((s, i) => {
        s.pad.material =
          i === desk
            ? teal
            : state!.players.some((p) => p.desk === i)
              ? purple
              : beige;
      });
      line?.dispose();
      line = null;
      const held =
        desk === null ? undefined : state.builds.find((b) => b.held === desk);
      if (held && aim && state.phase === "playing") {
        line = MeshBuilder.CreateDashedLines(
          "aim",
          {
            points: [
              new Vector3(held.x, 0.35, held.y),
              new Vector3(aim.x, 0.35, aim.y),
            ],
            dashSize: 0.11,
            gapSize: 0.1,
            dashNb: 35,
          },
          scene,
        );
        (line as LinesMesh).color =
          held.stamps.length >= 3
            ? Color3.FromHexString("#69a94d")
            : Color3.FromHexString("#b47746");
      }
    }
    scene.render();
  });
  resize();
  return {
    update(next: Snapshot, ownDesk: number | null) {
      state = next;
      desk = ownDesk;
      // A queued helper return remains visible while its human's desk is busy.
      const queued = next.builds.filter(
        (b) => b.held !== null && !next.players.some((p) => p.desk === b.held),
      );
      for (const [id, guide] of returnGuides) {
        if (!queued.some((b) => b.id === id)) {
          guide.dispose();
          returnGuides.delete(id);
        }
      }
      for (const b of queued) {
        if (returnGuides.has(b.id)) continue;
        const receiver =
          next.players.find((p) => p.desk === b.sender) || next.players[0];
        if (!receiver) continue;
        const destination = DESKS[receiver.desk];
        const guide = MeshBuilder.CreateDashedLines(
          "review-return-" + b.id,
          {
            points: [
              new Vector3(b.x, 0.33, b.y),
              new Vector3(destination.x, 0.33, destination.y),
            ],
            dashSize: 0.08,
            gapSize: 0.12,
            dashNb: 24,
          },
          scene,
        );
        guide.color = Color3.FromHexString("#49a89e");
        guide.alpha = 0.55;
        returnGuides.set(b.id, guide);
      }
    },
    dispose() {
      obs.disconnect();
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
  };
}
