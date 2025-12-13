"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type MascotVariant = "kid" | "creature";

export default function MascotCanvas({ variant }: { variant: MascotVariant }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f7fb);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0.6, 2.6);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(2, 3, 4);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.4);
    fill.position.set(-2, 1, 2);
    scene.add(fill);

    const mascotGroup = new THREE.Group();
    scene.add(mascotGroup);

    const disposable: Array<{ dispose: () => void }> = [];

    const makeMat = (opts: THREE.MeshStandardMaterialParameters) => {
      const m = new THREE.MeshStandardMaterial(opts);
      disposable.push(m);
      return m;
    };

    const makeGeo = <T extends THREE.BufferGeometry>(g: T) => {
      disposable.push(g);
      return g;
    };

    const addMesh = (g: THREE.BufferGeometry, m: THREE.Material, p: THREE.Vector3, r?: THREE.Euler) => {
      const mesh = new THREE.Mesh(g, m);
      mesh.position.copy(p);
      if (r) mesh.rotation.copy(r);
      mascotGroup.add(mesh);
      return mesh;
    };

    const addEye = (x: number, y: number, z: number, irisColor: number) => {
      const scleraGeo = makeGeo(new THREE.SphereGeometry(0.14, 32, 32));
      const scleraMat = makeMat({ color: 0xf5f0ea, roughness: 0.55, metalness: 0.02 });
      addMesh(scleraGeo, scleraMat, new THREE.Vector3(x, y, z));

      const irisGeo = makeGeo(new THREE.CircleGeometry(0.085, 48));
      const irisMat = makeMat({ color: irisColor, roughness: 0.35, metalness: 0.05 });
      addMesh(irisGeo, irisMat, new THREE.Vector3(x, y, z + 0.13));

      const pupilGeo = makeGeo(new THREE.CircleGeometry(0.04, 48));
      const pupilMat = makeMat({ color: 0x111827, roughness: 0.35, metalness: 0.05 });
      addMesh(pupilGeo, pupilMat, new THREE.Vector3(x, y, z + 0.131));

      const shineGeo = makeGeo(new THREE.SphereGeometry(0.018, 16, 16));
      const shineMat = makeMat({ color: 0xffffff, roughness: 0.15, metalness: 0.05 });
      addMesh(shineGeo, shineMat, new THREE.Vector3(x - 0.05, y + 0.05, z + 0.145));
    };

    const buildShared = (skinColor: number, hoodieColor: number, pantsColor: number) => {
      const skinMat = makeMat({ color: skinColor, roughness: 0.55, metalness: 0.02 });
      const hairMat = makeMat({ color: 0x4a2a21, roughness: 0.32, metalness: 0.05 });
      const hoodieMat = makeMat({ color: hoodieColor, roughness: 0.75, metalness: 0.02 });
      const pantsMat = makeMat({ color: pantsColor, roughness: 0.75, metalness: 0.02 });
      const shoeMat = makeMat({ color: 0xf1f5f9, roughness: 0.65, metalness: 0.02 });
      const backpackMat = makeMat({ color: 0x9ca3af, roughness: 0.7, metalness: 0.03 });
      const strapMat = makeMat({ color: 0x6b7280, roughness: 0.75, metalness: 0.03 });
      const glassesMat = makeMat({ color: 0x2f2a2a, roughness: 0.3, metalness: 0.1 });

      const headGeo = makeGeo(new THREE.SphereGeometry(0.62, 48, 48));
      addMesh(headGeo, skinMat, new THREE.Vector3(0, 0.65, 0));

      const earGeo = makeGeo(new THREE.SphereGeometry(0.11, 24, 24));
      addMesh(earGeo, skinMat, new THREE.Vector3(-0.62, 0.63, 0.02));
      addMesh(earGeo, skinMat, new THREE.Vector3(0.62, 0.63, 0.02));

      const bodyGeo = makeGeo(new THREE.CapsuleGeometry(0.26, 0.34, 12, 24));
      addMesh(bodyGeo, hoodieMat, new THREE.Vector3(0, 0.1, 0));

      const hoodGeo = makeGeo(new THREE.TorusGeometry(0.26, 0.08, 16, 64));
      addMesh(hoodGeo, hoodieMat, new THREE.Vector3(0, 0.32, 0.03), new THREE.Euler(Math.PI / 2.1, 0, 0));

      const legGeo = makeGeo(new THREE.CapsuleGeometry(0.12, 0.26, 8, 16));
      addMesh(legGeo, pantsMat, new THREE.Vector3(-0.14, -0.35, 0.02), new THREE.Euler(0.05, 0, 0.05));
      addMesh(legGeo, pantsMat, new THREE.Vector3(0.14, -0.35, 0.02), new THREE.Euler(-0.05, 0, -0.05));

      const shoeGeo = makeGeo(new THREE.CapsuleGeometry(0.14, 0.14, 8, 16));
      addMesh(shoeGeo, shoeMat, new THREE.Vector3(-0.14, -0.62, 0.08), new THREE.Euler(Math.PI / 2, 0, 0));
      addMesh(shoeGeo, shoeMat, new THREE.Vector3(0.14, -0.62, 0.08), new THREE.Euler(Math.PI / 2, 0, 0));

      const armGeo = makeGeo(new THREE.CapsuleGeometry(0.11, 0.28, 8, 16));
      addMesh(armGeo, hoodieMat, new THREE.Vector3(-0.42, 0.18, 0.03), new THREE.Euler(0.2, 0, 0.5));
      addMesh(armGeo, hoodieMat, new THREE.Vector3(0.42, 0.18, 0.03), new THREE.Euler(0.2, 0, -0.5));

      const handGeo = makeGeo(new THREE.SphereGeometry(0.09, 24, 24));
      addMesh(handGeo, skinMat, new THREE.Vector3(-0.56, 0.0, 0.14));
      addMesh(handGeo, skinMat, new THREE.Vector3(0.56, 0.0, 0.14));

      const backpackGeo = makeGeo(new THREE.CapsuleGeometry(0.22, 0.22, 8, 20));
      addMesh(backpackGeo, backpackMat, new THREE.Vector3(0, 0.18, -0.28), new THREE.Euler(0, 0, 0));

      const strapGeo = makeGeo(new THREE.CapsuleGeometry(0.06, 0.28, 8, 16));
      addMesh(strapGeo, strapMat, new THREE.Vector3(-0.22, 0.22, -0.07), new THREE.Euler(0.2, 0, 0.45));
      addMesh(strapGeo, strapMat, new THREE.Vector3(0.22, 0.22, -0.07), new THREE.Euler(0.2, 0, -0.45));

      const ringGeo = makeGeo(new THREE.TorusGeometry(0.19, 0.03, 16, 64));
      addMesh(ringGeo, glassesMat, new THREE.Vector3(-0.22, 0.68, 0.52));
      addMesh(ringGeo, glassesMat, new THREE.Vector3(0.22, 0.68, 0.52));
      const bridgeGeo = makeGeo(new THREE.CapsuleGeometry(0.015, 0.14, 6, 12));
      addMesh(bridgeGeo, glassesMat, new THREE.Vector3(0, 0.68, 0.52), new THREE.Euler(0, 0, Math.PI / 2));

      addEye(-0.22, 0.68, 0.42, 0x5b3827);
      addEye(0.22, 0.68, 0.42, 0x5b3827);

      const mouthGeo = makeGeo(new THREE.TorusGeometry(0.09, 0.015, 16, 64, Math.PI));
      const mouthMat = makeMat({ color: 0x111827, roughness: 0.5, metalness: 0 });
      addMesh(mouthGeo, mouthMat, new THREE.Vector3(0, 0.5, 0.56), new THREE.Euler(Math.PI, 0, 0));

      return { skinMat, hairMat };
    };

    if (variant === "kid") {
      const { hairMat } = buildShared(0xf2c9b0, 0x1f9a90, 0x1f9a90);
      const hairBaseGeo = makeGeo(new THREE.SphereGeometry(0.62, 48, 48));
      const hairBase = addMesh(hairBaseGeo, hairMat, new THREE.Vector3(0, 0.74, -0.01));
      hairBase.scale.set(1.02, 0.72, 1.02);

      const bunGeo = makeGeo(new THREE.SphereGeometry(0.12, 24, 24));
      const bun1 = addMesh(bunGeo, hairMat, new THREE.Vector3(-0.06, 1.05, 0.02));
      const bun2 = addMesh(bunGeo, hairMat, new THREE.Vector3(0.06, 1.05, 0.02));
      bun1.scale.set(1.0, 1.0, 1.0);
      bun2.scale.set(1.0, 1.0, 1.0);

      const tieGeo = makeGeo(new THREE.TorusGeometry(0.09, 0.03, 12, 32));
      const tieMat = makeMat({ color: 0x2aa198, roughness: 0.5, metalness: 0.05 });
      addMesh(tieGeo, tieMat, new THREE.Vector3(0, 1.0, 0.03), new THREE.Euler(Math.PI / 2, 0, 0));
    }

    if (variant === "creature") {
      const { hairMat, skinMat } = buildShared(0xe9d9ff, 0x5865f2, 0x111827);

      const crestGeo = makeGeo(new THREE.SphereGeometry(0.2, 24, 24));
      const crestMat = makeMat({ color: 0x7c3aed, roughness: 0.35, metalness: 0.05 });
      const crest = addMesh(crestGeo, crestMat, new THREE.Vector3(0, 1.08, 0.02));
      crest.scale.set(1.4, 0.7, 1.2);

      const hornGeo = makeGeo(new THREE.ConeGeometry(0.12, 0.26, 24));
      addMesh(hornGeo, hairMat, new THREE.Vector3(-0.32, 1.08, -0.05), new THREE.Euler(-0.3, 0, 0.25));
      addMesh(hornGeo, hairMat, new THREE.Vector3(0.32, 1.08, -0.05), new THREE.Euler(-0.3, 0, -0.25));

      const earGeo = makeGeo(new THREE.SphereGeometry(0.14, 24, 24));
      const earL = addMesh(earGeo, skinMat, new THREE.Vector3(-0.7, 0.7, -0.02));
      const earR = addMesh(earGeo, skinMat, new THREE.Vector3(0.7, 0.7, -0.02));
      earL.scale.set(0.6, 1.4, 0.6);
      earR.scale.set(0.6, 1.4, 0.6);
    }

    const shadowGeo = new THREE.CircleGeometry(0.7, 64);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.08 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.75;
    scene.add(shadow);

    const resize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    resize();

    const ro = new ResizeObserver(() => resize());
    ro.observe(container);

    let raf = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      const t = clock.getElapsedTime();
      mascotGroup.rotation.y = t * 0.5;
      mascotGroup.position.y = Math.sin(t * 1.6) * 0.05;
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    raf = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      for (const d of disposable) {
        d.dispose();
      }
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, [variant]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: 320,
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.12)",
        overflow: "hidden"
      }}
    />
  );
}
