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
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import StyleIcon from '@mui/icons-material/Style'; // Add this import at the top with other imports
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { FocusMode } from './gamification/FocusMode';
import { useFocusMode } from '../context/FocusModeContext';
import {useI18n} from '../i18n/I18nContext';
import { useReadingMode } from '../context/ReadingModeContext';

interface NavBarProps {
  focusMode: boolean;
  onFocusChange: (active: boolean) => void;
  onTogglePanel: () => void;
  showGamePanel: boolean;
}

export const NavBar: React.FC<NavBarProps> = ({ onTogglePanel, showGamePanel, focusMode, onFocusChange }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { levelSystem } = useGamification();
  const { t } = useI18n();
  const { isReadingMode } = useReadingMode();

  // Replace isReadingMode with path-based detection
  const isReadingPage = location.pathname === '/reading';

  const menuItems = [
    { text: t('navigation.menu.home'), icon: <HomeIcon />, path: '/' },
    { text: t('navigation.menu.study'), icon: <SchoolIcon />, path: '/study' },
    { text: t('navigation.menu.library'), icon: <StyleIcon />, path: '/flashcards' }, // Changed from LibraryBooksIcon to StyleIcon
    { text: t('navigation.menu.worksheets'), icon: <AssignmentIcon />, path: '/worksheets' },
    { text: t('navigation.menu.import'), icon: <CloudUploadIcon />, path: '/import' },
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

  // touchstart handler for mobile devices
  const handleMobileMenuClick = (event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
    event.preventDefault(); // prevent default to avoid double triggers
    if (isMobile) {
      setMobileOpen(true);
    } else {
      handleMenuOpen(event as React.MouseEvent<HTMLElement>);
    }
  };

  return (
    <>
      <AppBar 
        position="fixed" 
        elevation={1}
        sx={{
          transition: 'background-color 0.3s ease',
          bgcolor: isReadingPage  // Updated here
            ? 'rgba(45, 45, 45, 0.95)' // Elegant dark grey for reading mode
            : focusMode 
              ? 'background.paper' 
              : 'primary.main',
          backdropFilter: isReadingPage ? 'blur(8px)' : 'none', // Updated here
          '& .MuiToolbar-root': {
            color: isReadingPage ? 'grey.100' : 'inherit'  // Updated here
          },
          '& .MuiButton-root': {
            color: isReadingPage ? 'grey.100' : 'inherit',
            '&:hover': {
              backgroundColor: isReadingPage 
                ? 'rgba(255, 255, 255, 0.08)'
                : 'rgba(255, 255, 255, 0.12)'
            }
          },
          '& .MuiIconButton-root': {
            color: isReadingPage ? 'grey.100' : 'inherit'
          },
          boxShadow: isReadingPage ? 'none' : undefined
        }}
      >
        <Toolbar>
          {isMobile ? (
            <>
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setMobileOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Typography 
                variant="h6" 
                component="div" 
                sx={{ flexGrow: 1 }}
                onClick={() => navigate('/')}
              >
                {t('navigation.appName')}
              </Typography>
              <IconButton
                onClick={handleMobileMenuClick}
                color="inherit"
                sx={{ ml: 1 }}
              >
                <Avatar sx={{ width: 32, height: 32 }}>
                  {user?.email?.[0]?.toUpperCase() || 'G'}
                </Avatar>
              </IconButton>
            </>
          ) : (
            <>
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
                {t('navigation.appName')}
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
                    {t('navigation.level')} {levelSystem.currentLevel}
                  </Typography>
                </Box>
              )}

              {!isMobile && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <FocusMode 
                    active={focusMode} 
                    onChange={onFocusChange} 
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
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer with enhanced menu items */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '85%', sm: 280 },
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ width: 40, height: 40 }}>
            {user?.email?.[0]?.toUpperCase() || 'G'}
          </Avatar>
          <Box>
            <Typography variant="subtitle1">{user?.email}</Typography>
            {levelSystem && (
              <Typography variant="caption" color="text.secondary">
                {t('navigation.level')} {levelSystem.currentLevel}
              </Typography>
            )}
          </Box>
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
          <ListItemButton
            onClick={() => {
              navigate('/profile');
              setMobileOpen(false);
            }}
          >
            <ListItemIcon><AccountCircleIcon /></ListItemIcon>
            <ListItemText primary={t('navigation.menu.profile')} />
          </ListItemButton>
          <ListItemButton
            onClick={() => {
              navigate('/settings');
              setMobileOpen(false);
            }}
          >
            <ListItemIcon><SettingsIcon /></ListItemIcon>
            <ListItemText primary={t('navigation.menu.settings')} />
          </ListItemButton>
          <ListItemButton onClick={signOut}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary={t('navigation.menu.logout')} />
          </ListItemButton>
        </List>
      </Drawer>

      {/* Profile Menu (for both mobile and desktop) */}
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
          {t('navigation.menu.profile')}
        </MenuItem>
        <MenuItem onClick={handleSettingsClick}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          {t('navigation.menu.settings')}
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          {t('navigation.menu.logout')}
        </MenuItem>
      </Menu>
      <Toolbar /> 
    </>
  );
};
