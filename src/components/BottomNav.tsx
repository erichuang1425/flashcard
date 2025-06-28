import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useNavigate, useLocation } from 'react-router-dom';
import { useFocusMode } from '../context/FocusModeContext';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { focusMode } = useFocusMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [value, setValue] = React.useState('/');

  React.useEffect(() => {
    if (location.pathname.startsWith('/study')) {
      setValue('/study');
    } else if (location.pathname.startsWith('/worksheets')) {
      setValue('/worksheets');
    } else if (location.pathname.startsWith('/import')) {
      setValue('/import');
    } else {
      setValue('/');
    }
  }, [location]);

  if (!isMobile || focusMode) return null;

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    setValue(newValue);
    navigate(newValue);
  };

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        borderTop: 1,
        borderColor: 'divider',
        zIndex: 1200,
      }}
      elevation={3}
    >
      <BottomNavigation value={value} onChange={handleChange} showLabels>
        <BottomNavigationAction label="Home" value="/" icon={<HomeIcon />} />
        <BottomNavigationAction label="Study" value="/study" icon={<SchoolIcon />} />
        <BottomNavigationAction label="Worksheets" value="/worksheets" icon={<AssignmentIcon />} />
        <BottomNavigationAction label="Import" value="/import" icon={<CloudUploadIcon />} />
      </BottomNavigation>
    </Paper>
  );
};
