import { Engine } from "@babylonjs/core/Engines/engine.js";
import { Scene } from "@babylonjs/core/scene.js";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { Vector3, Matrix } from "@babylonjs/core/Maths/math.vector.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight.js";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator.js";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent.js";
import "@babylonjs/core/Culling/ray.js";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { Effect } from "@babylonjs/core/Materials/effect.js";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess.js";
import { arcadeColour, PALETTE_FRAGMENT } from "./retro.js";
import {
  AVATAR_COLORS,
  BUMPERS,
  STATIONS,
  type Snapshot,
} from "../shared/game.js";
export type Point = { x: number; y: number };
export type Overlay = {
  stations: Point[];
  players: Record<number, Point>;
  meetings: Point[];
};
export function createOffice(
  canvas: HTMLCanvasElement,
  onMove: (point: Point) => void,
  onProject: (points: Overlay) => void,
) {
  const engine = new Engine(canvas, false, {
    preserveDrawingBuffer: true,
    stencil: true,
  });
  engine.setHardwareScalingLevel(3);
  const scene = new Scene(engine);
  scene.clearColor = Color4.FromHexString("#0b0b2bff");
  const camera = new FreeCamera(
    "office-camera",
    new Vector3(0, 14, -10),
    scene,
  );
  camera.setTarget(new Vector3(0, 0.1, 0));
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  Effect.ShadersStore["bonfire8BitFragmentShader"] = PALETTE_FRAGMENT;
  new PostProcess(
    "bonfire-16-colours",
    "bonfire8Bit",
    null,
    null,
    1,
    camera,
    Texture.NEAREST_SAMPLINGMODE,
    engine,
  );
  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.85;
  ambient.groundColor = Color3.FromHexString("#1d2b53");
  const sun = new DirectionalLight(
    "friday-sunset",
    new Vector3(-0.5, -1, 0.6),
    scene,
  );
  sun.position.set(8, 12, -7);
  sun.intensity = 0.7;
  sun.diffuse = Color3.FromHexString("#fff1e8");
  const shadows = new ShadowGenerator(512, sun);
  shadows.bias = 0.0005;
  shadows.normalBias = 0.02;
  shadows.setDarkness(0.45);
  const mats = new Map<string, StandardMaterial>();
  function material(color: string, glow = 0, alpha = 1) {
    color = arcadeColour(color);
    const key = color + glow + alpha;
    if (mats.has(key)) return mats.get(key)!;
    const m = new StandardMaterial(key, scene);
    m.diffuseColor = Color3.FromHexString(color);
    m.emissiveColor = Color3.FromHexString(color).scale(glow);
    m.specularColor = Color3.Black();
    m.alpha = alpha;
    mats.set(key, m);
    return m;
  }
  const ink = material("#0b0b2b"),
    cream = material("#fff1e8"),
    beige = material("#d9c7a3"),
    orange = material("#ff8b28"),
    green = material("#a7f070", 0.25),
    teal = material("#28c8a8"),
    coffee = material("#ab8d6f");
  function box(
    name: string,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: StandardMaterial,
    cast = true,
  ) {
    const m = MeshBuilder.CreateBox(
      name,
      { width: w, height: h, depth: d },
      scene,
    );
    m.position.set(x, y, z);
    m.material = mat;
    m.receiveShadows = true;
    if (cast) shadows.addShadowCaster(m);
    return m;
  }
  function cyl(
    name: string,
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    mat: StandardMaterial,
  ) {
    const m = MeshBuilder.CreateCylinder(
      name,
      { diameter: r * 2, height: h, tessellation: 8 },
      scene,
    );
    m.position.set(x, y, z);
    m.material = mat;
    shadows.addShadowCaster(m);
    return m;
  }
  function sphere(
    name: string,
    x: number,
    y: number,
    z: number,
    r: number,
    mat: StandardMaterial,
  ) {
    const m = MeshBuilder.CreateBox(
      name,
      { width: r * 2, height: r * 2, depth: r * 2 },
      scene,
    );
    m.position.set(x, y, z);
    m.material = mat;
    shadows.addShadowCaster(m);
    return m;
  }
  box("office-foundation", 0, -0.35, 0, 12, 0.45, 7.6, ink);
  box(
    "purple-office-carpet",
    0,
    -0.08,
    0,
    11.8,
    0.14,
    7.4,
    material("#1d2b53"),
  );
  for (let x = -5; x <= 5; x++)
    for (let z = -3; z <= 3; z++) {
      if ((x + z) % 2 === 0)
        box(
          "carpet-tile",
          x,
          0.002,
          z,
          0.98,
          0.008,
          0.98,
          material("#0b0b2b"),
          false,
        );
    }
  for (const x of [-5.85, 5.85])
    box("skirting", x, 0.13, 0, 0.12, 0.32, 7.3, beige);
  for (const z of [-3.65, 3.65])
    box("skirting", 0, 0.13, z, 11.8, 0.32, 0.12, beige);
  // Station shapes are deliberately different, so routes can be read at a glance.
  const stations = STATIONS.map((s) => {
    const m = material(s.color, 0.15),
      pad = cyl(
        "station-zone-" + s.id,
        s.x,
        0.025,
        s.y,
        1.0,
        0.025,
        material(s.color, 0.1, 0.25),
      );
    const base = box(
      "station-desk",
      s.x,
      0.44,
      s.y + 0.45,
      1.5,
      0.16,
      0.65,
      cream,
    );
    box("desk-leg", s.x - 0.53, 0.2, s.y + 0.45, 0.09, 0.5, 0.35, beige);
    box("desk-leg", s.x + 0.53, 0.2, s.y + 0.45, 0.09, 0.5, 0.35, beige);
    if (s.id === 1) {
      box("whiteboard", s.x, 0.99, s.y + 0.61, 1.3, 0.85, 0.08, cream);
      for (let i = 0; i < 4; i++)
        box(
          "requirements-note",
          s.x - 0.4 + i * 0.25,
          0.92 + (i % 2) * 0.2,
          s.y + 0.55,
          0.19,
          0.18,
          0.025,
          [orange, teal, green, m][i],
        );
    } else if (s.id === 2) {
      for (let i = 0; i < 3; i++)
        cyl(
          "refinement-chair",
          s.x - 0.5 + i * 0.5,
          0.3,
          s.y + 0.05,
          0.19,
          0.3,
          m,
        );
      box("meeting-paper", s.x, 0.55, s.y + 0.4, 0.6, 0.03, 0.3, beige);
    } else if (s.id === 3) {
      for (let i = 0; i < 3; i++) {
        box(
          "build-rack",
          s.x - 0.45 + i * 0.45,
          0.82,
          s.y + 0.45,
          0.36,
          0.65,
          0.4,
          ink,
        );
        for (let j = 0; j < 3; j++)
          box(
            "build-led",
            s.x - 0.45 + i * 0.45,
            0.6 + j * 0.16,
            s.y + 0.235,
            0.23,
            0.03,
            0.02,
            green,
            false,
          );
      }
    } else {
      box("crt", s.x, 0.82, s.y + 0.44, 0.62, 0.58, 0.45, beige);
      box("crt-screen", s.x, 0.84, s.y + 0.2, 0.46, 0.36, 0.02, ink);
      box("crt-phosphor", s.x, 0.85, s.y + 0.184, 0.31, 0.035, 0.015, m, false);
      if (s.id === 0)
        for (let i = 0; i < 4; i++)
          box(
            "ticket-stack",
            s.x - 0.55,
            0.55 + i * 0.04,
            s.y + 0.37,
            0.32,
            0.03,
            0.35,
            i % 2 ? cream : m,
          );
    }
    const marker = MeshBuilder.CreateTorus(
      "station-ring",
      { diameter: 1.75, thickness: 0.055, tessellation: 8 },
      scene,
    );
    marker.position.set(s.x, 0.05, s.y);
    marker.material = m;
    const signTexture = new DynamicTexture(
      "sign-" + s.id,
      { width: 128, height: 32 },
      scene,
      false,
      Texture.NEAREST_SAMPLINGMODE,
    );
    signTexture.drawText(
      s.label.toUpperCase(),
      null,
      21,
      '8px "Press Start 2P"',
      s.color,
      "#0b0b2b",
      true,
    );
    const sm = new StandardMaterial("sign-material-" + s.id, scene);
    sm.diffuseTexture = signTexture;
    sm.emissiveColor = Color3.White().scale(0.4);
    const sign = MeshBuilder.CreateGround(
      "floor-sign",
      { width: 1.65, height: 0.4 },
      scene,
    );
    sign.position.set(s.x, 0.04, s.y - 0.68);
    sign.material = sm;
    return { pad, base, marker };
  });
  for (const [i, mug] of BUMPERS.entries()) {
    cyl("giant-office-mug", mug.x, 0.32, mug.y, mug.r, 0.62, i ? teal : orange);
    cyl("coffee", mug.x, 0.635, mug.y, mug.r * 0.8, 0.012, coffee);
    const handle = MeshBuilder.CreateTorus(
      "coffee-handle",
      { diameter: 0.4, thickness: 0.09, tessellation: 8 },
      scene,
    );
    handle.position.set(mug.x + 0.42, 0.34, mug.y);
    handle.rotation.x = Math.PI / 2;
    handle.material = i ? teal : orange;
  }
  // Centre aisle and a wonky motivational floor decal.
  const ft = new DynamicTexture(
    "fika-decal",
    { width: 128, height: 32 },
    scene,
    false,
    Texture.NEAREST_SAMPLINGMODE,
  );
  ft.drawText(
    "SHIP HAPPENS.",
    null,
    21,
    '8px "Press Start 2P"',
    "#5b6c8f",
    "#1d2b53",
    true,
  );
  const fm = new StandardMaterial("decal", scene);
  fm.diffuseTexture = ft;
  const decal = MeshBuilder.CreateGround(
    "floor-decal",
    { width: 3.6, height: 1.2 },
    scene,
  );
  decal.position.set(0, 0.012, 0);
  decal.material = fm;
  const pointer = MeshBuilder.CreateCylinder(
    "next-station-arrow",
    { diameterTop: 0.44, diameterBottom: 0, height: 0.4, tessellation: 3 },
    scene,
  );
  pointer.material = green;
  type Actor = {
    root: TransformNode;
    arms: TransformNode[];
    legs: TransformNode[];
    last: Vector3;
    phase: number;
  };
  const actors = new Map<number, Actor>();
  function actor(slot: number) {
    const root = new TransformNode("runner-" + slot, scene);
    const shirt = material(AVATAR_COLORS[slot]),
      skin = material(["#e9b48d", "#a66d50", "#f1c7a0", "#bd8867"][slot % 4]);
    const parent = (mesh: Mesh) => {
      mesh.parent = root;
      return mesh;
    };
    parent(box("body", 0, 0.62, 0, 0.38, 0.45, 0.28, shirt));
    parent(sphere("head", 0, 1.02, 0, 0.22, skin));
    parent(box("hair", 0, 1.16, 0.02, 0.38, 0.12, 0.33, ink));
    parent(box("eye-l", -0.075, 1.04, -0.206, 0.04, 0.045, 0.02, ink, false));
    parent(box("eye-r", 0.075, 1.04, -0.206, 0.04, 0.045, 0.02, ink, false));
    parent(box("lanyard", 0, 0.66, -0.153, 0.08, 0.2, 0.018, cream, false));
    const arms = [-1, 1].map((sign) => {
      const joint = new TransformNode("arm", scene);
      joint.parent = root;
      joint.position.set(sign * 0.26, 0.8, 0);
      const limb = box("sleeve", 0, -0.17, 0, 0.14, 0.36, 0.16, shirt);
      limb.parent = joint;
      return joint;
    });
    const legs = [-1, 1].map((sign) => {
      const joint = new TransformNode("leg", scene);
      joint.parent = root;
      joint.position.set(sign * 0.12, 0.43, 0);
      const leg = box(
        "jeans",
        0,
        -0.17,
        0,
        0.15,
        0.36,
        0.18,
        material("#29adff"),
      );
      leg.parent = joint;
      const shoe = box("sneaker", 0, -0.34, -0.05, 0.18, 0.1, 0.28, cream);
      shoe.parent = joint;
      return joint;
    });
    return { root, arms, legs, last: new Vector3(), phase: Math.random() * 6 };
  }
  const parcels = new Map<number, Mesh>();
  const meetings = new Map<number, { root: TransformNode; ring: Mesh }>();
  type Particle = {
    mesh: Mesh;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    max: number;
  };
  const particles: Particle[] = [];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function burst(x: number, z: number, count: number, color: string) {
    if (reduced) return;
    for (let i = 0; i < count && particles.length < 250; i++) {
      const m = box(
        "confetti",
        x,
        0.6,
        z,
        0.07 + Math.random() * 0.05,
        0.05,
        0.08,
        material(i % 3 === 0 ? "#fff1e8" : color, 0.3),
        false,
      );
      particles.push({
        mesh: m,
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        vz: (Math.random() - 0.5) * 4,
        life: 0.65 + Math.random() * 0.7,
        max: 1.4,
      });
    }
  }
  let state: Snapshot | null = null,
    own: number | null = null,
    lastEvent = 0,
    time = 0,
    projectionClock = 0,
    lastStep = 0;
  function project(p: Vector3) {
    const vp = camera.viewport.toGlobal(
      engine.getRenderWidth(),
      engine.getRenderHeight(),
    );
    const v = Vector3.Project(
      p,
      Matrix.Identity(),
      scene.getTransformMatrix(),
      vp,
    );
    return {
      x: (v.x / engine.getRenderWidth()) * 100,
      y: (v.y / engine.getRenderHeight()) * 100,
    };
  }
  function overlays() {
    if (!state) return;
    const players: Record<number, Point> = {};
    for (const p of state.players) {
      const a = actors.get(p.desk);
      players[p.desk] = project(
        new Vector3(a?.root.position.x ?? p.x, 1.65, a?.root.position.z ?? p.y),
      );
    }
    onProject({
      stations: STATIONS.map((s) => project(new Vector3(s.x, 0.1, s.y))),
      players,
      meetings: state.hazards.map((h) => project(new Vector3(h.x, 1.9, h.y))),
    });
  }
  function resize() {
    // Integer enlargement produces stable, visible pixels on desktop and phones.
    engine.setHardwareScalingLevel(
      Math.max(2, Math.ceil(canvas.clientWidth / 384)),
    );
    engine.resize();
    const ratio = canvas.clientWidth / canvas.clientHeight,
      span = Math.max(3.65, 6.75 / ratio);
    camera.orthoLeft = -span * ratio;
    camera.orthoRight = span * ratio;
    camera.orthoTop = span;
    camera.orthoBottom = -span;
    overlays();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const click = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const r = canvas.getBoundingClientRect();
    const ray = scene.createPickingRay(
      e.clientX - r.left,
      e.clientY - r.top,
      Matrix.Identity(),
      camera,
    );
    const p = ray.origin.add(
      ray.direction.scale(-ray.origin.y / ray.direction.y),
    );
    onMove({ x: p.x, y: p.z });
  };
  canvas.addEventListener("pointerdown", click);
  engine.runRenderLoop(() => {
    const dt = Math.min(0.05, engine.getDeltaTime() / 1000);
    time += dt;
    if (state) {
      for (const p of state.players) {
        let a = actors.get(p.desk);
        if (!a) {
          a = actor(p.desk);
          a.root.position.set(p.x, 0, p.y);
          a.last.copyFrom(a.root.position);
          actors.set(p.desk, a);
        }
        const old = a.root.position.clone();
        a.root.position = Vector3.Lerp(
          a.root.position,
          new Vector3(p.x, 0, p.y),
          0.45,
        );
        const moving = Vector3.Distance(old, a.root.position) > 0.002;
        const speed = p.sprinting ? 18 : 12;
        a.phase += dt * speed;
        const pose = reduced
          ? a.phase
          : (Math.floor((a.phase / speed) * 12) / 12) * speed;
        a.root.position.y =
          moving && !reduced
            ? Math.abs(Math.sin(pose)) * 0.07
            : Math.sin(time * 2 + p.desk) * 0.013;
        a.root.rotation.y = Math.atan2(-p.facingX, -p.facingY);
        a.root.rotation.z = p.stun > 0 ? Math.sin(time * 22) * 0.12 : 0;
        const carried = state.builds.some((b) => b.held === p.desk);
        a.legs.forEach(
          (leg, i) =>
            (leg.rotation.x = moving ? Math.sin(pose + i * Math.PI) * 0.7 : 0),
        );
        a.arms.forEach(
          (arm, i) =>
            (arm.rotation.x = carried
              ? -1.25
              : moving
                ? -Math.sin(pose + i * Math.PI) * 0.7
                : Math.sin(time * 2 + i) * 0.05),
        );
        if (moving && !reduced && time - lastStep > 0.12) {
          lastStep = time;
          burst(p.x, p.y, 1, "#5b6c8f");
        }
      }
      for (const [slot, a] of actors)
        if (!state.players.some((p) => p.desk === slot)) {
          a.root.dispose(false, false);
          actors.delete(slot);
        }
      for (const b of state.builds) {
        let m = parcels.get(b.id);
        if (!m) {
          m = box("ticket-" + b.id, b.x, 0.3, b.y, 0.32, 0.08, 0.4, orange);
          parcels.set(b.id, m);
        }
        const holder = state.players.find((p) => p.desk === b.held),
          a = holder ? actors.get(holder.desk) : null;
        const pos = a
          ? new Vector3(
              a.root.position.x + holder!.facingX * 0.35,
              0.85,
              a.root.position.z + holder!.facingY * 0.35,
            )
          : new Vector3(
              b.x,
              0.18 + Math.abs(Math.sin(time * 3 + b.id)) * 0.05,
              b.y,
            );
        m.position = Vector3.Lerp(m.position, pos, 0.5);
        m.rotation.y = time * (b.held === null ? 1.1 : 0.15);
        m.rotation.z = Math.sin(time * 7 + b.id) * 0.08;
        m.material = b.route[b.stamps.length] === 5 ? green : orange;
      }
      for (const [id, m] of parcels)
        if (!state.builds.some((b) => b.id === id)) {
          m.dispose();
          parcels.delete(id);
        }
      for (const h of state.hazards) {
        let m = meetings.get(h.id);
        if (!m) {
          const root = new TransformNode("meeting-" + h.id, scene);
          const ring = cyl(
            "meeting-zone",
            0,
            0.04,
            0,
            h.r,
            0.04,
            material("#ff77a8", 0.2, 0.24),
          );
          ring.parent = root;
          for (let i = 0; i < 3; i++) {
            const x = Math.cos((i * Math.PI * 2) / 3) * 0.39,
              z = Math.sin((i * Math.PI * 2) / 3) * 0.39;
            const body = cyl(
              "meeting-npc",
              x,
              0.42,
              z,
              0.15,
              0.48,
              material("#a94faa"),
            );
            body.parent = root;
            const head = sphere("meeting-head", x, 0.83, z, 0.18, beige);
            head.parent = root;
          }
          m = { root, ring };
          root.position.set(h.x, 0, h.y);
          meetings.set(h.id, m);
        }
        m.root.position = Vector3.Lerp(
          m.root.position,
          new Vector3(h.x, 0, h.y),
          0.25,
        );
        m.root.rotation.y = time * 0.4;
        m.ring.scaling.x = m.ring.scaling.z = 1 + Math.sin(time * 5) * 0.07;
      }
      for (const [id, m] of meetings)
        if (!state.hazards.some((h) => h.id === id)) {
          m.root.dispose(false, false);
          meetings.delete(id);
        }
      const ownTicket =
        own === null ? undefined : state.builds.find((b) => b.held === own);
      const next = ownTicket ? ownTicket.route[ownTicket.stamps.length] : 0;
      const destination = STATIONS[next];
      pointer.setEnabled(state.phase === "playing" && own !== null);
      if (destination) {
        pointer.position.set(
          destination.x,
          1.65 + Math.sin(time * 5) * 0.16,
          destination.y - 0.13,
        );
        pointer.rotation.y = time * 2;
      }
      stations.forEach((s, i) => {
        const pulse = 1 + Math.sin(time * 5 + i) * 0.035;
        s.marker.scaling.x = s.marker.scaling.z = pulse;
        s.base.position.y =
          0.44 + (i === next ? Math.sin(time * 4) * 0.022 : 0);
      });
      if (state.phase === "finished")
        for (const a of actors.values()) {
          a.root.position.y = Math.abs(Math.sin(time * 5 + a.phase)) * 0.25;
          a.arms.forEach((arm, i) => (arm.rotation.z = (i ? 1 : -1) * 2.4));
        }
      projectionClock += dt;
      if (projectionClock > 0.08) {
        projectionClock = 0;
        overlays();
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.mesh.dispose();
        particles.splice(i, 1);
        continue;
      }
      p.vy -= dt * 8;
      p.mesh.position.addInPlace(new Vector3(p.vx * dt, p.vy * dt, p.vz * dt));
      p.mesh.rotation.x += dt * 5;
      p.mesh.rotation.z += dt * 3;
      const scale = Math.min(1, p.life * 3);
      p.mesh.scaling.setAll(scale);
    }
    scene.render();
  });
  resize();
  return {
    update(next: Snapshot, slot: number | null) {
      state = next;
      own = slot;
      if (lastEvent === 0) {
        lastEvent = next.events.at(-1)?.id || 0;
        return;
      }
      for (const event of next.events) {
        if (event.id <= lastEvent) continue;
        if (event.x !== undefined && event.y !== undefined) {
          if (event.kind === "ship") burst(event.x, event.y, 65, "#a7f070");
          else if (event.kind === "stamp")
            burst(event.x, event.y, 24, "#ffec27");
          else if (event.kind === "meeting")
            burst(event.x, event.y, 16, "#ff77a8");
        }
      }
      lastEvent = next.events.at(-1)?.id || lastEvent;
    },
    dispose() {
      observer.disconnect();
      canvas.removeEventListener("pointerdown", click);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
  };
}
