import React from 'react';
import { Box, Typography, IconButton, useTheme, SxProps, Theme, Stack } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { useI18n } from '../../i18n/I18nContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

interface MobileStatsChartProps {
  stats: {
    dueToday: number;
    mastered: number;
    total: number;
  };
  sx?: SxProps<Theme>;  // Add sx prop support
}

export const MobileStatsChart: React.FC<MobileStatsChartProps> = ({ stats, sx }) => {
  const theme = useTheme();
  const { t } = useI18n();
  const navigate = useNavigate();

  const progressPercent = Math.round((stats.mastered / stats.total) * 100) || 0;
  const remainingPercent = Math.round((stats.dueToday / stats.total) * 100) || 0;

  const actions = [
    {
      icon: <SchoolIcon />,
      label: t('home.buttons.startReview'),
      onClick: () => navigate('/study'),
      color: theme.palette.primary.main,
      disabled: stats.dueToday === 0
    },
    {
      icon: <MenuBookIcon />,
      label: t('home.buttons.startReading'),
      onClick: () => navigate('/reading'),
      color: theme.palette.secondary.main,
    },
    {
      icon: <LibraryBooksIcon />,
      label: t('home.buttons.addNewCards'),
      onClick: () => navigate('/import'),
      color: theme.palette.success.main,
    }
  ];

  return (
    <Box sx={{ 
      position: 'relative',
      width: '100%',
      pb: '100%',
      mb: 3,
      ...sx
    }}>
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Box sx={{ 
          width: '100%',
          height: '100%',
          position: 'relative'
        }}>
          {/* Main circular progress */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            sx={{
              position: 'absolute',
              inset: 0,
              m: 'auto',
              width: '80%',
              height: '80%',
              borderRadius: '50%',
              background: theme => `
                radial-gradient(
                  circle at center,
                  ${theme.palette.background.paper} 55%,
                  transparent 56%
                ),
                conic-gradient(
                  from 0deg,
                  ${theme.palette.primary.main} ${progressPercent}%,
                  ${theme.palette.warning.main} ${progressPercent}% ${progressPercent + remainingPercent}%,
                  ${theme.palette.grey[300]} ${progressPercent + remainingPercent}% 100%
                )
              `,
              boxShadow: theme => `0 0 30px ${theme.palette.primary.main}25`,
              transition: 'all 0.3s ease'
            }}
          />

          {/* Center stats */}
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <Typography variant="h4" color="primary" fontWeight="bold">
              {stats.total}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('home.stats.totalCards')}
            </Typography>
          </Box>

          {/* Action buttons */}
          {actions.map((action, index) => {
            const angle = (index * 2 * Math.PI) / 3 - Math.PI / 2;
            const x = Math.cos(angle) * 42;
            const y = Math.sin(angle) * 42;
            
            return (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                style={{
                  position: 'absolute',
                  left: `${50 + x}%`,
                  top: `${50 + y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <IconButton
                  onClick={action.onClick}
                  disabled={action.disabled}
                  sx={{
                    bgcolor: action.color + '20',
                    color: action.color,
                    p: 2,
                    '&:hover': {
                      bgcolor: action.color + '30'
                    },
                    boxShadow: `0 4px 12px ${action.color}40`,
                    transition: 'all 0.2s'
                  }}
                >
                  {action.icon}
                </IconButton>
              </motion.div>
            );
          })}

          {/* Progress legends */}
          <Stack
            spacing={1}
            sx={{
              position: 'absolute',
              bottom: '-20%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%'
            }}
          >
            <Typography variant="caption" align="center" color="text.secondary">
              {progressPercent}% {t('home.stats.mastered')} • {remainingPercent}% {t('home.stats.dueToday')}
            </Typography>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};