
import React from 'react';
import { Snackbar, Alert, Box, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

interface Props {
  xp: number;
  open: boolean;
  onClose: () => void;
}

export const XPNotification: React.FC<Props> = ({ xp, open, onClose }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={2000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        icon={<EmojiEventsIcon />}
        severity="success"
        sx={{ width: '100%', bgcolor: 'primary.main', color: 'white' }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            +{xp} XP
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
};