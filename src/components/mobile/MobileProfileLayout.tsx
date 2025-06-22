import React from 'react';
import { Box, Paper, Typography, Avatar, LinearProgress, Tabs, Tab } from '@mui/material';
import { Card3D } from '../common/Card3D';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      sx={{ 
        height: '100%',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
      {...other}
    >
      {value === index && children}
    </Box>
  );
}

interface MobileProfileLayoutProps {
  user: any;
  levelSystem: any;
  children: React.ReactNode[];
  activeTab: number;
  onChangeTab: (index: number) => void;
  t: (key: string) => string;
}

export const MobileProfileLayout: React.FC<MobileProfileLayoutProps> = ({
  user,
  levelSystem,
  children,
  activeTab,
  onChangeTab,
  t
}) => {
  const progress = (levelSystem.currentXP / levelSystem.requiredXP) * 100;
  
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    onChangeTab(newValue);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Box sx={{
        height: '30vh',
        position: 'relative',
        zIndex: 1
      }}>
        <Card3D depth={2}>
          <Box sx={{ 
            p: '4vw',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Avatar
              sx={{ 
                width: '15vw',
                height: '15vw',
                maxWidth: '80px',
                maxHeight: '80px',
                mb: '2vw'
              }}
              src={user.photoURL || undefined}
            />
            <Typography variant="h6" sx={{
              fontSize: 'clamp(1rem, 4vw, 1.5rem)',
              mb: '1vw'
            }}>
              {user.displayName || 'User'}
            </Typography>
            
            <Box sx={{ width: '100%', mt: '3vw' }}>
              <Typography sx={{ fontSize: 'clamp(0.875rem, 3vw, 1rem)' }}>
                {t('profile.level')} {levelSystem.currentLevel}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ 
                  height: '2vw',
                  maxHeight: '8px',
                  borderRadius: '1vw',
                  mt: '2vw'
                }}
              />
              <Typography variant="caption" sx={{ 
                mt: '1vw',
                display: 'block',
                fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)'
              }}>
                {levelSystem.currentXP} / {levelSystem.requiredXP} {t('profile.xp')}
              </Typography>
            </Box>
          </Box>
        </Card3D>
      </Box>

      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        zIndex: 0
      }}>
        <Tabs
          value={activeTab}
          onChange={handleChange}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              fontSize: 'clamp(0.75rem, 3vw, 0.875rem)',
              minHeight: '12vw',
              maxHeight: '48px'
            }
          }}
        >
          <Tab label={t('profile.overview')} />
          <Tab label={t('profile.patterns')} />
          <Tab label={t('profile.categories')} />
          <Tab label={t('profile.achievements')} />
        </Tabs>

        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          {React.Children.map(children, (child, index) => (
            <TabPanel value={activeTab} index={index}>
              {child}
            </TabPanel>
          ))}
        </Box>
      </Box>
    </Box>
  );
};