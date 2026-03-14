import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { useAnimations, useFBX, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Face, Hand, Pose } from "kalidokit";
import { useControls } from "leva";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Euler, LoopRepeat, Object3D, Quaternion, Vector3 } from "three";
import { lerp } from "three/src/math/MathUtils.js";
import { useVideoRecognition } from "../hooks/useVideoRecognition";
import { remapMixamoAnimationToVrm } from "../utils/remapMixamoAnimationToVrm";

const tmpVec3 = new Vector3();
const tmpQuat = new Quaternion();
const tmpEuler = new Euler();

export const VRMAvatar = ({ avatar, animation, animationOptions, ...props }) => {
  const currentActionRef = useRef();
  const secondaryActionRef = useRef();
  const currentAnimationNameRef = useRef();
  const loopBlendStateRef = useRef({
    isBlending: false,
    cleanupAt: 0,
    outgoingAction: undefined,
  });
  const currentAnimationWindowRef = useRef({
    startTimeSec: 0,
    endTimeSec: undefined,
  });

  const { scene, userData } = useGLTF(
    `models/${avatar}`,
    undefined,
    undefined,
    (loader) => {
      loader.register((parser) => {
        return new VRMLoaderPlugin(parser);
      });
    }
  );

  const assetA = useFBX("models/animations/Idle.fbx");
  const assetB = useFBX("models/animations/Standing Greeting.fbx");
  const assetC = useFBX("models/animations/Thinking.fbx");

  const currentVrm = userData.vrm;

  const animationClipA = useMemo(() => {
    const clip = remapMixamoAnimationToVrm(currentVrm, assetA);
    clip.name = "Idle";
    return clip;
  }, [assetA, currentVrm]);

  const animationClipB = useMemo(() => {
    const clip = remapMixamoAnimationToVrm(currentVrm, assetB);
    clip.name = "Greeting";
    return clip;
  }, [assetB, currentVrm]);

  const animationClipC = useMemo(() => {
    const clip = remapMixamoAnimationToVrm(currentVrm, assetC);
    clip.name = "Thinking";
    return clip;
  }, [assetC, currentVrm]);

  const animationClips = useMemo(() => {
    return [animationClipA, animationClipB, animationClipC].flatMap((clip) => {
      const alternateClip = clip.clone();
      alternateClip.name = `${clip.name}__alt`;
      return [clip, alternateClip];
    });
  }, [animationClipA, animationClipB, animationClipC]);

  const { actions } = useAnimations(animationClips, currentVrm.scene);

  useEffect(() => {
    currentActionRef.current?.stop();
    secondaryActionRef.current?.stop();
    loopBlendStateRef.current.outgoingAction?.stop();

    currentActionRef.current = undefined;
    secondaryActionRef.current = undefined;
    currentAnimationNameRef.current = undefined;
    loopBlendStateRef.current = {
      isBlending: false,
      cleanupAt: 0,
      outgoingAction: undefined,
    };
  }, [currentVrm]);

  const animationWindow = useMemo(() => {
    const seekMs =
      typeof animationOptions?.seek === "number" &&
      Number.isFinite(animationOptions.seek)
        ? Math.max(0, animationOptions.seek)
        : 0;
    const durationMs =
      typeof animationOptions?.duration === "number" &&
      Number.isFinite(animationOptions.duration)
        ? Math.max(0, animationOptions.duration)
        : undefined;

    return {
      startTimeSec: seekMs / 1000,
      endTimeSec:
        durationMs === undefined ? undefined : (seekMs + durationMs) / 1000,
    };
  }, [animationOptions]);

  useEffect(() => {
    currentAnimationWindowRef.current = animationWindow;
  }, [animationWindow]);

  useEffect(() => {
    const vrm = userData.vrm;
    console.log("VRM loaded:", vrm);
    // calling these functions greatly improves the performance
    VRMUtils.removeUnnecessaryVertices(scene);
    VRMUtils.combineSkeletons(scene);
    VRMUtils.combineMorphs(vrm);

    // Disable frustum culling
    vrm.scene.traverse((obj) => {
      obj.frustumCulled = false;
    });
  }, [scene]);

  const setResultsCallback = useVideoRecognition(
    (state) => state.setResultsCallback
  );
  const videoElement = useVideoRecognition((state) => state.videoElement);
  const riggedFace = useRef();
  const riggedPose = useRef();
  const riggedLeftHand = useRef();
  const riggedRightHand = useRef();

  const resultsCallback = useCallback(
    (results) => {
      if (!videoElement || !currentVrm) {
        return;
      }
      if (results.faceLandmarks) {
        riggedFace.current = Face.solve(results.faceLandmarks, {
          runtime: "mediapipe", // `mediapipe` or `tfjs`
          video: videoElement,
          imageSize: { width: 640, height: 480 },
          smoothBlink: false, // smooth left and right eye blink delays
          blinkSettings: [0.25, 0.75], // adjust upper and lower bound blink sensitivity
        });
      }
      if (results.za && results.poseLandmarks) {
        riggedPose.current = Pose.solve(results.za, results.poseLandmarks, {
          runtime: "mediapipe",
          video: videoElement,
        });
      }

      // Switched left and right (Mirror effect)
      if (results.leftHandLandmarks) {
        riggedRightHand.current = Hand.solve(
          results.leftHandLandmarks,
          "Right"
        );
      }
      if (results.rightHandLandmarks) {
        riggedLeftHand.current = Hand.solve(results.rightHandLandmarks, "Left");
      }
    },
    [videoElement, currentVrm]
  );

  useEffect(() => {
    setResultsCallback(resultsCallback);
  }, [resultsCallback]);

  const {
    aa,
    ih,
    ee,
    oh,
    ou,
    blinkLeft,
    blinkRight,
    angry,
    sad,
    happy,
  } = useControls("VRM", {
    aa: { value: 0, min: 0, max: 1 },
    ih: { value: 0, min: 0, max: 1 },
    ee: { value: 0, min: 0, max: 1 },
    oh: { value: 0, min: 0, max: 1 },
    ou: { value: 0, min: 0, max: 1 },
    blinkLeft: { value: 0, min: 0, max: 1 },
    blinkRight: { value: 0, min: 0, max: 1 },
    angry: { value: 0, min: 0, max: 1 },
    sad: { value: 0, min: 0, max: 1 },
    happy: { value: 0, min: 0, max: 1 },
  });

  useEffect(() => {
    const FADE_DURATION = 0.3;

    const stopCurrentActions = () => {
      currentActionRef.current?.fadeOut(FADE_DURATION);
      if (
        secondaryActionRef.current &&
        secondaryActionRef.current !== currentActionRef.current
      ) {
        secondaryActionRef.current.stop();
      }
      loopBlendStateRef.current.outgoingAction?.stop();
      loopBlendStateRef.current = {
        isBlending: false,
        cleanupAt: 0,
        outgoingAction: undefined,
      };
      currentActionRef.current = undefined;
      secondaryActionRef.current = undefined;
      currentAnimationNameRef.current = undefined;
    };

    if (videoElement || animation === "None") {
      stopCurrentActions();
      return;
    }

    const primaryAction = actions[animation];
    const alternateAction = actions[`${animation}__alt`];
    if (!primaryAction || !alternateAction) {
      return;
    }

    const currentAction = currentActionRef.current;
    if (currentAction && currentAnimationNameRef.current === animation) {
      return;
    }

    alternateAction.stop();

    const nextAction = primaryAction;
    nextAction.enabled = true;
    nextAction.setLoop(LoopRepeat, Infinity);
    nextAction.setEffectiveTimeScale(1);
    nextAction.setEffectiveWeight(1);
    nextAction.reset();
    nextAction.time = animationWindow.startTimeSec;
    nextAction.play();

    if (currentAction) {
      currentAction.enabled = true;
      currentAction.crossFadeTo(nextAction, FADE_DURATION, false);
    } else {
      nextAction.fadeIn(FADE_DURATION);
    }

    currentActionRef.current = nextAction;
    secondaryActionRef.current = alternateAction;
    currentAnimationNameRef.current = animation;
  }, [actions, animation, videoElement, animationWindow.startTimeSec]);

  useEffect(() => {
    loopBlendStateRef.current.outgoingAction?.stop();
    loopBlendStateRef.current = {
      isBlending: false,
      cleanupAt: 0,
      outgoingAction: undefined,
    };

    const currentAction = currentActionRef.current;
    if (!currentAction) {
      return;
    }

    currentAction.time = animationWindow.startTimeSec;

    if (
      secondaryActionRef.current &&
      secondaryActionRef.current !== currentAction
    ) {
      secondaryActionRef.current.stop();
    }
  }, [animationWindow]);

  useEffect(() => {
    return () => {
      currentActionRef.current?.stop();
      secondaryActionRef.current?.stop();
      loopBlendStateRef.current.outgoingAction?.stop();
      currentActionRef.current = undefined;
      secondaryActionRef.current = undefined;
      currentAnimationNameRef.current = undefined;
    };
  }, []);

  const lerpExpression = (name, value, lerpFactor) => {
    userData.vrm.expressionManager.setValue(
      name,
      lerp(userData.vrm.expressionManager.getValue(name), value, lerpFactor)
    );
  };

  const rotateBone = (
    boneName,
    value,
    slerpFactor,
    flip = {
      x: 1,
      y: 1,
      z: 1,
    }
  ) => {
    const bone = userData.vrm.humanoid.getNormalizedBoneNode(boneName);
    if (!bone) {
      console.warn(
        `Bone ${boneName} not found in VRM humanoid. Check the bone name.`
      );
      console.log("userData.vrm.humanoid.bones", userData.vrm.humanoid);
      return;
    }

    tmpEuler.set(value.x * flip.x, value.y * flip.y, value.z * flip.z);
    tmpQuat.setFromEuler(tmpEuler);
    bone.quaternion.slerp(tmpQuat, slerpFactor);
  };

  useFrame((state, delta) => {
    if (!userData.vrm) {
      return;
    }
    userData.vrm.expressionManager.setValue("angry", angry);
    userData.vrm.expressionManager.setValue("sad", sad);
    userData.vrm.expressionManager.setValue("happy", happy);

    if (!videoElement) {
      const currentAction = currentActionRef.current;
      if (currentAction) {
        const clipDuration = currentAction.getClip().duration;
        const clampedStartTime = Math.min(
          currentAnimationWindowRef.current.startTimeSec,
          clipDuration
        );
        const requestedEndTime = currentAnimationWindowRef.current.endTimeSec;
        const clampedEndTime =
          requestedEndTime === undefined
            ? clipDuration
            : Math.min(Math.max(requestedEndTime, clampedStartTime), clipDuration);

        const segmentDuration = clampedEndTime - clampedStartTime;
        if (segmentDuration > 0 && requestedEndTime !== undefined) {
          const crossFadeDuration = Math.min(0.2, segmentDuration / 2);
          const loopTriggerTime = clampedEndTime - crossFadeDuration;

          if (
            !loopBlendStateRef.current.isBlending &&
            currentAction.time >= loopTriggerTime
          ) {
            const nextAction = secondaryActionRef.current;
            if (nextAction && nextAction !== currentAction) {
              nextAction.enabled = true;
              nextAction.setLoop(LoopRepeat, Infinity);
              nextAction.setEffectiveTimeScale(1);
              nextAction.setEffectiveWeight(1);
              nextAction.reset();
              nextAction.time = clampedStartTime;
              nextAction.play();

              currentAction.crossFadeTo(nextAction, crossFadeDuration, false);

              loopBlendStateRef.current = {
                isBlending: true,
                cleanupAt: state.clock.elapsedTime + crossFadeDuration,
                outgoingAction: currentAction,
              };

              currentActionRef.current = nextAction;
              secondaryActionRef.current = currentAction;
            }
          }
        } else if (
          clampedEndTime > clampedStartTime &&
          currentAction.time >= clampedEndTime
        ) {
          currentAction.time = clampedStartTime;
        }

        if (
          loopBlendStateRef.current.isBlending &&
          state.clock.elapsedTime >= loopBlendStateRef.current.cleanupAt
        ) {
          loopBlendStateRef.current.outgoingAction?.stop();
          loopBlendStateRef.current = {
            isBlending: false,
            cleanupAt: 0,
            outgoingAction: undefined,
          };
        }
      }

      [
        {
          name: "aa",
          value: aa,
        },
        {
          name: "ih",
          value: ih,
        },
        {
          name: "ee",
          value: ee,
        },
        {
          name: "oh",
          value: oh,
        },
        {
          name: "ou",
          value: ou,
        },
        {
          name: "blinkLeft",
          value: blinkLeft,
        },
        {
          name: "blinkRight",
          value: blinkRight,
        },
      ].forEach((item) => {
        lerpExpression(item.name, item.value, delta * 12);
      });
    } else {
      if (riggedFace.current) {
        [
          {
            name: "aa",
            value: riggedFace.current.mouth.shape.A,
          },
          {
            name: "ih",
            value: riggedFace.current.mouth.shape.I,
          },
          {
            name: "ee",
            value: riggedFace.current.mouth.shape.E,
          },
          {
            name: "oh",
            value: riggedFace.current.mouth.shape.O,
          },
          {
            name: "ou",
            value: riggedFace.current.mouth.shape.U,
          },
          {
            name: "blinkLeft",
            value: 1 - riggedFace.current.eye.l,
          },
          {
            name: "blinkRight",
            value: 1 - riggedFace.current.eye.r,
          },
        ].forEach((item) => {
          lerpExpression(item.name, item.value, delta * 12);
        });
      }
      // Eyes
      if (lookAtTarget.current) {
        userData.vrm.lookAt.target = lookAtTarget.current;
        lookAtDestination.current.set(
          -2 * riggedFace.current.pupil.x,
          2 * riggedFace.current.pupil.y,
          0
        );
        lookAtTarget.current.position.lerp(
          lookAtDestination.current,
          delta * 5
        );
      }

      // Body
      rotateBone("neck", riggedFace.current.head, delta * 5, {
        x: 0.7,
        y: 0.7,
        z: 0.7,
      });
    }
    if (riggedPose.current) {
      rotateBone("chest", riggedPose.current.Spine, delta * 5, {
        x: 0.3,
        y: 0.3,
        z: 0.3,
      });
      rotateBone("spine", riggedPose.current.Spine, delta * 5, {
        x: 0.3,
        y: 0.3,
        z: 0.3,
      });
      rotateBone("hips", riggedPose.current.Hips.rotation, delta * 5, {
        x: 0.7,
        y: 0.7,
        z: 0.7,
      });

      // LEFT ARM
      rotateBone("leftUpperArm", riggedPose.current.LeftUpperArm, delta * 5);
      rotateBone("leftLowerArm", riggedPose.current.LeftLowerArm, delta * 5);
      // RIGHT ARM
      rotateBone("rightUpperArm", riggedPose.current.RightUpperArm, delta * 5);
      rotateBone("rightLowerArm", riggedPose.current.RightLowerArm, delta * 5);

      if (riggedLeftHand.current) {
        rotateBone(
          "leftHand",
          {
            z: riggedPose.current.LeftHand.z,
            y: riggedLeftHand.current.LeftWrist.y,
            x: riggedLeftHand.current.LeftWrist.x,
          },
          delta * 12
        );
        rotateBone(
          "leftRingProximal",
          riggedLeftHand.current.LeftRingProximal,
          delta * 12
        );
        rotateBone(
          "leftRingIntermediate",
          riggedLeftHand.current.LeftRingIntermediate,
          delta * 12
        );
        rotateBone(
          "leftRingDistal",
          riggedLeftHand.current.LeftRingDistal,
          delta * 12
        );
        rotateBone(
          "leftIndexProximal",
          riggedLeftHand.current.LeftIndexProximal,
          delta * 12
        );
        rotateBone(
          "leftIndexIntermediate",
          riggedLeftHand.current.LeftIndexIntermediate,
          delta * 12
        );
        rotateBone(
          "leftIndexDistal",
          riggedLeftHand.current.LeftIndexDistal,
          delta * 12
        );
        rotateBone(
          "leftMiddleProximal",
          riggedLeftHand.current.LeftMiddleProximal,
          delta * 12
        );
        rotateBone(
          "leftMiddleIntermediate",
          riggedLeftHand.current.LeftMiddleIntermediate,
          delta * 12
        );
        rotateBone(
          "leftMiddleDistal",
          riggedLeftHand.current.LeftMiddleDistal,
          delta * 12
        );
        rotateBone(
          "leftThumbProximal",
          riggedLeftHand.current.LeftThumbProximal,
          delta * 12
        );
        rotateBone(
          "leftThumbMetacarpal",
          riggedLeftHand.current.LeftThumbIntermediate,
          delta * 12
        );
        rotateBone(
          "leftThumbDistal",
          riggedLeftHand.current.LeftThumbDistal,
          delta * 12
        );
        rotateBone(
          "leftLittleProximal",
          riggedLeftHand.current.LeftLittleProximal,
          delta * 12
        );
        rotateBone(
          "leftLittleIntermediate",
          riggedLeftHand.current.LeftLittleIntermediate,
          delta * 12
        );
        rotateBone(
          "leftLittleDistal",
          riggedLeftHand.current.LeftLittleDistal,
          delta * 12
        );
      }

      if (riggedRightHand.current) {
        rotateBone(
          "rightHand",
          {
            z: riggedPose.current.RightHand.z,
            y: riggedRightHand.current.RightWrist.y,
            x: riggedRightHand.current.RightWrist.x,
          },
          delta * 12
        );
        rotateBone(
          "rightRingProximal",
          riggedRightHand.current.RightRingProximal,
          delta * 12
        );
        rotateBone(
          "rightRingIntermediate",
          riggedRightHand.current.RightRingIntermediate,
          delta * 12
        );
        rotateBone(
          "rightRingDistal",
          riggedRightHand.current.RightRingDistal,
          delta * 12
        );
        rotateBone(
          "rightIndexProximal",
          riggedRightHand.current.RightIndexProximal,
          delta * 12
        );
        rotateBone(
          "rightIndexIntermediate",
          riggedRightHand.current.RightIndexIntermediate,
          delta * 12
        );
        rotateBone(
          "rightIndexDistal",
          riggedRightHand.current.RightIndexDistal,
          delta * 12
        );
        rotateBone(
          "rightMiddleProximal",
          riggedRightHand.current.RightMiddleProximal,
          delta * 12
        );
        rotateBone(
          "rightMiddleIntermediate",
          riggedRightHand.current.RightMiddleIntermediate,
          delta * 12
        );
        rotateBone(
          "rightMiddleDistal",
          riggedRightHand.current.RightMiddleDistal,
          delta * 12
        );
        rotateBone(
          "rightThumbProximal",
          riggedRightHand.current.RightThumbProximal,
          delta * 12
        );
        rotateBone(
          "rightThumbMetacarpal",
          riggedRightHand.current.RightThumbIntermediate,
          delta * 12
        );
        rotateBone(
          "rightThumbDistal",
          riggedRightHand.current.RightThumbDistal,
          delta * 12
        );
        rotateBone(
          "rightLittleProximal",
          riggedRightHand.current.RightLittleProximal,
          delta * 12
        );
        rotateBone(
          "rightLittleIntermediate",
          riggedRightHand.current.RightLittleIntermediate,
          delta * 12
        );
        rotateBone(
          "rightLittleDistal",
          riggedRightHand.current.RightLittleDistal,
          delta * 12
        );
      }
    }

    userData.vrm.update(delta);
  });

  const lookAtDestination = useRef(new Vector3(0, 0, 0));
  const camera = useThree((state) => state.camera);
  const lookAtTarget = useRef();
  useEffect(() => {
    lookAtTarget.current = new Object3D();
    camera.add(lookAtTarget.current);
  }, [camera]);

  return (
    <group {...props}>
      <primitive
        object={scene}
        rotation-y={avatar !== "3636451243928341470.vrm" ? Math.PI : 0}
      />
    </group>
  );
};
