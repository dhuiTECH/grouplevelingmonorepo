"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function DownloadStoreButtons() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 w-full mt-10">
      <div className="flex items-center gap-4 flex-1 max-w-[340px] md:max-w-none md:flex-initial">
        {/* App Store Button */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="relative overflow-hidden group grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all duration-300 transform w-[160px]"
        >
          <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 flex items-center gap-2 h-14 relative shadow-lg hover:border-cyan-400/50">
            <div className="w-6 h-6 relative shrink-0">
              <Image
                src="/website/applelogo.png"
                alt="Download Group Leveling RPG Fitness App on App Store"
                fill
                className="object-contain"
              />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[8px] text-gray-400 uppercase font-bold tracking-tight">
                Download on the
              </span>
              <span className="text-sm font-black text-white tracking-tight">
                App Store
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
              <span className="text-white font-black text-[8px] uppercase tracking-widest border border-white/30 bg-black/60 px-2 py-0.5 -rotate-3">
                COMING SOON
              </span>
            </div>
          </div>
        </motion.div>

        {/* Play Store Button */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="relative overflow-hidden group grayscale opacity-70 hover:opacity-100 hover:grayscale-0 transition-all duration-300 transform w-[160px]"
        >
          <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 flex items-center gap-2 h-14 relative shadow-lg hover:border-green-400/50">
            <div className="w-6 h-6 relative shrink-0">
              <Image
                src="/website/playstorelogo.png"
                alt="Download Group Leveling RPG Fitness App on Google Play"
                fill
                className="object-contain"
              />
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-[8px] text-gray-400 uppercase font-bold tracking-tight">
                GET IT ON
              </span>
              <span className="text-sm font-black text-white tracking-tight">
                Google Play
              </span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
              <span className="text-white font-black text-[8px] uppercase tracking-widest border border-white/30 bg-black/60 px-2 py-0.5 -rotate-3">
                COMING SOON
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
