"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

export default function SpriteAnimation() {
  const [frame, setFrame] = useState(0);
  const [showBubble, setShowBubble] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Total frames: 9
  // Sheet: 2304x256
  // Aspect ratio: 9:1
  // Display size: 128x128 (scaled down)
  // Background width needed: 128 * 9 = 1152px
  
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 9);
    }, 100); // 10fps

    const bubbleTimeout = setTimeout(() => {
      setShowBubble(true);
    }, 1500); // Bubble appears after 1.5s

    return () => {
      clearInterval(interval);
      clearTimeout(bubbleTimeout);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
          transition={{ 
            type: "spring", 
            stiffness: 260, 
            damping: 20,
            duration: 0.6 
          }}
          className="relative flex flex-col items-center cursor-pointer z-50 pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
          }}
          role="button"
          aria-label="Click to close animation"
        >
          {/* Bubble */}
          <motion.div
            initial={{ opacity: 0, scale: 0, y: 10 }}
            animate={{ 
              opacity: showBubble ? 1 : 0, 
              scale: showBubble ? 1 : 0,
              y: showBubble ? 0 : 10
            }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="relative w-32 h-16 mb-[-25px] z-10"
          >
            <Image
              src="/website/text_bubble.png"
              alt="Hello!"
              fill
              className="object-contain"
            />
          </motion.div>

          {/* Cat Sprite */}
          <div
            className="w-32 h-32"
            role="img"
            aria-label="Group Leveling system pet mascot"
            style={{
              backgroundImage: "url('/website/azurecat_spritesheet.png')",
              backgroundRepeat: "no-repeat",
              backgroundSize: "1152px 128px", // 128 * 9 = 1152
              backgroundPosition: `-${frame * 128}px 0px`,
              imageRendering: "pixelated",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
