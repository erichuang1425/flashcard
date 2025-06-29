import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Avatar,
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
import { useTheme, useMediaQuery } from '@mui/material';
import { Card3D } from '../components/common/Card3D';
import { MobileProfileLayout } from '../components/mobile/MobileProfileLayout';

export const Profile: React.FC = () => {
  const { user } = useAuth();
  const { levelSystem, achievements } = useGamification();
  const [analytics, setAnalytics] = useState<StudyAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [error, setError] = useState<string | null>(null);

  // Move useMemo outside render cycle
  const transformedCategories = React.useMemo(() => {
    if (!analytics?.categoryBreakdown) return [];
    
    return analytics.categoryBreakdown
      .filter(cat => cat && cat.category)
      .map(cat => ({
        name: cat.category,
        count: cat.count || 0,
        mastered: cat.mastered || 0
      }));
  }, [analytics]);

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user) return;
      try {
        setError(null);
        const data = await getUserAnalytics(user.uid);
        if (data && data.categoryBreakdown) {
          setAnalytics(data);
        } else {
          throw new Error('Invalid analytics data format');
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
        setError(t('profile.errors.loadingFailed'));
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [user, t]);

  if (!user || !levelSystem) return null;

  const userAchievements = achievements as UserAchievement[];
  const progress = (levelSystem.currentXP / levelSystem.requiredXP) * 100;

  if (isMobile) {
    if (error) {
      const errorNode = (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      );
      return (
        <MobileProfileLayout
          user={user}
          levelSystem={levelSystem}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          t={t}
        >
          {errorNode}
          {errorNode}
          {errorNode}
          {errorNode}
        </MobileProfileLayout>
      );
    }

    if (loading) {
      const loadingNode = (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
      return (
        <MobileProfileLayout
          user={user}
          levelSystem={levelSystem}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          t={t}
        >
          {loadingNode}
          {loadingNode}
          {loadingNode}
          {loadingNode}
        </MobileProfileLayout>
      );
    }

    return (
      <MobileProfileLayout
        user={user}
        levelSystem={levelSystem}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        t={t}
      >
        <AnalyticsOverview analytics={analytics!} />
        <StudyPatterns patterns={analytics!.studyPatterns} />
        <Box className="chart-container" sx={{ height: 300 }}>
          {(transformedCategories ?? []).length > 0 ? (
            <CategoryProgress categories={transformedCategories ?? []} />
          ) : (
            <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
              {t('settings.categories.noData')}
            </Typography>
          )}
        </Box>
        <Grid container spacing={1} sx={{ width: '100%', mx: 0 }}>
          {userAchievements.map(achievement => (
            <Grid item xs={12} key={achievement.id}>
              <Card3D depth={1} hover={achievement.achieved} sx={{ width: '100%' }}>
                <Paper
                  sx={{
                    p: 1.5,
                    width: '100%',
                    opacity: achievement.achieved ? 1 : 0.6,
                    transition: 'all 0.2s',
                    background: achievement.achieved
                      ? `linear-gradient(135deg, ${theme.palette.background.paper}, ${theme.palette.primary.dark})`
                      : undefined
                  }}
                >
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
      </MobileProfileLayout>
    );
  }

  // Regular desktop layout
  return (
    <Container 
      maxWidth="lg" 
      disableGutters
      sx={{
        py: { xs: 1, sm: 3 },
        px: 0,
   
        overflow: 'hidden',
        width: '100%',
        '& .MuiGrid-root': {
          maxWidth: '100%'  // Constrain grid width
        }
      }}
    >
      <Grid 
        container 
        spacing={{ xs: 1, sm: 2 }} 
        sx={{ 
          width: '100%',
          m: 0,
          px: { xs: 1, sm: 2 },
        }}
      >
        <Grid item xs={12}>
          <Card3D depth={2}>
            <Box sx={{ 
              p: { xs: 2, sm: 3 }, // Reduced padding on mobile
              overflow: 'hidden',
              width: '100%'
            }}>
              <Paper sx={{ 
                p: { xs: 1.5, sm: 3 }, 
                textAlign: 'center',
                maxWidth: { xs: '100%', sm: '400px' },
                mx: 'auto',
                width: '100%'
              }}>
                <Avatar
                  sx={{ 
                    width: { xs: 80, sm: 120 }, // Smaller avatar on mobile
                    height: { xs: 80, sm: 120 },
                    mx: 'auto', 
                    mb: { xs: 1, sm: 2 }
                  }}
                  src={user.photoURL || undefined}
                />
                <Typography variant="h5" sx={{
                  fontSize: { xs: '1.25rem', sm: '1.5rem' }, // Smaller heading on mobile
                  mb: { xs: 0.5, sm: 1 }
                }}>
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
            <Paper sx={{ 
              p: { xs: 2, sm: 3 },
              overflowX: 'hidden',
              width: '100%',
              '& .analytics-container': {
                maxWidth: '100%',
                overflow: 'hidden'
              },
              '& .chart-container': {
                maxWidth: '100%',
                overflow: 'auto',
                WebkitOverflowScrolling: 'touch'
              }
            }}>
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                sx={{ 
                  mb: { xs: 1, sm: 2 },
                  '& .MuiTab-root': {
                    minWidth: { xs: 'auto', sm: 120 }, // Flexible tab width on mobile
                    px: { xs: 1, sm: 2 },
                    fontSize: { xs: '0.8rem', sm: '0.875rem' } // Smaller text on mobile
                  }
                }}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
              >
                <Tab label={t('profile.overview')} />
                <Tab label={t('profile.patterns')} />
                <Tab label={t('profile.categories')} />
                <Tab label={t('profile.achievements.achievements')} />
              </Tabs>

              {error ? (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="error">{error}</Typography>
                </Box>
              ) : loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {activeTab === 0 && analytics && (
                    <Box className="analytics-container">
                      <AnalyticsOverview analytics={analytics} />
                    </Box>
                  )}
                  {activeTab === 1 && analytics && (
                    <Box className="chart-container">
                      <StudyPatterns patterns={analytics.studyPatterns} />
                    </Box>
                  )}
                  {activeTab === 2 && analytics && (
                    <Box className="chart-container" sx={{ height: { xs: 300, sm: 400 } }}>
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
                    <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ width: '100%', mx: 0 }}>
                      {userAchievements.map(achievement => (
                        <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                          <Card3D depth={1} hover={achievement.achieved} sx={{ width: '100%' }}>
                            <Paper sx={{ 
                              p: { xs: 1.5, sm: 2 }, // Reduced padding on mobile
                              width: '100%',
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
