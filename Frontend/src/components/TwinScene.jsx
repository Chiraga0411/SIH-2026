import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/* ---------------------------------------------------------------
   The plant digital twin. Wireframe refinery blocks on a grid,
   slow auto-rotate, gentle parallax on pointer move, one amber
   hotspot marking the asset the agent is currently working on.
--------------------------------------------------------------- */

const CYAN = 0x45d8ff, BLUE = 0x3e7bef, AMBER = 0xff9a4d;

export default function TwinScene({ hotspotLabel = "P-101" }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = document.createElement("canvas");
    canvas.className = "block w-full h-full";
    host.appendChild(canvas);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x081326, 0.026);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120);
    camera.position.set(13, 10.5, 13);
    camera.lookAt(0, 1, 0);

    const group = new THREE.Group();
    scene.add(group);

    const grid = new THREE.GridHelper(32, 32, 0x1e6e8c, 0x102436);
    grid.material.transparent = true;
    grid.material.opacity = 0.42;
    group.add(grid);

    const shell = (geo, color, x, y, z) => {
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x0b2036, transparent: true, opacity: 0.55 }));
      mesh.position.set(x, y, z);
      mesh.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
      ));
      group.add(mesh);
      return mesh;
    };

    const box = (x, z, w, h, d, c) => shell(new THREE.BoxGeometry(w, h, d), c, x, h / 2, z);
    const cyl = (x, z, r, h, c) => shell(new THREE.CylinderGeometry(r, r, h, 16), c, x, h / 2, z);

    box(-3.2, -1.5, 3.2, 2.6, 2.2, CYAN);
    box(0.2, -2.2, 2.4, 3.6, 2.4, CYAN);
    box(3.4, -0.6, 2.8, 1.8, 2.6, BLUE);
    box(-1.2, 2.6, 4.4, 1.2, 2.0, BLUE);
    cyl(4.6, 2.6, 0.9, 2.4, AMBER);
    cyl(6.4, 2.6, 0.9, 1.8, AMBER);

    const pipe = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(4.6, 2.4, 2.6),
        new THREE.Vector3(4.6, 2.4, 0.4),
        new THREE.Vector3(3.4, 1.9, -0.2),
      ]),
      new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.85 })
    );
    group.add(pipe);

    // radial glow sprite marking the active asset
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,154,77,1)");
    g.addColorStop(0.35, "rgba(255,154,77,0.5)");
    g.addColorStop(1, "rgba(255,154,77,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);

    const hotspot = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false,
    }));
    hotspot.position.set(3.4, 2.1, -0.6);
    group.add(hotspot);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    let drift = 0;
    const onMove = e => { drift = e.clientX / window.innerWidth - 0.5; };
    window.addEventListener("mousemove", onMove);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    let raf;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();
      group.rotation.y = (reduced ? 0.4 : t * 0.06) + drift * 0.3;
      const s = 0.9 + Math.sin(t * 2.4) * 0.18;
      hotspot.scale.set(s, s, s);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      renderer.dispose();
      host.removeChild(canvas);
    };
  }, []);

  return (
    <div className="absolute inset-0">
      <div ref={hostRef} className="absolute inset-0" />
      <div
        className="absolute left-1/2 bottom-[8%] w-[820px] h-[200px] -translate-x-1/2 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(69,216,255,.15), rgba(69,216,255,0) 70%)" }}
      />
      <div className="absolute left-1/2 top-[38%] -translate-x-1/2 text-[10px] text-hud-amber tracking-widest pointer-events-none">
        {hotspotLabel}
      </div>
    </div>
  );
}
