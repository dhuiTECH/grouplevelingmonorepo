import * as React from 'react';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      pixiContainer: any;
      pixiSprite: any;
      pixiGraphics: any;
    }
  }
}

// For React 18+ / Next.js
declare namespace React {
  namespace JSX {
    interface IntrinsicElements {
      pixiContainer: any;
      pixiSprite: any;
      pixiGraphics: any;
    }
  }
}
