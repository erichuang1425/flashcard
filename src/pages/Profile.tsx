import React, { useState, useEffect } from 'react';
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
  Chip,
  Tab,
  Tabs,
  CircularProgress
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useAuth } from '../context/AuthContext';
import { useGamification } from '../context/GamificationContext';
import { formatDistanceToNow } from 'date-fns';
import type { UserAchievement } from '../types/gamification';
import { PomodoroTimer } from '../components/PomodoroTimer';
import { getUserAnalytics } from '../services/analytics';
import { AnalyticsOverview } from '../components/analytics/AnalyticsOverview';
import { StudyPatterns } from '../components/analytics/StudyPatterns';
import { CategoryProgress } from '../components/analytics/CategoryProgress';
import type { StudyAnalytics } from '../types/analytics';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { levelSystem, achievements } = useGamification();
  const [analytics, setAnalytics] = useState<StudyAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user) return;
      try {
        const data = await getUserAnalytics(user.uid);
        setAnalytics(data);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [user]);

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
              {user.displayName || 'User'}
            </Typography>
            <Typography color="textSecondary" gutterBottom>
              {user.email}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6">Level {levelSystem.currentLevel}</Typography>
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

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              sx={{ mb: 2 }}
            >
              <Tab label="Overview" />
              <Tab label="Study Patterns" />
              <Tab label="Categories" />
              <Tab label="Achievements" />
            </Tabs>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {activeTab === 0 && analytics && (
                  <AnalyticsOverview analytics={analytics} />
                )}
                {activeTab === 1 && analytics && (
                  <StudyPatterns patterns={analytics.studyPatterns} />
                )}
                {activeTab === 2 && analytics && (
                  <CategoryProgress categories={analytics.categoryBreakdown} />
                )}
                {activeTab === 3 && (
                  <List>
                    {userAchievements.map(achievement => (
                      <ListItem key={achievement.id}>
                        <ListItemIcon>
                          <EmojiEventsIcon 
                            color={achievement.achieved ? 'primary' : 'disabled'} 
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={achievement.title}
                          secondary={
                            <>
                              {achievement.description}
                              <Typography variant="caption" display="block" color="text.secondary">
                                Progress: {achievement.progress} / {achievement.requirement}
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
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};
