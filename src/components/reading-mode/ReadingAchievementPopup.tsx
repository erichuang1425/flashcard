
import React from 'react';
import {
  Dialog,
  DialogContent,
  Typography,
  IconButton,
  Box,
  Fade,
  useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { motion } from 'framer-motion';

interface ReadingAchievementPopupProps {
  open: boolean;
  onClose: () => void;
  message: string;
}

export const ReadingAchievementPopup: React.FC<ReadingAchievementPopupProps> = ({
  open,
  onClose,
  message
}) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Fade}
      transitionDuration={700}
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundColor: 'transparent',
          boxShadow: 'none',
          overflow: 'visible'
        }
      }}
    >
      <DialogContent sx={{ p: 0, overflow: 'visible' }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20
          }}
        >
          <Box sx={{
            position: 'relative',
            bgcolor: 'background.paper',
            borderRadius: 3,
            p: 3,
            minWidth: 300,
            textAlign: 'center',
            boxShadow: theme => `0 8px 32px ${theme.palette.primary.main}30`
          }}>
            <IconButton
              onClick={onClose}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8
              }}
            >
              <CloseIcon />
            </IconButton>

            <motion.div
              initial={{ rotateZ: 0 }}
              animate={{ rotateZ: 360 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            >
              <EmojiEventsIcon
                sx={{
                  fontSize: '3rem',
                  color: 'primary.main',
                  mb: 2
                }}
              />
            </motion.div>

            <Typography
              variant="h6"
              gutterBottom
              sx={{
                background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Reading Achievement!
            </Typography>

            <Typography variant="body1">
              {message}
            </Typography>
          </Box>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};