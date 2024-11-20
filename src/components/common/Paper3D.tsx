
import React from 'react';
import { Paper, PaperProps } from '@mui/material';
import { motion } from 'framer-motion';

interface Paper3DProps extends PaperProps {
  children: React.ReactNode;
}

export const Paper3D: React.FC<Paper3DProps> = ({ children, ...props }) => {
  return (
    <Paper
      {...props}
      sx={{
        position: 'relative',
        transformStyle: 'preserve-3d',
        transform: 'rotateX(2deg)',
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          borderRadius: 'inherit',
          transition: 'all 0.3s ease',
        },
        '&::before': {
          inset: 0,
          background: 'inherit',
          transform: 'translateZ(-1px)',
          filter: 'blur(10px)',
          opacity: 0.5,
        },
        '&::after': {
          inset: 0,
          background: 'inherit',
          transform: 'translateZ(-2px)',
          filter: 'blur(20px)',
          opacity: 0.3,
        },
        '&:hover': {
          transform: 'rotateX(0deg) translateY(-4px)',
          '&::before': {
            transform: 'translateZ(-2px)',
          },
          '&::after': {
            transform: 'translateZ(-4px)',
          },
        },
        ...props.sx
      }}
    >
      {children}
    </Paper>
  );
};