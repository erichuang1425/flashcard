
import React, { useEffect, useState } from 'react';
import { Typography, TypographyProps } from '@mui/material';

interface AnimatedCounterProps extends TypographyProps {
  end: number;
  duration?: number;
  decimals?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ 
  end, 
  duration = 1000,
  decimals = 0,
  ...props 
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number;
    const startValue = 0;
    
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = timestamp - startTimestamp;
      
      const current = Math.min(
        (progress / duration) * end,
        end
      );
      
      setCount(current);
      
      if (progress < duration) {
        window.requestAnimationFrame(step);
      }
    };
    
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return (
    <Typography {...props}>
      {count.toFixed(decimals)}
    </Typography>
  );
};