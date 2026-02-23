'use client';

import { DotLottieReact } from '@lottiefiles/dotlottie-react';

interface LottieAnimationProps {
  className?: string;
  loop?: boolean;
  autoplay?: boolean;
  speed?: number;
}

export default function LottieAnimation({
  className = 'w-64 h-64',
  loop = true,
  autoplay = true,
  speed = 1.0
}: LottieAnimationProps) {
  return (
    <div className={className}>
      <DotLottieReact
        src="/shopinnkeeper.lottie"
        loop={loop}
        autoplay={autoplay}
        speed={speed}
      />
    </div>
  );
}
