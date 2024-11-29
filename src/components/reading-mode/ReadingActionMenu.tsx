import React, { useState } from 'react';
import { Box, Fab, Collapse, Stack } from '@mui/material';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import NotesIcon from '@mui/icons-material/Notes';
import { useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import TranslateIcon from '@mui/icons-material/Translate';
import FormatLineSpacingIcon from '@mui/icons-material/FormatLineSpacing';

interface ReadingActionMenuProps {
  onRandomArticle: () => void;
  onTakeNotes: () => void;
  onFullscreen: () => void;
  isFullscreen: boolean;
  onOpenTextSettings: () => void;
  onOpenDictionary: () => void;
}

export const ReadingActionMenu: React.FC<ReadingActionMenuProps> = ({
  onRandomArticle,
  onTakeNotes,
  onFullscreen,
  isFullscreen,
  onOpenTextSettings,
  onOpenDictionary
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
        bottom: theme.spacing(2),
        right: theme.spacing(2),
        zIndex: theme.zIndex.speedDial,
        display: { xs: 'block', sm: 'none' }, 
        '& .MuiFab-root': {
          margin: theme.spacing(1), 
          transition: 'all 0.2s ease'  
        }
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <Stack 
            spacing={1.5} 
            sx={{ 
              position: 'absolute',
              bottom: '100%',
              right: 0,
              pb: 1,
              alignItems: 'flex-end', 
              minWidth: 56 
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
              sx={{ 
                width: 48, 
                height: 48,
                boxShadow: theme => `0 4px 12px ${theme.palette.primary.main}40`
              }}
            >
              <ShuffleIcon />
            </Fab>
            <Fab
              size="medium"
              color="primary"
              onClick={() => {
                onFullscreen();
                setIsOpen(false);
              }}
              component={motion.button}
              variants={buttonVariants}
              sx={{ 
                width: 48, 
                height: 48,
                boxShadow: theme => `0 4px 12px ${theme.palette.primary.main}40`
              }}
            >
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </Fab>
            <Fab
              size="medium"
              color="primary" 
              onClick={() => {
                onOpenTextSettings();
                setIsOpen(false);
              }}
              component={motion.button}
              variants={buttonVariants}
              sx={{ 
                width: 48, 
                height: 48,
                boxShadow: theme => `0 4px 12px ${theme.palette.primary.main}40`
              }}
            >
              <TextFieldsIcon />
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
              sx={{ 
                width: 48, 
                height: 48,
                boxShadow: theme => `0 4px 12px ${theme.palette.primary.main}40`
              }}
            >
              <NotesIcon />
            </Fab>
            <Fab
              size="medium"
              color="primary"
              onClick={() => {
                onOpenDictionary();
                setIsOpen(false);
              }}
              component={motion.button}
              variants={buttonVariants}
              sx={{ 
                width: 48, 
                height: 48,
                boxShadow: theme => `0 4px 12px ${theme.palette.primary.main}40`
              }}
            >
              <TranslateIcon />
            </Fab>
          </Stack>
        )}
      </AnimatePresence>
      <Fab
        size="large"
        color="primary"
        onClick={toggleMenu}
        sx={{
          width: 56,
          height: 56,
          boxShadow: theme => `0 8px 24px ${theme.palette.primary.main}40`,
          '&:active': {
            transform: 'scale(0.95)'
          },
          transition: 'transform 0.2s ease'
        }}
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </Fab>
    </Box>
  );
};