import React from 'react';
import { Box, Container, Toolbar } from '@mui/material';
import { NavBar } from './NavBar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        height: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <NavBar />
      <Toolbar /> {/* Spacer for fixed navbar */}
      <Container
        maxWidth="lg"
        sx={{
          flex: 1,
          py: { xs: 2, sm: 3 },
          px: { xs: 2, sm: 3 },
          height: 'calc(100vh - 64px)', // Account for AppBar height
          overflowY: 'auto',
          scrollbarWidth: 'thin',
          scrollbarColor: theme => `${theme.palette.primary.main} transparent`,
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: theme => theme.palette.primary.main,
            borderRadius: '4px',
          },
        }}
      >
        {children}
      </Container>
    </Box>
  );
};
