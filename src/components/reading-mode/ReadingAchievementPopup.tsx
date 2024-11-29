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
          overflow: 'visible',
          maxWidth: { xs: '90%', sm: '400px' }
        }
      }}
    >
      <DialogContent sx={{ p: 0, overflow: 'visible' }}>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
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
            textAlign: 'center',
            boxShadow: theme => `0 8px 32px ${theme.palette.success.main}30`,
            border: theme => `1px solid ${theme.palette.success.main}20`
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
                background: theme => `linear-gradient(45deg, ${theme.palette.success.main}, ${theme.palette.success.light})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 'bold'
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