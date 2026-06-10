import React from 'react';
import { Box, IconButton, Tooltip, Fade } from '@mui/material';
import FocusIcon from '@mui/icons-material/CenterFocusStrong';
import BlurIcon from '@mui/icons-material/CenterFocusWeak';
import { useLanguage } from '../../i18n/LanguageContext';

interface Props {
  active: boolean;
  onChange: (active: boolean) => void;
}

export const FocusMode: React.FC<Props> = ({ active, onChange }) => {
  const { t } = useLanguage();
  const shortcutKey = navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl';
  
  return (
    <Tooltip 
      title={t(active ? 'focusMode.exit' : 'focusMode.enter', { shortcut: shortcutKey })}
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
