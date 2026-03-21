"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export default function FeatureCard({
  imageSrc,
  title,
  description,
  delay,
}: {
  imageSrc: string;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="flex h-full origin-center scale-[1.02] flex-col items-center"
    >
      <div className="relative mb-4 h-40 w-full flex-shrink-0 transition-transform duration-300 hover:scale-[1.02] sm:h-44 md:h-52">
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="object-contain drop-shadow-sm"
        />
      </div>

      <div className="flex flex-grow flex-col justify-start px-2 text-center">
        <h3
          className="mb-2 flex min-h-[3rem] items-center justify-center bg-gradient-to-r from-cyan-300 via-blue-400 to-cyan-300 bg-clip-text text-lg font-black uppercase italic tracking-widest text-transparent md:text-xl"
          style={{ textShadow: "0 0 20px rgba(6,182,212,0.5)" }}
        >
          {title}
        </h3>
        <p className="text-sm font-semibold leading-snug text-slate-300 md:text-base">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
