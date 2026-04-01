import React, { useId } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ImageSourcePropType,
} from 'react-native';
import Svg, {
  Polygon,
  Polyline,
  Path,
  Text as SvgText,
  G,
  Defs,
  Pattern,
  Line,
  Rect,
} from 'react-native-svg';

const DICE_PATH =
  'M4 4H8V8H4V4ZM12 4H16V8H12V4ZM4 12H8V16H4V12ZM12 12H16V16H12V12Z';

export type SystemAvatarCategoryId =
  | 'base'
  | 'face_eyes'
  | 'face_mouth'
  | 'hair'
  | 'face'
  | 'body';

export const SYSTEM_AVATAR_CATEGORIES: { id: SystemAvatarCategoryId; label: string }[] = [
  { id: 'base', label: 'BASE' },
  { id: 'face_eyes', label: 'EYES' },
  { id: 'face_mouth', label: 'MOUTH' },
  { id: 'hair', label: 'HAIR' },
  { id: 'face', label: 'FACE' },
  { id: 'body', label: 'BODY' },
];

const CYAN = '#00f0ff';
const CYAN_DIM = 'rgba(0, 240, 255, 0.45)';
const BG_INACTIVE = 'rgba(4, 17, 34, 0.92)';
const BG_ACTIVE = 'rgba(6, 28, 52, 0.96)';
const STROKE_INACTIVE = 'rgba(11, 56, 102, 0.95)';
const LABEL_FONT = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

type CategoryTileProps = {
  label: string;
  iconSource: ImageSourcePropType;
  active: boolean;
  onPress: () => void;
  width: number;
};

function SystemCategoryTile({
  label,
  iconSource,
  active,
  onPress,
  width,
}: CategoryTileProps) {
  const height = (width * 50) / 140;
  const bgColor = active ? BG_ACTIVE : BG_INACTIVE;
  const strokeColor = active ? CYAN : STROKE_INACTIVE;
  const accentColor = active ? CYAN : CYAN_DIM;
  const textColor = active ? '#e0f7fa' : 'rgba(203, 213, 225, 0.75)';
  const strokeW = active ? 2 : 1.5;
  const accentW = active ? 2.5 : 1.5;
  const iconSize = Math.min(30, width * 0.28);
  const iconLeft = width * (8 / 140);
  const iconTop = (height - iconSize) / 2;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.tileWrap,
        active && styles.tileWrapActive,
        { width, height },
      ]}
    >
      <View style={[styles.tileInner, { width, height }]} pointerEvents="box-none">
        <Svg width={width} height={height} viewBox="0 0 140 50" style={styles.svgLayer}>
          <Polygon
            points="10,2 138,2 138,40 128,48 2,48 2,10"
            fill={bgColor}
            stroke={strokeColor}
            strokeWidth={strokeW}
          />
          <Polyline
            points="2,18 2,10 10,2 30,2"
            fill="none"
            stroke={accentColor}
            strokeWidth={accentW}
          />
          <Polyline
            points="110,48 128,48 138,40 138,32"
            fill="none"
            stroke={accentColor}
            strokeWidth={accentW}
          />
          {active && (
            <G>
              <Rect x={130} y={8} width={3} height={3} fill={CYAN} />
              <Rect x={7} y={39} width={3} height={3} fill={CYAN} />
            </G>
          )}
          <SvgText
            x={48}
            y={30}
            fill={textColor}
            fontSize={14}
            fontWeight="700"
            letterSpacing={2}
            fontFamily="Montserrat-Bold"
          >
            {label}
          </SvgText>
        </Svg>
        <Image
          source={iconSource}
          resizeMode="contain"
          pointerEvents="none"
          style={[
            styles.categoryPngIcon,
            {
              left: iconLeft,
              top: iconTop,
              width: iconSize,
              height: iconSize,
              opacity: active ? 1 : 0.6,
            },
          ]}
        />
      </View>
    </TouchableOpacity>
  );
}

type GridProps = {
  contentWidth: number;
  activeCategory: string;
  onSelect: (id: SystemAvatarCategoryId) => void;
  categoryIconSources: Record<SystemAvatarCategoryId, ImageSourcePropType>;
};

