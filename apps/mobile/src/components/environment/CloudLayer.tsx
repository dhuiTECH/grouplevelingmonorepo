import React, { useEffect, useMemo } from "react";
import {
  ColorMatrix,
  Group,
  Image as SkiaImage,
  Skia,
  useImage,
} from "@shopify/react-native-skia";
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const CLOUD_SOURCES = [
  require("../../../assets/clouds1.png"),
  require("../../../assets/clouds2.png"),
  require("../../../assets/clouds3.png"),
  require("../../../assets/clouds4.png"),
] as const;

const CLOUD_COUNT = 18;

/** Slightly lift RGB so clouds read airy / less muddy over the map. */
const CLOUD_LIGHTEN_MATRIX = [
  1.18, 0, 0, 0, 0.06,
  0, 1.18, 0, 0, 0.06,
  0, 0, 1.18, 0, 0.06,
  0, 0, 0, 1, 0,
];

/** Turns the cloud image into a black silhouette for drop-shadow pass. */
const BLACK_TINT_MATRIX = [
  0, 0, 0, 0, 0,
  0, 0, 0, 0, 0,
  0, 0, 0, 0, 0,
  0, 0, 0, 1, 0,
];

export interface CloudLayerProps {
  screenWidth: number;
  screenHeight: number;
  opacity?: number;
  /** Time (ms) for one full period of drift (leftward by one wrap width). */
  speedMs?: number;
  enableMotion?: boolean;
  /** When false, skip the black duplicate under each cloud. Default true. */
  enableShadows?: boolean;
  /** Shadow pass opacity (soft diffuse; no blur). Default 0.12. */
  shadowOpacity?: number;
}

interface CloudSpec {
  x: number;
  y: number;
  width: number;
  height: number;
  variantIndex: number;
  opacityFactor: number;
}

/** Horizontal period for one repeating strip; duplicate is drawn at +wrapWidth. */
function computeWrapWidth(screenWidth: number): number {
  return Math.ceil(screenWidth * 1.28) + 220;
}

function buildCloudSpecs(
  wrapWidth: number,
  screenHeight: number,
): CloudSpec[] {
  const specs: CloudSpec[] = [];
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const w = 64 + Math.random() * 96;
    const h = 32 + Math.random() * 52;
    const yMax = Math.max(8, screenHeight - h);
    specs.push({
      x: Math.random() * Math.max(40, wrapWidth - w),
      y: Math.random() * yMax,
      width: w,
      height: h,
      variantIndex: Math.floor(Math.random() * 4),
      opacityFactor: 0.88 + Math.random() * 0.1,
    });
  }
  return specs;
}

/** Sun from west/left: shadow falls toward the right (+X) and slightly down */
const SHADOW_TRANSFORM = [
  { translateX: 56 },
  { translateY: 44 },
  { scale: 1.05 },
] as const;

function renderCloudInstances(
  cloudSpecs: CloudSpec[],
  images: readonly (unknown | null)[],
  wrapWidth: number,
  options: {
    enableShadows: boolean;
    shadowOpacity: number;
  },
) {
  const { enableShadows, shadowOpacity } = options;

  return cloudSpecs.flatMap((spec, index) => {
    const img = images[spec.variantIndex];
    if (!img) return [];

    const cxMain = spec.x + spec.width / 2;
    const cyMain = spec.y + spec.height / 2;
    const cxDup = spec.x + wrapWidth + spec.width / 2;
    const cyDup = spec.y + spec.height / 2;

    const shadowMain =
      enableShadows && shadowOpacity > 0 ? (
        <Group
          key={`cloud-${index}-${spec.variantIndex}-sh`}
          opacity={shadowOpacity}
          origin={{ x: cxMain, y: cyMain }}
          transform={[...SHADOW_TRANSFORM]}
        >
          <ColorMatrix matrix={BLACK_TINT_MATRIX} />
          <SkiaImage
            image={img}
            x={spec.x}
            y={spec.y}
            width={spec.width}
            height={spec.height}
            fit="contain"
          />
        </Group>
      ) : null;

    const shadowDup =
      enableShadows && shadowOpacity > 0 ? (
        <Group
          key={`cloud-${index}-${spec.variantIndex}-sh-dup`}
          opacity={shadowOpacity}
          origin={{ x: cxDup, y: cyDup }}
          transform={[...SHADOW_TRANSFORM]}
        >
          <ColorMatrix matrix={BLACK_TINT_MATRIX} />
          <SkiaImage
            image={img}
            x={spec.x + wrapWidth}
            y={spec.y}
            width={spec.width}
            height={spec.height}
            fit="contain"
          />
        </Group>
      ) : null;

    const common = (
      <Group key={`cloud-${index}-${spec.variantIndex}-grp`}>
        {shadowMain}
        <Group opacity={spec.opacityFactor}>
          <ColorMatrix matrix={CLOUD_LIGHTEN_MATRIX} />
          <SkiaImage
            image={img}
            x={spec.x}
            y={spec.y}
            width={spec.width}
            height={spec.height}
            fit="contain"
          />
        </Group>
      </Group>
    );

    const duplicate = (
      <Group key={`cloud-${index}-${spec.variantIndex}-dup-grp`}>
        {shadowDup}
        <Group opacity={spec.opacityFactor}>
          <ColorMatrix matrix={CLOUD_LIGHTEN_MATRIX} />
          <SkiaImage
            image={img}
            x={spec.x + wrapWidth}
            y={spec.y}
            width={spec.width}
            height={spec.height}
            fit="contain"
          />
        </Group>
      </Group>
    );

    return [common, duplicate];
  });
}

export function CloudLayer({
  screenWidth,
  screenHeight,
  opacity = 0.82,
  speedMs = 28000,
  enableMotion = true,
  enableShadows = true,
  shadowOpacity = 0.12,
}: CloudLayerProps) {
  const img0 = useImage(CLOUD_SOURCES[0]);
  const img1 = useImage(CLOUD_SOURCES[1]);
  const img2 = useImage(CLOUD_SOURCES[2]);
  const img3 = useImage(CLOUD_SOURCES[3]);

  const images = useMemo(
    () => [img0, img1, img2, img3] as const,
    [img0, img1, img2, img3],
  );

  const wrapWidth = useMemo(
    () => computeWrapWidth(screenWidth),
    [screenWidth],
  );

  const cloudSpecs = useMemo(
    () => buildCloudSpecs(wrapWidth, screenHeight),
    [wrapWidth, screenHeight],
  );

  const translateX = useSharedValue(0);

  useEffect(() => {
    if (!enableMotion) {
      cancelAnimation(translateX);
      translateX.value = 0;
      return;
    }
    cancelAnimation(translateX);
    translateX.value = 0;
    translateX.value = withRepeat(
      withSequence(
        withTiming(-wrapWidth, {
          duration: Math.max(1, speedMs),
          easing: Easing.linear,
        }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(translateX);
  }, [enableMotion, speedMs, wrapWidth]);

  const driftTransform = useDerivedValue(() => [
    { translateX: translateX.value },
  ]);

  const clipRect = useMemo(
    () => Skia.XYWHRect(0, 0, screenWidth, screenHeight),
    [screenWidth, screenHeight],
  );

  if (!images[0] || !images[1] || !images[2] || !images[3]) {
    return null;
  }

  return (
    <Group clip={clipRect}>
      <Group opacity={opacity} transform={driftTransform}>
        {renderCloudInstances(cloudSpecs, images, wrapWidth, {
          enableShadows,
          shadowOpacity,
        })}
      </Group>
    </Group>
  );
}
