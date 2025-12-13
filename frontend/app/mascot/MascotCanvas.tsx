"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function MascotCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f7fb);

    const fog = new THREE.Fog(0xf7f7fb, 2.8, 6.5);
    scene.fog = fog;

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0.0, 0.85, 2.85);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 1.8;
    controls.maxDistance = 4.5;
    controls.target.set(0, 0.55, 0);
    controls.update();

    const hemi = new THREE.HemisphereLight(0xffffff, 0x9aa6ff, 0.75);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.15);
    key.position.set(2.2, 3.4, 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.1;
    key.shadow.camera.far = 10;
    key.shadow.camera.left = -2.2;
    key.shadow.camera.right = 2.2;
    key.shadow.camera.top = 2.2;
    key.shadow.camera.bottom = -2.2;
    key.shadow.bias = -0.00015;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xc7d2fe, 0.55);
    rim.position.set(-2.6, 2.0, -2.6);
    scene.add(rim);

    const mascotGroup = new THREE.Group();
    scene.add(mascotGroup);

    const disposable: Array<{ dispose: () => void }> = [];

    const disposeObject = (obj: THREE.Object3D) => {
      obj.traverse((child) => {
        const mesh = child as unknown as THREE.Mesh;
        const maybeGeo = (mesh as any).geometry as THREE.BufferGeometry | undefined;
        if (maybeGeo?.dispose) maybeGeo.dispose();

        const maybeMat = (mesh as any).material as THREE.Material | THREE.Material[] | undefined;
        const mats = Array.isArray(maybeMat) ? maybeMat : maybeMat ? [maybeMat] : [];
        for (const m of mats) {
          const matAny = m as any;
          for (const k of Object.keys(matAny)) {
            const v = matAny[k];
            if (v && typeof v === "object" && typeof v.dispose === "function") {
              v.dispose();
            }
          }
          if (m.dispose) m.dispose();
        }
      });
    };

    const loadSwagGlb = () => {
      const loader = new GLTFLoader();
      loader.load(
        "/mascots/swag.glb",
        (gltf) => {
          if (cancelled) return;

          const obj = gltf.scene;

          const box = new THREE.Box3().setFromObject(obj);
          const size = new THREE.Vector3();
          box.getSize(size);
          const center = new THREE.Vector3();
          box.getCenter(center);

          obj.position.sub(center);
          const box2 = new THREE.Box3().setFromObject(obj);
          obj.position.y -= box2.min.y;

          const targetHeight = 1.85;
          const scale = size.y > 0 ? targetHeight / size.y : 1;
          obj.scale.setScalar(scale);
          obj.position.y *= scale;

          obj.traverse((c) => {
            const m = c as unknown as THREE.Mesh;
            if ((m as any).isMesh) {
              (m as any).castShadow = true;
              (m as any).receiveShadow = true;
            }
          });

          mascotGroup.add(obj);
          disposable.push({ dispose: () => disposeObject(obj) });
        },
        undefined,
        () => {
          return;
        }
      );
    };

    loadSwagGlb();

    const groundGeo = new THREE.CircleGeometry(1.15, 96);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.98, metalness: 0 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.78;
    ground.receiveShadow = true;
    scene.add(ground);

    disposable.push(groundGeo);
    disposable.push(groundMat);

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
      clock.getDelta();
      const t = clock.elapsedTime;
      mascotGroup.rotation.y = Math.sin(t * 0.35) * 0.32;
      mascotGroup.rotation.x = Math.sin(t * 0.55) * 0.03;
      mascotGroup.position.y = Math.sin(t * 1.25) * 0.04;
      controls.update();
      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    raf = window.requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      fog && (scene.fog = null);
      shadowGeo.dispose();
      shadowMat.dispose();
      for (const d of disposable) {
        d.dispose();
      }
      mascotGroup.clear();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

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
