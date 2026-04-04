import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ViewStyle,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import type { ShopItem, User } from "@/types/user";
import { LayeredAvatar } from "./LayeredAvatar";
import { LinearGradient } from "expo-linear-gradient";

interface PlayerCallingCardProps {
  user: User;
  referralCode?: string;
  size?: "sm" | "md" | "lg";
  style?: ViewStyle;
  isOwnCard?: boolean;
  onPress?: () => void;
  /** Same as leaderboard / LayeredAvatar — needed for weapon → hand_grip resolution */
  allShopItems?: ShopItem[];
}

export const PlayerCallingCard: React.FC<PlayerCallingCardProps> = ({
  user,
  referralCode,
  size = "md",
  style,
  isOwnCard = false,
  onPress,
  allShopItems = [],
}) => {
  const [status, setStatus] = useState<"idle" | "copied">("idle");

  // Generate referral code if not provided
  const username = user.hunter_name || user.name || "HUNTER";
  const code =
    referralCode ||
    user.referral_code ||
    `HUNT-${username.substring(0, 3).toUpperCase()}${user.level || 1}`;
  const link = `https://groupleveling.app/join?ref=${code}`;

  // Handle tap to copy
  const handleTap = async () => {
    if (!isOwnCard) {
      onPress?.();
      return;
    }

    await Clipboard.setStringAsync(link);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatus("copied");
    setTimeout(() => setStatus("idle"), 2000);
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      height: 36,
      avatarSize: 60,
      textSize: 10,
      codeSize: 7,
      rewardSize: 7,
    },
    md: {
      height: 64,
      avatarSize: 100,
      textSize: 14,
      codeSize: 9,
      rewardSize: 8,
    },
    lg: {
      height: 80,
      avatarSize: 120,
      textSize: 18,
      codeSize: 11,
      rewardSize: 10,
    },
  };

  const config = sizeConfig[size];

  return (
    <TouchableOpacity
      onPress={handleTap}
      activeOpacity={isOwnCard ? 0.8 : 1}
      style={[styles.card, { height: config.height }, style]}
    >
      {/* Background gradient */}
      <LinearGradient
        colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.4)", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Avatar background layer (cropped eye section like Next.js) */}
      <View style={styles.avatarBackground}>
        <View
          style={[
            styles.avatarScaleContainer,
            { transform: [{ scale: 7 }, { translateY: "6%" }] },
          ]}
        >
          <LayeredAvatar
            user={user}
            size={config.avatarSize}
            hideBackground={true}
            allShopItems={allShopItems}
          />
        </View>
        {/* Dark gradient overlay for text readability */}
        <LinearGradient
          colors={["rgba(0,0,0,0.9)", "rgba(0,0,0,0.4)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      {/* Text content */}
      <View style={styles.content}>
        {/* Username */}
        <Text
          style={[styles.username, { fontSize: config.textSize }]}
          numberOfLines={1}
        >
          {username.toUpperCase()}
        </Text>

        {/* Referral & Rewards (only for own card) */}
        {isOwnCard && (
          <View style={styles.referralRow}>
            {status === "copied" ? (
              <Text style={[styles.copiedText, { fontSize: config.codeSize }]}>
                ✓ COPIED
              </Text>
            ) : (
              <>
                <Text
                  style={[styles.referralCode, { fontSize: config.codeSize }]}
                >
                  REF: {code}
                </Text>

                {/* Rewards Badge */}
                <View style={styles.rewardsBadge}>
                  <View style={styles.rewardItem}>
                    <Image
                      source={require("../../assets/coinicon.png")}
                      style={styles.rewardIcon}
                    />
                    <Text
                      style={[
                        styles.rewardCoins,
                        { fontSize: config.rewardSize },
                      ]}
                    >
                      1000
                    </Text>
                  </View>
                  <View style={styles.rewardItem}>
                    <Image
                      source={require("../../assets/gemicon.png")}
                      style={styles.rewardIcon}
                    />
                    <Text
                      style={[
                        styles.rewardGems,
                        { fontSize: config.rewardSize },
                      ]}
                    >
                      2
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    minWidth: 180,
  },
  avatarBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    opacity: 0.8,
  },
  avatarScaleContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    zIndex: 10,
  },
  username: {
    color: "#fff",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  referralRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
    height: 14,
  },
  referralCode: {
    color: "#9ca3af",
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  copiedText: {
    color: "#22d3ee",
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  rewardsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(234,179,8,0.2)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  rewardItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  rewardIcon: {
    width: 10,
    height: 10,
    resizeMode: "contain",
  },
  rewardCoins: {
    color: "#facc15",
    fontWeight: "700",
  },
  rewardGems: {
    color: "#60a5fa",
    fontWeight: "700",
  },
});

export default PlayerCallingCard;
