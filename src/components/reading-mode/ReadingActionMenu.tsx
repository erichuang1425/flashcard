import React, { useState } from 'react';
import { Box, Fab, Collapse, Stack } from '@mui/material';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import NotesIcon from '@mui/icons-material/Notes';
import { useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

interface ReadingActionMenuProps {
  onRandomArticle: () => void;
  onTakeNotes: () => void;
}

export const ReadingActionMenu: React.FC<ReadingActionMenuProps> = ({
  onRandomArticle,
  onTakeNotes
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  const toggleMenu = () => setIsOpen(!isOpen);

  const buttonVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: theme.spacing(2), // Reduced spacing on mobile
        right: theme.spacing(2),
        zIndex: theme.zIndex.speedDial,
        display: { xs: 'block', sm: 'none' } // Only show on mobile
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <Stack 
            spacing={1} 
            sx={{ 
              mb: 1,
              // Ensure menu opens upward from FAB
              position: 'absolute',
              bottom: '100%',
              right: 0,
              pb: 1
            }}
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Fab
              size="medium"
              color="primary"
              onClick={() => {
                onRandomArticle();
                setIsOpen(false);
              }}
              component={motion.button}
              variants={buttonVariants}
            >
              <ShuffleIcon />
            </Fab>
            <Fab
              size="medium"
              color="primary"
              onClick={() => {
                onTakeNotes();
                setIsOpen(false);
              }}
              component={motion.button}
              variants={buttonVariants}
            >
              <NotesIcon />
            </Fab>
          </Stack>
        )}
      </AnimatePresence>
      <Fab
        size="large" // Increased size for better touch target
        color="primary"
        onClick={toggleMenu}
        sx={{
          width: 56,
          height: 56,
          // Add some elevation and improved touch feedback
          boxShadow: theme => `0 8px 24px ${theme.palette.primary.main}40`,
          '&:active': {
            transform: 'scale(0.95)'
          }
        }}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </Fab>
    </Box>
  );
};