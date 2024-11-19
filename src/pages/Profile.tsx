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
import { getUserAnalytics } from '../services/analytics';
import { AnalyticsOverview } from '../components/analytics/AnalyticsOverview';
import { StudyPatterns } from '../components/analytics/StudyPatterns';
import { CategoryProgress } from '../components/analytics/CategoryProgress';
import type { StudyAnalytics } from '../types/analytics';
import { useI18n } from '../i18n/I18nContext';
import { useTheme } from '@mui/material';
import { Card3D } from '../components/common/Card3D';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { levelSystem, achievements } = useGamification();
  const [analytics, setAnalytics] = useState<StudyAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();
  const theme = useTheme();

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user) return;
      try {
        const data = await getUserAnalytics(user.uid);
        console.log('Category data:', data.categoryBreakdown);
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

 
  const transformedCategories = analytics?.categoryBreakdown
    ?.filter(cat => cat.category) 
    .map(cat => ({
      name: cat.category,
      count: cat.count || 0,
      mastered: cat.mastered || 0
    }));

  console.log('Transformed Categories:', transformedCategories);

  const chartLabels = {
    studyTime: t('profile.graphs.studyTime'),
    cardsStudied: t('profile.graphs.cardsStudied'),
    accuracy: t('profile.graphs.accuracy'),
    daily: t('profile.graphs.daily'),
    weekly: t('profile.graphs.weekly'),
    monthly: t('profile.graphs.monthly')
  };

  return (
    <Container>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card3D depth={2}>
            <Box sx={{ p: 3 }}>
              <Paper sx={{ 
                p: 3, 
                textAlign: 'center',
                maxWidth: { sm: '400px' },
                mx: 'auto'
              }}>
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
                  <Typography variant="h6">
                    {t('profile.level')} {levelSystem.currentLevel}
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={progress} 
                    sx={{ height: 10, borderRadius: 5, mt: 1 }}
                  />
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {levelSystem.currentXP} / {levelSystem.requiredXP} {t('profile.xp')}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Card3D>
        </Grid>

        <Grid item xs={12}>
          <Card3D>
            <Paper sx={{ p: 2 }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{ mb: 2 }}
              >
                <Tab label={t('profile.overview')} />
                <Tab label={t('profile.patterns')} />
                <Tab label={t('profile.categories')} />
                <Tab label={t('profile.achievements.achievements')} />
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
                    <Box sx={{ height: 400 }}>
                      {(transformedCategories ?? []).length > 0 ? (
                        <CategoryProgress 
                          categories={transformedCategories ?? []}
                        />
                      ) : (
                        <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
                          {t('settings.categories.noData')}
                        </Typography>
                      )}
                    </Box>
                  )}
                  {activeTab === 3 && (
                    <Grid container spacing={2}>
                      {userAchievements.map(achievement => (
                        <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                          <Card3D depth={1} hover={achievement.achieved}>
                            <Paper sx={{ 
                              p: 2,
                              opacity: achievement.achieved ? 1 : 0.6,
                              transition: 'all 0.2s',
                              background: achievement.achieved ? 
                                `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.primary.dark})`
                                : undefined
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <EmojiEventsIcon 
                                  color={achievement.achieved ? 'primary' : 'disabled'}
                                  sx={{ fontSize: 40 }}
                                />
                                <Box>
                                  <Typography variant="h6">{achievement.title}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {achievement.description}
                                  </Typography>
                                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={(achievement.progress / achievement.requirement) * 100}
                                      sx={{ flexGrow: 1, height: 8, borderRadius: 1 }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                      {t('profile.achievements.progress', {
                                        values: {
                                          current: achievement.progress,
                                          required: achievement.requirement
                                        }
                                      })}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                              {achievement.achieved && (
                                <Chip
                                  label={t('profile.achievements.xpReward', {
                                    values: { points: achievement.points }
                                  })}
                                  color="primary"
                                  size="small"
                                  sx={{ mt: 1 }}
                                />
                              )}
                            </Paper>
                          </Card3D>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </>
              )}
            </Paper>
          </Card3D>
        </Grid>
      </Grid>
    </Container>
  );
};
