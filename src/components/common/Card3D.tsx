
import React from 'react';
import { Paper, Box, PaperProps } from '@mui/material';
import { styled } from '@mui/material/styles';

interface Card3DProps extends PaperProps {
  depth?: number;
  hover?: boolean;
}

const StyledPaper = styled(Paper)<Card3DProps>(({ theme, depth = 1, hover = true }) => ({
  position: 'relative',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'perspective(1000px) rotateX(0) rotateY(0)',
  transformStyle: 'preserve-3d',
  ...(hover && {
    '&:hover': {
      transform: 'perspective(1000px) rotateX(2deg) rotateY(2deg) translateY(-5px)',
      '&::before': {
        opacity: 1,
        transform: 'translateZ(-100px)',
      }
    }
  }),
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: `-${depth * 2}px`,
    background: theme.palette.background.paper,
    transform: 'translateZ(-50px)',
    opacity: 0.5,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: theme.shadows[depth],
    zIndex: -1,
  }
}));

export const Card3D = (props: Card3DProps) => {
  const { children, ...other } = props;
  return <StyledPaper {...other}>{children}</StyledPaper>;
};