export function SystemAvatarCategoryGrid({
  contentWidth,
  activeCategory,
  onSelect,
  categoryIconSources,
}: GridProps) {
  const gap = 10;
  const tileW = (contentWidth - gap * 2) / 3;
  const rows = [
    SYSTEM_AVATAR_CATEGORIES.slice(0, 3),
    SYSTEM_AVATAR_CATEGORIES.slice(3, 6),
  ];

  return (
    <View style={[styles.grid, { width: contentWidth }]}>
      {rows.map((row, ri) => (
        <View
          key={ri}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
            marginBottom: ri === 0 ? gap : 0,
          }}
        >
          {row.map((cat) => (
            <SystemCategoryTile
              key={cat.id}
              label={cat.label}
              iconSource={categoryIconSources[cat.id]}
              active={activeCategory === cat.id}
              onPress={() => onSelect(cat.id)}
              width={tileW}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

type RandomizeProps = {
  onPress: () => void;
  width: number;
};

/** Small chamfer control — keeps header short so bottom actions stay visible */
export function SystemRandomizeButton({ onPress, width }: RandomizeProps) {
  const height = (width * 50) / 140;
  const labelFont = Math.max(7, Math.min(9, width * 0.115));
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
      style={{ width, height }}
    >
      <Svg width={width} height={height} viewBox="0 0 140 50" style={styles.svgFill}>
        <Polygon
          points="10,2 138,2 138,40 128,48 2,48 2,10"
          fill={BG_INACTIVE}
          stroke={STROKE_INACTIVE}
          strokeWidth={1.5}
        />
        <Polyline
          points="2,18 2,10 10,2 30,2"
          fill="none"
          stroke={CYAN_DIM}
          strokeWidth={1.5}
        />
        <Polyline
          points="110,48 128,48 138,40 138,32"
          fill="none"
          stroke={CYAN_DIM}
          strokeWidth={1.5}
        />
        <G transform="translate(9, 14)">
          <Path
            d={DICE_PATH}
            stroke={CYAN}
            strokeWidth={1.15}
            fill="none"
            strokeLinecap="square"
          />
        </G>
        <SvgText
          x={34}
          y={30}
          fill="#e0f7fa"
          fontSize={labelFont}
          fontWeight="700"
          letterSpacing={0.5}
          fontFamily="Montserrat-Bold"
        >
          RANDOMIZE
        </SvgText>
      </Svg>
    </TouchableOpacity>
  );
}

type ClassButtonProps = {
  onPress: () => void;
  width: number;
  label?: string;
};

export function SystemClassSelectionButton({ onPress, width, label = "CLASS SELECTION" }: ClassButtonProps) {
  const uid = useId().replace(/:/g, '_');
  const patternId = `scanlines-${uid}`;
  const height = (width * 90) / 450;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[
        styles.classBtnShadow,
        { width, height },
      ]}
    >
      <Svg width={width} height={height} viewBox="0 0 450 90" style={styles.svgFill}>
        <Defs>
          <Pattern id={patternId} width={4} height={4} patternUnits="userSpaceOnUse">
            <Line x1={0} y1={0} x2={4} y2={0} stroke={CYAN} strokeWidth={0.5} opacity={0.12} />
          </Pattern>
        </Defs>
        <Polygon
          points="25,10 440,10 440,60 420,80 10,80 10,25"
          fill="rgba(0, 240, 255, 0.06)"
          stroke="rgba(0, 240, 255, 0.25)"
          strokeWidth={1}
        />
        <Polygon
          points="25,10 440,10 440,60 420,80 10,80 10,25"
          fill="#041122"
          stroke="#0b3866"
          strokeWidth={1.5}
        />
        <Polygon points="25,10 440,10 440,60 420,80 10,80 10,25" fill={`url(#${patternId})`} />
        <Polyline
          points="10,35 10,25 25,10 120,10"
          fill="none"
          stroke={CYAN}
          strokeWidth={2}
        />
        <Polyline
          points="330,80 420,80 440,60 440,35"
          fill="none"
          stroke={CYAN}
          strokeWidth={2}
        />
        <Rect x={420} y={15} width={4} height={4} fill={CYAN} opacity={0.8} />
        <Rect x={428} y={15} width={4} height={4} fill={CYAN} opacity={0.4} />
        <Rect x={412} y={15} width={4} height={4} fill={CYAN} opacity={0.2} />
        <Line x1={15} y1={70} x2={25} y2={70} stroke={CYAN} strokeWidth={2} opacity={0.6} />
        <Line x1={15} y1={75} x2={20} y2={75} stroke={CYAN} strokeWidth={2} opacity={0.6} />
        <SvgText
          x={35}
          y={25}
          fontFamily={LABEL_FONT}
          fontSize={9}
          fill="#4facfe"
          letterSpacing={1}
        >
          SYS.AUTH // LVL.1
        </SvgText>
        <SvgText
          x={415}
          y={75}
          fontFamily={LABEL_FONT}
          fontSize={9}
          fill="#4facfe"
          opacity={0.75}
          textAnchor="end"
        >
          NODE_04:READY
        </SvgText>
        <SvgText
          x={225}
          y={52}
          fontFamily="Montserrat-Bold"
          fontWeight="700"
          fontSize={22}
          fill="#e0f7fa"
          letterSpacing={4}
          textAnchor="middle"
        >
          {label}
        </SvgText>
        <G transform="translate(370, 32)">
          <Path
            d="M0,0 L12,12 L0,24"
            fill="none"
            stroke={CYAN}
            strokeWidth={3}
            strokeLinecap="square"
            opacity={0.35}
          />
          <Path
            d="M10,0 L22,12 L10,24"
            fill="none"
            stroke={CYAN}
            strokeWidth={3}
            strokeLinecap="square"
            opacity={0.65}
          />
          <Path
            d="M20,0 L32,12 L20,24"
            fill="none"
            stroke={CYAN}
            strokeWidth={3}
            strokeLinecap="square"
            opacity={1}
          />
        </G>
      </Svg>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  tileWrap: {
    alignSelf: 'center',
    overflow: 'visible',
  },
  tileWrapActive: {
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
    transform: [{ scale: 1.03 }],
  },
  tileInner: {
    position: 'relative',
    overflow: 'visible',
  },
  svgFill: { overflow: 'visible' },
  svgLayer: {
    overflow: 'visible',
    zIndex: 0,
  },
  categoryPngIcon: {
    position: 'absolute',
    zIndex: 2,
  },
  classBtnShadow: {
    alignSelf: 'center',
    shadowColor: CYAN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
});
