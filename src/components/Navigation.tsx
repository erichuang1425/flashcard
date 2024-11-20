import React from 'react';
import { AppBar, Toolbar, IconButton, Typography, Box } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useI18n } from '../i18n/I18nContext';
import { useReadingMode } from '../context/ReadingModeContext';
import MenuBookIcon from '@mui/icons-material/MenuBook';

export const Navigation: React.FC = () => {
  const { t } = useI18n();
  const { isReadingMode, setReadingMode } = useReadingMode();

  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <IconButton edge="start" color="inherit">
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          {t('app.title')}
        </Typography>
        <IconButton 
          color="inherit"
          onClick={() => setReadingMode(!isReadingMode)}
          sx={{ ml: 1 }}
          title={isReadingMode ? "Exit Reading Mode" : "Enter Reading Mode"}
        >
          <MenuBookIcon />
        </IconButton>
        <IconButton color="inherit">
          <AccountCircleIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );
};