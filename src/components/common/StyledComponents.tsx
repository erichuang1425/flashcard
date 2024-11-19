import { Box, Paper, styled } from '@mui/material';

export const FloatingBox = styled(Box)(({ theme }) => ({
  position: 'relative'
}));

export const GlassPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.shape.borderRadius * 2,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none'
}));

export const WavyDivider = styled(Box)(({ theme }) => ({
  height: '50px',
  background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 70%)',
  margin: '2rem 0'
}));