import React from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Chip
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { formatDistanceToNow } from 'date-fns';
import type { UserAchievement } from '../types/gamification';
import { PomodoroTimer } from '../components/PomodoroTimer';
import { useLanguage } from '../i18n/LanguageContext';
import { translateOr } from '../i18n/fallback';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { levelSystem, achievements } = useGamification();
  const { t } = useLanguage();

  if (!user || !levelSystem) return null;

  const userAchievements = achievements as UserAchievement[];
  const progress = (levelSystem.currentXP / levelSystem.requiredXP) * 100;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Avatar
              sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
              src={user.photoURL || undefined}
            />
            <Typography variant="h5" gutterBottom>
              {user.displayName || t('common.user')}
            </Typography>
            <Typography color="textSecondary" gutterBottom>
              {user.email}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">
                {t('profile.level', { level: levelSystem.currentLevel })}
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{ height: 10, borderRadius: 5, mt: 1 }}
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                {levelSystem.currentXP} / {levelSystem.requiredXP} XP
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <PomodoroTimer />
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              {t('profile.achievements')}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {userAchievements.map(achievement => (
                <ListItem key={achievement.id}>
                  <ListItemIcon>
                    <EmojiEventsIcon 
                      color={achievement.achieved ? 'primary' : 'disabled'} 
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={translateOr(t, `achievement.${achievement.id}.title`, achievement.title)}
                    secondary={
                      <>
                        {translateOr(
                          t,
                          `achievement.${achievement.id}.description`,
                          achievement.description
                        )}
                        <Typography variant="caption" display="block" color="text.secondary">
                          {t('profile.progress', {
                            progress: achievement.progress,
                            requirement: achievement.requirement,
                          })}
                        </Typography>
                      </>
                    }
                  />
                  {achievement.achieved && (
                    <Chip 
                      label={`+${achievement.points} XP`}
                      color="primary"
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  )}
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
