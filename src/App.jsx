import * as THREE from "three";
import React, { useEffect, useRef, useState } from "react";
import { extend, Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Plane, shaderMaterial } from "@react-three/drei";
import { useControls } from "leva";

const FooMaterial = new shaderMaterial(
  {
    uTime: 0.0,
    uAspect: 1.0,
    uMouse: new THREE.Vector2(0, 0),
    uUvXScale: 1.0,
    uUvYScale: 1.0,
    uNoise1Scale: 8.0,
    uNoise2Scale: 8.0,
    uGNoiseOffset: 0.0,
    uColor1: new THREE.Color(),
    uColor2: new THREE.Color(),
    uColor3: new THREE.Color(),
    uColor4: new THREE.Color(),
    uColorStop1: 0.25,
    uColorStop2: 0.5,
    uColorStop3: 0.75,
    uColorStop4: 1.0,
    uHueShift: 0.0,
    uVignette: false,
    uVignetteSize: 0.1,
  },
  // vertex shader ⚡
  resolveLygia(`
		uniform float uAspect;
    varying vec2 vUv;
		
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `),
  // fragment shader ⚡
  resolveLygia(`
		uniform float uAspect;
    uniform float uTime;
		uniform vec2 uMouse;
		uniform float uUvXScale;
		uniform float uUvYScale;
		uniform float uNoise1Scale;
		uniform float uNoise2Scale;
		uniform float uGNoiseOffset;
		uniform vec3 uColor1;
		uniform vec3 uColor2;
		uniform vec3 uColor3;
		uniform vec3 uColor4;
		uniform float uColorStop1;
		uniform float uColorStop2;
		uniform float uColorStop3;
		uniform float uColorStop4;
		uniform float uHueShift;
		uniform bool uVignette;
		uniform float uVignetteSize;
    varying vec2 vUv;

		// https://stackoverflow.com/a/37426532
		float insideRectSmooth(vec2 p, vec2 bottom_left, vec2 top_right, float transition_area) {
    	vec2 s = smoothstep(bottom_left, bottom_left + vec2(transition_area), p) - smoothstep(top_right - vec2(transition_area), top_right, p);
    	return(s.x * s.y);
		}

		vec3 getGradient(vec4 c1, vec4 c2, vec4 c3, vec4 c4, float value_) {
			float blend1 = smoothstep(c1.w, c2.w, value_);
			float blend2 = smoothstep(c2.w, c3.w, value_);
			float blend3 = smoothstep(c3.w, c4.w, value_);

			vec3 
			col = mix(c1.rgb, c2.rgb, blend1);
			col = mix(col, c3.rgb, blend2);
			col = mix(col, c4.rgb, blend3);

			return col;
		}

    #include "lygia/generative/cnoise.glsl"
    #include "lygia/generative/gnoise.glsl"
    #include "lygia/generative/random.glsl"
    #include "lygia/color/hueShift.glsl"

    void main() {
			// square uv for grid (prevents squishing)
			vec2 squareUv = vUv;
			// squareUv.x += uMouse.x * 0.2;
			// squareUv.y -= uMouse.y * 0.2;
			squareUv.y /= uAspect;
			squareUv.y += (1.0 - uAspect) * 0.5;

			// creative stretching
			vec2 stretchedUv = vUv;
			stretchedUv.y *= uUvXScale;
			stretchedUv.x *= uUvYScale;

			float timeMult = uTime + uMouse.x * 2.0;

			// cnoise, grid, grain
			// float n1 = cnoise(vec3(stretchedUv * uNoise1Scale, uTime * 0.125)) * 4.0;
			// float n2 = n1 * gnoise(vec3(squareUv * uNoise2Scale, uGNoiseOffset), 1.0) * 4.0;
			float n1 = cnoise(vec3(stretchedUv * uNoise1Scale, uMouse.x)) * 4.0;
			float n2 = n1 * gnoise(vec3(squareUv * uNoise2Scale, uMouse.y), 1.0) * 4.0;
			n2 *= (random(squareUv * 2.0) * 0.5) + 0.5;

			// apply gradient
			vec3 colorMix = getGradient(
			  vec4(vec3(uColor1), uColorStop1), 
			  vec4(vec3(uColor2), uColorStop2), 
			  vec4(vec3(uColor3), uColorStop3), 
			  vec4(vec3(uColor4), uColorStop4), 
			  clamp(n2, 0.0, 1.0)
			);

			// hueshift and box vignette
			vec3 hueShifted = hueShift(colorMix, uHueShift);
			float boxVignette = insideRectSmooth(vUv, vec2(0.0), vec2(1.0), uVignetteSize);
			hueShifted *= (uVignette == true) ? vec3(boxVignette) : vec3(1.0);

      gl_FragColor = LinearTosRGB(vec4(vec3(hueShifted), 1.0));
			// gl_FragColor = LinearTosRGB(vec4(vec3(uMouse.x), 1.0));
    }
  `)
);

