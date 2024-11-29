
import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  useTheme
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { useI18n } from '../../i18n/I18nContext';

interface MainDrawerProps {
  open: boolean;
  onClose: () => void;
  width?: number;
}

const menuItems = [
  { path: '/', label: 'home.title', icon: <HomeIcon /> },
  { path: '/study', label: 'study.title', icon: <SchoolIcon /> },
  { path: '/library', label: 'library.title', icon: <LibraryBooksIcon /> },
  { path: '/reading', label: 'reading.title', icon: <MenuBookIcon /> }
];

export const MainDrawer: React.FC<MainDrawerProps> = ({ 
  open, 
  onClose, 
  width = 240 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const theme = useTheme();

  const handleNavigation = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.background.paper
        }
      }}
    >
      <Box sx={{ overflow: 'auto', mt: 8 }}>
        <List>
          {menuItems.map(({ path, label, icon }) => (
            <ListItem key={path} disablePadding>
              <ListItemButton
                selected={location.pathname === path}
                onClick={() => handleNavigation(path)}
                sx={{
                  py: 2,
                  '&.Mui-selected': {
                    bgcolor: theme => `${theme.palette.primary.main}15`
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: location.pathname === path 
                    ? 'primary.main' 
                    : 'text.secondary' 
                }}>
                  {icon}
                </ListItemIcon>
                <ListItemText primary={t(label)} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};