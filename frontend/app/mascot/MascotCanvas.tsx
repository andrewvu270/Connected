"use client";

import Script from "next/script";

export default function MascotCanvas() {
  const MVScript = Script as any;

  return (
    <>
      <MVScript
        type="module"
        src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

      <model-viewer
        src="/mascots/swag.glb"
        style={{
          width: "100%",
          height: 360,
          background: "transparent",
        }}
        bounds="tight"
        camera-controls
        interaction-prompt="none"
        environment-image="neutral"
        shadow-intensity="0"
        exposure="1.15"
        field-of-view="30deg"
        camera-orbit="90deg 70deg 2.05m"
        camera-target="0m 0.75m 0m"
      />
    </>
  );
}