extend({ FooMaterial });

const Scene = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mousePosEased, setMousePosEased] = useState({ x: 0, y: 0 });
  const { width, height } = useThree(state => state.viewport);
  const foo = useRef();
  const fooProps = useControls("shader", {
    uvXScale: 2.0,
    uvYScale: 2.0,
    noise1Scale1: 2.0,
    noise2Scale2: {
      min: 0.0,
      max: 512.0,
      step: 2.0,
      value: 2.0,
    },
    gNoiseOffset: 0.0,
    animateGNoise: false,
    color1: "#410b52",
    color2: "#cfceff",
    color3: "#ffbe97",
    color4: "#ff5726",
    colorStop1: {
      min: 0.0,
      max: 1.0,
      step: 0.05,
      value: 0.0,
    },
    colorStop2: {
      min: 0.0,
      max: 1.0,
      step: 0.05,
      value: 0.25,
    },
    colorStop3: {
      min: 0.0,
      max: 1.0,
      step: 0.05,
      value: 0.5,
    },
    colorStop4: {
      min: 0.0,
      max: 1.0,
      step: 0.05,
      value: 0.75,
    },
    hueShift: {
      min: 0.0,
      max: 1.0,
      step: 0.05,
      value: 0.95,
    },
    vignette: false,
    vignetteSize: 0.1,
  });

  useEffect(() => {
    window.addEventListener("mousemove", event => {
      const x = event.pageX / window.innerWidth;
      const y = event.pageY / window.innerHeight;
      setMousePos({
        x,
        y,
      });
    });
  }, []);

  useFrame(state => {
    foo.current.uniforms.uTime.value = state.clock.elapsedTime;

    if (fooProps.animateGNoise) {
      foo.current.uniforms.uGNoiseOffset.value = state.clock.elapsedTime * 0.1;
    }

    const mouseDistX = mousePos.x - mousePosEased.x;
    const mouseDistY = mousePos.y - mousePosEased.y;

    setMousePosEased({
      x: mousePosEased.x + mouseDistX * 0.2 * 0.2,
      y: mousePosEased.y + mouseDistY * 0.2 * 0.2,
    });

    // console.log(foo.current.uniforms.uMouse);

    foo.current.uniforms.uMouse.value.x = mousePosEased.x;
    foo.current.uniforms.uMouse.value.y = mousePosEased.y;
  });

  return (
    <Plane scale={[width, height, 1]}>
      <fooMaterial
        ref={foo}
        uAspect={width / height}
        uColor1={fooProps.color1}
        uColor2={fooProps.color2}
        uColor3={fooProps.color3}
        uColor4={fooProps.color4}
        uColorStop1={fooProps.colorStop1}
        uColorStop2={fooProps.colorStop2}
        uColorStop3={fooProps.colorStop3}
        uColorStop4={fooProps.colorStop4}
        uNoise1Scale={fooProps.noise1Scale1}
        uNoise2Scale={fooProps.noise2Scale2}
        uGNoiseOffset={fooProps.gNoiseOffset}
        uUvXScale={fooProps.uvXScale}
        uUvYScale={fooProps.uvYScale}
        uHueShift={fooProps.hueShift}
        uVignette={fooProps.vignette}
        uVignetteSize={fooProps.vignetteSize}
      />
    </Plane>
  );
};

const App = () => {
  return (
    <>
      <Canvas camera={{ fov: 70, position: [0, 0, 3] }}>
        {/* <OrbitControls /> */}
        <Scene />
      </Canvas>
      <div className='pointer-events-none fixed inset-0 flex justify-center items-center text-[200px] text-white font-sans font-bold'>
        <span>June 3</span>
      </div>
    </>
  );
};

export default App;
