import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Box,
  Drawer, List, ListItemIcon, ListItemText, useTheme, useMediaQuery,
  Avatar, Divider, ListItemButton,
  MenuItem,
  Menu,
  Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import HomeIcon from '@mui/icons-material/Home';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EventNoteIcon from '@mui/icons-material/EventNote';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { FocusMode } from './gamification/FocusMode';
import { useFocusMode } from '../context/FocusModeContext';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useSettings } from '../context/SettingsContext';

interface NavBarProps {
  focusMode: boolean;
  onFocusChange: (active: boolean) => void;
}

export const NavBar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { levelSystem } = useGamification();
  const { focusMode, toggleFocusMode } = useFocusMode();
  const { theme: currentTheme, toggleTheme } = useSettings();

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Study', icon: <SchoolIcon />, path: '/study' },
    { text: 'Worksheets', icon: <AssignmentIcon />, path: '/worksheets' },
    { text: 'Import', icon: <CloudUploadIcon />, path: '/import' },
    { text: 'Diary', icon: <EventNoteIcon />, path: '/diary' },
  ];

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSettingsClick = () => {
    handleMenuClose();
    navigate('/settings');
  };

  const handleProfileClick = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleLogout = () => {
    handleMenuClose();
    signOut();
  };

  const renderMobileNav = () => (
    <Drawer
      variant="temporary"
      anchor="left"
      open={mobileOpen}
      onClose={() => setMobileOpen(false)}
      ModalProps={{ keepMounted: true }}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 280 },
          boxSizing: 'border-box',
          height: '100%',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: 'primary.main' }}>
          {user?.email?.[0]?.toUpperCase() || 'G'}
        </Avatar>
        <Typography variant="subtitle1" noWrap>
          {user?.displayName || user?.email || 'Guest'}
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
            selected={location.pathname === item.path}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        ))}
        <ListItemButton onClick={toggleTheme}>
          <ListItemIcon>
            {currentTheme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </ListItemIcon>
          <ListItemText primary="Toggle Theme" />
        </ListItemButton>
        {user && (
          <>
            <Divider />
            <ListItemButton onClick={signOut}>
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </>
        )}
      </List>
    </Drawer>
  );

  const renderDesktopMenu = (
    <>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1,
            minWidth: 200,
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1
            }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleProfileClick}>
          <ListItemIcon>
            <Avatar sx={{ width: 24, height: 24 }}>
              {user?.email?.[0]?.toUpperCase() || 'G'}
            </Avatar>
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleSettingsClick}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );

  return (
    <>
      <AppBar 
        position="fixed" 
        elevation={1}
        sx={{
          transition: 'background-color 0.3s ease',
          bgcolor: focusMode ? 'background.paper' : 'primary.main'
        }}
      >
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              cursor: 'pointer'
            }}
            onClick={() => navigate('/')}
          >
            FlashCards AI
          </Typography>

          {!isMobile && levelSystem && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mr: 2,
              gap: 1 
            }}>
              <EmojiEventsIcon color="inherit" />
              <Typography variant="body1">
                Level {levelSystem.currentLevel}
              </Typography>
            </Box>
          )}

          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <FocusMode 
                active={focusMode} 
                onChange={toggleFocusMode} 
              />
              {menuItems.map((item) => (
                <Button
                  key={item.text}
                  color={location.pathname === item.path ? 'secondary' : 'inherit'}
                  onClick={() => navigate(item.path)}
                  startIcon={item.icon}
                  sx={{
                    borderRadius: 2,
                    ...(location.pathname === item.path && {
                      bgcolor: 'rgba(255, 255, 255, 0.12)',
                    })
                  }}
                >
                  {item.text}
                </Button>
              ))}
              <IconButton color="inherit" onClick={toggleTheme}>
                {currentTheme === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
              {user && (
                <>
                  <Divider orientation="vertical" flexItem sx={{ mx: 1, bgcolor: 'rgba(255, 255, 255, 0.12)' }} />
                  <IconButton
                    onClick={handleMenuOpen}
                    size="small"
                    sx={{ ml: 2 }}
                  >
                    <Avatar 
                      sx={{ 
                        bgcolor: 'secondary.main',
                        width: 32,
                        height: 32,
                        cursor: 'pointer'
                      }}
                    >
                      {user.email?.[0]?.toUpperCase() || 'G'}
                    </Avatar>
                  </IconButton>
                </>
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>
      {renderDesktopMenu}
      {renderMobileNav()}
      <Toolbar /> 
    </>
  );
};
