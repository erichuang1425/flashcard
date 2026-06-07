import React from 'react';
import { IconButton, Tooltip, CircularProgress, Box } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { usePronunciation } from '../context/PronunciationContext';

interface PronunciationButtonProps {
  /** Word or phrase to pronounce. */
  text: string;
  /** MUI IconButton size. */
  size?: 'small' | 'medium' | 'large';
}

/**
 * A speaker button that pronounces `text` using the user's chosen voice.
 * Renders nothing when the browser has no speech support, so callers can drop
 * it in unconditionally.
 */
export const PronunciationButton: React.FC<PronunciationButtonProps> = ({
  text,
  size = 'medium',
}) => {
  const { supported, speak, stop, speaking } = usePronunciation();

  if (!supported) return null;

  const handleClick = (e: React.MouseEvent) => {
    // Avoid triggering card-flip / parent click handlers.
    e.stopPropagation();
    if (speaking) {
      stop();
    } else {
      speak(text);
    }
  };

  return (
    <Tooltip title={speaking ? 'Stop' : 'Pronounce'} arrow>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <IconButton
          onClick={handleClick}
          color="primary"
          size={size}
          aria-label={`Pronounce ${text}`}
        >
          <VolumeUpIcon fontSize={size === 'large' ? 'large' : 'inherit'} />
        </IconButton>
        {speaking && (
          <CircularProgress
            size={size === 'large' ? 48 : 36}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              mt: size === 'large' ? '-24px' : '-18px',
              ml: size === 'large' ? '-24px' : '-18px',
              pointerEvents: 'none',
            }}
          />
        )}
      </Box>
    </Tooltip>
  );
};
