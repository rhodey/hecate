import { CameraControls, Environment, Gltf } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useControls } from "leva";
import { useEffect, useRef, useState } from "react";
import { VRMAvatar } from "./VRMAvatar";

const AVATAR_OPTIONS = [
  "avatar1.vrm",
  "avatar2.vrm",
  "avatar3.vrm",
];

const ANIMATION_OPTIONS = ["Greeting", "Thinking", "Idle"];

const WEBSOCKET_URL = `ws://${window.location.hostname}:8083`;
const RECONNECT_INTERVAL_MS = 2000;
const MODEL_LEFT_OFFSET = -0.45;

export const Experience = () => {
  const { gl } = useThree();
  const controls = useRef();
  const websocketRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const currentAvatarRef = useRef();
  const currentAnimationRef = useRef();
  const currentAnimationOptionsRef = useRef({
    seek: 0,
    duration: undefined,
  });
  const [animationOptions, setAnimationOptions] = useState({
    seek: 0,
    duration: undefined,
  });

  const [{ avatar, animation }, setVrmSettings] = useControls(() => ({
    avatar: {
      value: AVATAR_OPTIONS[0],
      options: AVATAR_OPTIONS,
    },
    animation: {
      value: "Idle",
      options: ANIMATION_OPTIONS,
    },
  }));

  useEffect(() => {
    currentAvatarRef.current = avatar;
    currentAnimationRef.current = animation;
  }, [animation, avatar]);

  useEffect(() => {
    currentAnimationOptionsRef.current = animationOptions;
  }, [animationOptions]);

  const parseAnimationCommand = (payload) => {
    if (!payload || typeof payload !== "object") {
      return;
    }

    const updates = {};
    const nextAnimationOptions = {};

    if (
      typeof payload.avatar === "string" &&
      payload.avatar !== currentAvatarRef.current &&
      AVATAR_OPTIONS.includes(payload.avatar)
    ) {
      updates.avatar = payload.avatar;
    }

    if (
      typeof payload.animation === "string" &&
      ANIMATION_OPTIONS.includes(payload.animation)
    ) {
      if (payload.animation !== currentAnimationRef.current) {
        updates.animation = payload.animation;
      }

      const rawSeek = payload.seek;
      const rawDuration = payload.duration;

      if (rawSeek === undefined || rawSeek === null) {
        nextAnimationOptions.seek = 0;
      } else if (typeof rawSeek === "number" && Number.isFinite(rawSeek)) {
        nextAnimationOptions.seek = Math.max(0, rawSeek);
      }

      if (
        rawDuration === undefined ||
        rawDuration === null ||
        rawDuration === ""
      ) {
        nextAnimationOptions.duration = undefined;
      } else if (
        typeof rawDuration === "number" &&
        Number.isFinite(rawDuration)
      ) {
        nextAnimationOptions.duration = Math.max(0, rawDuration);
      }
    }

    if (Object.keys(updates).length > 0) {
      setVrmSettings(updates);
    }

    if (Object.keys(nextAnimationOptions).length > 0) {
      const mergedOptions = {
        ...currentAnimationOptionsRef.current,
        ...nextAnimationOptions,
      };

      if (
        mergedOptions.seek !== currentAnimationOptionsRef.current.seek ||
        mergedOptions.duration !== currentAnimationOptionsRef.current.duration
      ) {
        setAnimationOptions(mergedOptions);
      }
    }
  };

  useEffect(() => {
    let isUnmounted = false;
    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const scheduleReconnect = () => {
      if (isUnmounted || reconnectTimerRef.current) {
        return;
      }

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, RECONNECT_INTERVAL_MS);
    };

    const connect = () => {
      if (isUnmounted) {
        return;
      }

      clearReconnectTimer();

      try {
        const socket = new WebSocket(WEBSOCKET_URL);
        websocketRef.current = socket;

        socket.addEventListener("open", () => {
          clearReconnectTimer();
        });

        socket.addEventListener("message", (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload && typeof payload === "object") {
              parseAnimationCommand(payload);
            }
          } catch {
            // Ignore invalid websocket payloads
          }
        });

        socket.addEventListener("error", () => {
          socket.close();
        });

        socket.addEventListener("close", () => {
          if (websocketRef.current === socket) {
            websocketRef.current = null;
          }
          scheduleReconnect();
        });
      } catch {
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      isUnmounted = true;
      clearReconnectTimer();
      websocketRef.current?.close();
      websocketRef.current = null;
    };
  }, [gl, setVrmSettings]);

  return (
    <>
      <CameraControls
        ref={controls}
        maxPolarAngle={Math.PI / 2}
        minDistance={1}
        maxDistance={10}
      />
      <Environment preset="sunset" />
      <directionalLight intensity={2} position={[10, 10, 5]} />
      <directionalLight intensity={1} position={[-10, 10, 5]} />
      <group position-x={MODEL_LEFT_OFFSET} position-y={-1.25}>
        <VRMAvatar
          key={avatar}
          avatar={avatar}
          animation={animation}
          animationOptions={animationOptions}
        />
        {/* <Gltf
          src="models/sound-stage-final.glb"
          position-z={-1.4}
          position-x={-0.5}
          scale={0.65}
        /> */}
      </group>
      <EffectComposer>
        <Bloom mipmapBlur intensity={0.7} />
      </EffectComposer>
    </>
  );
};
