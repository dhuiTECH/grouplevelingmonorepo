import React, { useState, useEffect, useRef } from 'react';
import { Text, TextProps } from 'react-native';

interface Props extends TextProps {
  text: string;
  speed?: number; // Speed in ms per character
  onComplete?: () => void;
  /**
   * When true, instantly reveal the full text and call onComplete.
   * Useful for \"tap to skip\" behavior in dialogs.
   */
  skip?: boolean;
}

export default function TypewriterText({
  text,
  speed = 30,
  onComplete,
  skip = false,
  style,
  ...props
}: Props) {
  const [displayedText, setDisplayedText] = useState('');
  const index = useRef(0);
  const timer = useRef<NodeJS.Timeout>();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Reset any existing animation
    if (timer.current) clearInterval(timer.current);

    // If skipping, immediately reveal all text and fire completion callback
    if (skip) {
      setDisplayedText(text);
      index.current = text.length;
      onCompleteRef.current?.();
      return;
    }

    setDisplayedText('');
    index.current = 0;

    timer.current = setInterval(() => {
      if (index.current < text.length) {
        index.current++;
        setDisplayedText(text.substring(0, index.current));
      } else {
        if (timer.current) clearInterval(timer.current);
        onCompleteRef.current?.();
      }
    }, speed);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [text, speed, skip]);

  return <Text style={style} {...props}>{displayedText}</Text>;
}
