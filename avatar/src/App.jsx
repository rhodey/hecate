import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Suspense } from "react";
import { CameraWidget } from "./components/CameraWidget";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";

const DEFAULT_CAMERA_POSITION = [0.25, 0.25, 2];
const DEFAULT_CAMERA_ROTATION_DEGREES = 30;

const rotateCameraAroundY = ([x, y, z], degrees) => {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return [x * cos - z * sin, y, x * sin + z * cos];
};

function App() {
  const rotatedCameraPosition = rotateCameraAroundY(
    DEFAULT_CAMERA_POSITION,
    DEFAULT_CAMERA_ROTATION_DEGREES,
  );

  return (
    <>
      <Leva />
      <UI />
      <CameraWidget />
      <Loader />
      <Canvas
        shadows
        dpr={1}
        camera={{ position: rotatedCameraPosition, fov: 30 }} >
        <color attach="background" args={["#333"]} />
        <fog attach="fog" args={["#333", 10, 20]} />
        {/* <Stats /> */}
        <Suspense>
          <Experience />
        </Suspense>
      </Canvas>
    </>
  );
}

export default App;
