import React from 'react';
import { Box, Typography, Paper, Grid, CircularProgress, Tooltip } from '@mui/material';
import type { UserAchievement } from '../../types/gamification';
import { useI18n } from '../../i18n/I18nContext';

interface Props {
  achievements: UserAchievement[];
}

export const Achievements: React.FC<Props> = ({ achievements }) => {
  const { t } = useI18n();

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('profile.achievements')}
      </Typography>
      <Grid container spacing={2}>
        {achievements.map(achievement => (
          <Grid item xs={12} sm={6} md={4} key={achievement.id}>
            <Paper sx={{
              p: 2,
              opacity: achievement.achieved ? 1 : 0.7,
              transition: 'all 0.2s',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ position: 'relative' }}>
                  <CircularProgress
                    variant="determinate"
                    value={(achievement.progress / achievement.requirement) * 100}
                    size={56}
                    thickness={4}
                    sx={{
                      color: theme => 
                        achievement.achieved ? 
                        theme.palette.success.main : 
                        theme.palette.primary.main
                    }}
                  />
                  <Box sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {achievement.icon}
                  </Box>
                </Box>
                <Box>
                  <Typography variant="subtitle1">{achievement.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {achievement.progress} / {achievement.requirement}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t(`profile.achievements.progress.${achievement.progress}.${achievement.requirement}`)}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};