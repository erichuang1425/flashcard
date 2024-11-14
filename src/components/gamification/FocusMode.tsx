import React from 'react';
import { Box, IconButton, Tooltip, Fade } from '@mui/material';
import FocusIcon from '@mui/icons-material/CenterFocusStrong';
import BlurIcon from '@mui/icons-material/CenterFocusWeak';

interface Props {
  active: boolean;
  onChange: (active: boolean) => void;
}

export const FocusMode: React.FC<Props> = ({ active, onChange }) => {
  const shortcutKey = navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl';
  
  return (
    <Tooltip 
      title={`${active ? "Exit" : "Enter"} Focus Mode (${shortcutKey}+Shift+F)`}
      placement="bottom"
      arrow
    >
      <IconButton
        onClick={() => onChange(!active)}
        color={active ? "primary" : "inherit"}
        sx={{
          bgcolor: active ? 'primary.main' : 'transparent',
          color: active ? 'white' : 'inherit',
          '&:hover': {
            bgcolor: active ? 'primary.dark' : 'action.hover',
          }
        }}
      >
        {active ? <BlurIcon /> : <FocusIcon />}
      </IconButton>
    </Tooltip>
  );
};