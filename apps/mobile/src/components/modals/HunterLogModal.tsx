import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { MotiView, AnimatePresence } from 'moti';
import { Audio } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const HunterLogModal: React.FC<HunterLogModalProps> = ({
  visible,
  onClose,
  title = "Good Job!",
  expAmount = 0,
  coinsAmount = 0,
}) => {
  const soundRef = useRef<Audio.Sound | null>(null);

  const expCrystalSource = Image.resolveAssetSource(require('../../../assets/expcrystal.png'));
  const coinIconSource = Image.resolveAssetSource(require('../../../assets/coinicon.png'));

  // Pre-load sound on mount
  useEffect(() => {
    let isMounted = true;
    async function loadSound() {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../../assets/sounds/Hunterlogmodal.mp3')
        );
        if (isMounted) {
          soundRef.current = sound;
        } else {
          await sound.unloadAsync();
        }
      } catch (error) {
        console.log('Error pre-loading hunter log sound:', error);
      }
    }
    loadSound();
    return () => {
      isMounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  // Auto-close the modal after 2 seconds
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (visible) {
      // Play sound effect
      const playEntranceSound = async () => {
        try {
          if (soundRef.current) {
            await soundRef.current.replayAsync();
          } else {
            const { sound } = await Audio.Sound.createAsync(
              require('../../../assets/sounds/Hunterlogmodal.mp3')
            );
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate(async (status) => {
              if (status.isLoaded && status.didJustFinish) {
                await sound.unloadAsync();
              }
            });
          }
        } catch (error) {
          console.log('Error playing hunter log sound:', error);
        }
      };

      playEntranceSound();

      timeout = setTimeout(() => {
        onClose();
      }, 2000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [visible, onClose]);

  const getRewardHTML = () => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <style>
          @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600&family=Exo+2:wght@400;700&display=swap');
          
          body, html {
              margin: 0; padding: 0; height: 100%; width: 100%;
              background-color: transparent;
              display: flex; justify-content: center; align-items: center;
              font-family: 'Exo 2', sans-serif;
              overflow: hidden;
              color: #e0f7fa;
              user-select: none;
              -webkit-user-select: none;
          }

          /* Confetti Background */
          .particles { position: absolute; width: 100%; height: 100%; z-index: 0; }
          .confetti {
              position: absolute;
              top: -10%;
              width: 10px;
              height: 20px;
              opacity: 0.9;
              animation: fall var(--fall-duration) linear infinite, sway var(--sway-duration) ease-in-out infinite alternate;
          }
          @keyframes fall {
              0% { top: -10%; }
              100% { top: 110%; }
          }
          @keyframes sway {
              0% { transform: translateX(-30px) rotate3d(1, 1, 1, 0deg); }
              100% { transform: translateX(30px) rotate3d(1, 1, 1, 360deg); }
          }

          /* Solo Leveling System Window */
          .system-window {
              position: relative;
              width: 90%;
              max-width: 450px;
              background: linear-gradient(135deg, rgba(2, 6, 15, 0.95), rgba(8, 18, 35, 0.95));
              border: 1px solid rgba(0, 229, 255, 0.3);
              box-shadow: 0 0 20px rgba(0, 229, 255, 0.15), inset 0 0 30px rgba(0, 229, 255, 0.05);
              animation: system-open 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
              z-index: 1;
              backdrop-filter: blur(10px);
          }

          /* Scanline / Tech texture */
          .system-window::after {
              content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
              background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 229, 255, 0.03) 2px, rgba(0, 229, 255, 0.03) 4px);
              pointer-events: none;
              z-index: -1;
          }

          /* Glowing Top and Bottom Bars */
          .glow-bar-top, .glow-bar-bottom {
              position: absolute; left: -5%; width: 110%; height: 5px;
              background: linear-gradient(90deg, transparent, #005c99, #00e5ff, #ffffff, #00e5ff, #005c99, transparent);
              box-shadow: 0 0 15px #00e5ff, 0 0 25px #00e5ff;
          }
          .glow-bar-top { top: -2px; }
          .glow-bar-bottom { bottom: -2px; }

          /* Inner container with brackets */
          .inner-box {
              padding: 25px 20px;
              border: 1px solid rgba(0, 229, 255, 0.15);
              margin: 6px;
              position: relative;
          }

          /* Corner accents */
          .corner { position: absolute; width: 15px; height: 15px; border-color: rgba(0, 210, 255, 0.8); border-style: solid; border-width: 0; }
          .tl { top: -1px; left: -1px; border-top-width: 2px; border-left-width: 2px; }
          .tr { top: -1px; right: -1px; border-top-width: 2px; border-right-width: 2px; }
          .bl { bottom: -1px; left: -1px; border-bottom-width: 2px; border-left-width: 2px; }
          .br { bottom: -1px; right: -1px; border-bottom-width: 2px; border-right-width: 2px; }

          /* Header area */
          .header {
              display: flex; align-items: center; justify-content: center; gap: 15px;
              border-bottom: 1px solid rgba(0, 210, 255, 0.3);
              padding-bottom: 15px;
              margin-bottom: 25px;
              position: relative;
          }
          .header::after {
              content: ''; position: absolute; bottom: -1px; left: 10%; width: 80%; height: 1px;
              background: linear-gradient(90deg, transparent, #00d2ff, transparent);
              box-shadow: 0 0 8px #00d2ff;
          }
          
          .icon-square {
              width: 20px; height: 20px;
              border: 1.5px solid #ffffff;
              border-radius: 2px;
              display: flex; justify-content: center; align-items: center;
              box-shadow: 0 0 10px rgba(255, 255, 255, 0.5), 0 0 4px rgba(255, 255, 255, 0.3);
          }
          .icon-circle {
              width: 16px; height: 16px;
              border: 1.5px solid #ffffff; border-radius: 50%;
              background: transparent;
              display: flex; justify-content: center; align-items: center;
              color: #ffffff; font-weight: 700; font-size: 14px;
              box-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
              text-shadow: 0 0 5px #ffffff;
          }

          .title {
              font-family: 'Montserrat', sans-serif;
              color: #e6ffff; font-size: 26px; font-weight: 600; letter-spacing: 4px;
              text-shadow: 0 0 15px rgba(0, 210, 255, 0.8), 0 0 5px rgba(0, 210, 255, 0.5);
              text-transform: uppercase;
          }

          /* Rewards Area */
          .message {
              text-align: center; color: #00d2ff; font-size: 15px; margin-bottom: 25px; letter-spacing: 1px;
              text-shadow: 0 0 5px rgba(0, 210, 255, 0.3);
              font-weight: 400;
              text-transform: uppercase;
          }

          .rewards {
              display: flex; justify-content: space-around; align-items: center;
              background: rgba(0, 34, 68, 0.3);
              border: 1px solid rgba(0, 210, 255, 0.15);
              border-radius: 4px;
              padding: 20px 10px;
              position: relative;
          }
          .rewards::before {
              content: ''; position: absolute; left: 50%; top: 15%; bottom: 15%; width: 1px;
              background: linear-gradient(to bottom, transparent, rgba(0, 210, 255, 0.3), transparent);
          }

          .reward-item {
              display: flex; flex-direction: column; align-items: center; gap: 8px;
              flex: 1;
              z-index: 2;
              overflow: visible;
          }

          .icon-wrapper {
              width: 65px; height: 65px;
              display: flex; justify-content: center; align-items: center;
              animation: internal-float 3s ease-in-out infinite;
              overflow: visible;
          }
          .icon-wrapper.delay { animation-delay: 1.5s; }

          .icon-container {
              width: 65px; height: 65px;
              display: flex; justify-content: center; align-items: center;
              overflow: visible;
          }
          .icon-container.coin { width: 52px; height: 58px; min-height: 58px; }

          .reward-icon {
              width: 100%; height: 100%;
              object-fit: contain;
          }

          .reward-amount {
              font-size: 28px; font-weight: 400; color: #fff;
              text-shadow: 0 0 10px rgba(255, 255, 255, 0.6);
              margin-top: 5px;
              letter-spacing: 1px;
          }
          .reward-label {
              font-size: 14px; color: #00d2ff; font-weight: 400; letter-spacing: 2px;
              text-shadow: 0 0 5px rgba(0, 210, 255, 0.5);
              text-transform: uppercase;
          }

          /* Animations */
          @keyframes system-open {
              0% { transform: scaleY(0.01) scaleX(0); opacity: 0; filter: brightness(3); }
              50% { transform: scaleY(0.01) scaleX(1); opacity: 1; filter: brightness(2); }
              100% { transform: scaleY(1) scaleX(1); opacity: 1; filter: brightness(1); }
          }
          @keyframes internal-float {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-10px); }
          }
          @keyframes spinY {
              0%, 100% { transform: rotateY(-28deg); }
              50% { transform: rotateY(28deg); }
          }
          
          .spin { 
            animation: spinY 3s ease-in-out infinite; 
            transform-style: preserve-3d; 
            transform-origin: center; 
          }
      </style>
  </head>
  <body>
      <!-- Confetti Background -->
      <div class="particles">
          <!-- Cyan -->
          <div class="confetti" style="left: 10%; background: #00e5ff; --fall-duration: 4s; --sway-duration: 2s; animation-delay: 0s;"></div>
          <div class="confetti" style="left: 45%; background: #00e5ff; --fall-duration: 5s; --sway-duration: 2.5s; animation-delay: -2s;"></div>
          <div class="confetti" style="left: 85%; background: #00e5ff; --fall-duration: 4.5s; --sway-duration: 1.8s; animation-delay: -1s;"></div>
          <!-- Yellow -->
          <div class="confetti" style="left: 25%; background: #ffca28; --fall-duration: 4.2s; --sway-duration: 2.2s; animation-delay: -3s;"></div>
          <div class="confetti" style="left: 65%; background: #ffca28; --fall-duration: 4.8s; --sway-duration: 1.9s; animation-delay: -0.5s;"></div>
          <!-- Pink -->
          <div class="confetti" style="left: 15%; background: #e91e63; --fall-duration: 5.5s; --sway-duration: 2.4s; animation-delay: -1.5s;"></div>
          <div class="confetti" style="left: 75%; background: #e91e63; --fall-duration: 3.8s; --sway-duration: 2.1s; animation-delay: -2.5s;"></div>
          <!-- Purple -->
          <div class="confetti" style="left: 35%; background: #b39cff; --fall-duration: 4.6s; --sway-duration: 2.6s; animation-delay: -0.8s;"></div>
          <div class="confetti" style="left: 55%; background: #b39cff; --fall-duration: 5.2s; --sway-duration: 1.7s; animation-delay: -3.5s;"></div>
          <div class="confetti" style="left: 95%; background: #b39cff; --fall-duration: 4.1s; --sway-duration: 2.3s; animation-delay: -1.2s;"></div>
      </div>

      <!-- Main System Window -->
      <div class="system-window">
          <div class="glow-bar-top"></div>
          <div class="inner-box">
              <div class="corner tl"></div><div class="corner tr"></div>
              <div class="corner bl"></div><div class="corner br"></div>
              
              <div class="header">
                  <div class="icon-square">
                      <div class="icon-circle">!</div>
                  </div>
                  <div class="title">${title}</div>
              </div>

              <div class="message">
                  You have acquired the following rewards.
              </div>

              <div class="rewards">
                  <!-- EXP Section -->
                  <div class="reward-item">
                      <div class="icon-wrapper">
                          <div class="icon-container">
                              <img src="${expCrystalSource?.uri ?? ''}" class="reward-icon spin" alt="EXP" />
                          </div>
                      </div>
                      <div class="reward-amount">+ ${Number(expAmount).toLocaleString()}</div>
                      <div class="reward-label">EXP</div>
                  </div>

                  <!-- COIN Section -->
                  <div class="reward-item">
                      <div class="icon-wrapper delay">
                          <div class="icon-container coin">
                              <img src="${coinIconSource?.uri ?? ''}" class="reward-icon spin" alt="COINS" />
                          </div>
                      </div>
                      <div class="reward-amount">+ ${Number(coinsAmount).toLocaleString()}</div>
                      <div class="reward-label">COINS</div>
                  </div>
              </div>
          </div>
          <div class="glow-bar-bottom"></div>
      </div>
  </body>
  </html>
  `;

  return (
    <AnimatePresence>
      {visible && (
        <MotiView 
          from={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'timing', duration: 400 }}
          style={styles.overlay}
        >
          <View style={styles.container}>
            <WebView 
              source={{ html: getRewardHTML() }} 
              style={styles.webview}
              scrollEnabled={false}
              bounces={false}
              originWhitelist={['*']}
              containerStyle={{ backgroundColor: 'transparent' }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              onMessage={() => {}}
              scalesPageToFit={true}
              transparent={true}
              pointerEvents="none"
            />
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={onClose}
            />
          </View>
        </MotiView>
      )}
    </AnimatePresence>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  container: {
    flex: 1,
    backgroundColor: '#02040a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    width: SCREEN_WIDTH * 0.95,
    height: SCREEN_HEIGHT * 0.95,
    backgroundColor: 'transparent',
  },
});