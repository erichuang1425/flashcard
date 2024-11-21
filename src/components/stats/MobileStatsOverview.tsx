
import React from 'react';
import { Box, Typography, Stack, IconButton, Paper, useTheme } from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { useI18n } from '../../i18n/I18nContext';
import { motion } from 'framer-motion';

interface MobileStatsOverviewProps {
  stats: {
    mastered: number;
    dueToday: number;
    total: number;
  };
  onAction: (type: 'study' | 'reading' | 'import') => void;
}

export const MobileStatsOverview: React.FC<MobileStatsOverviewProps> = ({ stats, onAction }) => {
  const { t } = useI18n();
  const theme = useTheme();

  const actions = [
    {
      type: 'study' as const,
      icon: <SchoolIcon />,
      label: t('home.buttons.startReview'),
      color: theme.palette.primary.main,
      disabled: stats.dueToday === 0,
      highlight: stats.dueToday > 0
    },
    {
      type: 'reading' as const,
      icon: <MenuBookIcon />,
      label: t('home.buttons.startReading'),
      color: theme.palette.secondary.main
    },
    {
      type: 'import' as const,
      icon: <LibraryBooksIcon />,
      label: t('home.buttons.addNewCards'),
      color: theme.palette.success.main
    }
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Stack spacing={2}>
        {/* Stats Row */}
        <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.paper' }}>
          <Stack direction="row" spacing={2} justifyContent="space-between">
            <Box flex={1} textAlign="center">
              <Typography variant="h4" color="primary" fontWeight="bold">
                {stats.total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('home.stats.totalCards')}
              </Typography>
            </Box>
            <Box flex={1} textAlign="center">
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {stats.dueToday}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('home.stats.dueToday')}
              </Typography>
            </Box>
            <Box flex={1} textAlign="center">
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {stats.mastered}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('home.stats.mastered')}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {/* Action Buttons */}
        <Stack direction="row" spacing={2} justifyContent="space-between">
          {actions.map((action) => (
            <Paper
              key={action.type}
              component={motion.div}
              whileTap={{ scale: 0.95 }}
              elevation={0}
              sx={{
                flex: 1,
                p: 2,
                textAlign: 'center',
                bgcolor: action.highlight ? `${action.color}15` : 'background.paper',
                borderRadius: 2,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                '&::after': action.highlight ? {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `${action.color}10`,
                  animation: 'pulse 2s infinite'
                } : {}
              }}
              onClick={() => onAction(action.type)}
            >
              <IconButton
                color="primary"
                disabled={action.disabled}
                sx={{
                  mb: 1,
                  color: action.color,
                  bgcolor: `${action.color}15`,
                  '&:hover': { bgcolor: `${action.color}25` }
                }}
              >
                {action.icon}
              </IconButton>
              <Typography variant="caption" display="block" color="text.secondary">
                {action.label}
              </Typography>
            </Paper>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
};