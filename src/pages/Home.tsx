import React, { useEffect, useState } from 'react';
import { 
  Container, Typography, Box, Button, Grid, Paper, 
  CircularProgress, Card, CardContent, CardActions,
  LinearProgress, Tooltip, IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserFlashcards, getUserStudyStats, updateDailyStreak, getTotalCardsCount, getMasteryCount } from '../services/firestore';
import SchoolIcon from '@mui/icons-material/School';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import TimerIcon from '@mui/icons-material/Timer';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { Flashcard } from '../types';
import { useI18n } from '../i18n/I18nContext';
import { Card3D } from '../components/common/Card3D';
import { MobileStatsOverview } from '../components/stats/MobileStatsOverview';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Theme } from '@mui/material';

interface StudyStats {
  total: number;
  dueToday: number;
  mastered: number;
  averageAccuracy: number;
  weeklyProgress: number;
  weeklyGoal: number;
  totalInDatabase: number;
  remainingToStudy: number;
  totalStudyDays: number;
  streak: number;
  totalStudyMinutes: number;
}

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [stats, setStats] = useState<StudyStats>({
    total: 0,
    dueToday: 0,
    mastered: 0,
    averageAccuracy: 0,
    weeklyProgress: 0,
    weeklyGoal: 0,
    totalInDatabase: 0,
    remainingToStudy: 0,
    totalStudyDays: 0,
    streak: 0,
    totalStudyMinutes: 0
  });
  const [loading, setLoading] = useState(true);

  const calculatePercentage = (value: number, total: number) => {
    if (!total) return 0;
    return Math.min(100, Math.round((value / total) * 100));
  };

  useEffect(() => {
    let mounted = true;
    
    const loadStats = async () => {
      if (!user) return;
      setLoading(true);
      
      try {
        const [studyStats, cardsCount] = await Promise.all([
          getUserStudyStats(user.uid),
          getTotalCardsCount(user.uid)
        ]);

        if (!mounted) return;

        setStats({
          total: cardsCount.totalCards,
          dueToday: cardsCount.remainingCards,
          streak: studyStats?.streak || 0,
          mastered: studyStats?.masteredCards || 0,
          averageAccuracy: studyStats?.averageAccuracy || 0,
          totalStudyMinutes: studyStats?.totalStudyMinutes || 0,
          weeklyProgress: studyStats?.weeklyStudyMinutes || 0,
          weeklyGoal: studyStats?.weeklyStudyGoal || 60,
          totalInDatabase: cardsCount.totalCards,
          remainingToStudy: cardsCount.remainingCards,
          totalStudyDays: studyStats?.totalStudyDays || 0
        });

      } catch (error) {
        console.error('Error loading stats:', error);
        setStats(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load stats'
        }));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStats();
    const refreshInterval = setInterval(loadStats, 5 * 60 * 1000);
    
    return () => {
      mounted = false; 
      clearInterval(refreshInterval);
    };
  }, [user]);

  const handleAction = (type: 'study' | 'reading' | 'import') => {
    switch (type) {
      case 'study':
        navigate('/study');
        break;
      case 'reading':
        navigate('/reading');
        break;
      case 'import':
        navigate('/import');
        break;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{
      minHeight: '100vh',
      py: { xs: 2, sm: 4 },
      px: { xs: 0, sm: 2 },
      bgcolor: 'background.default'
    }}>
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 3 },
        px: { xs: 2, sm: 0 },
        '& .MuiCard-root': {
          height: 'auto', 
          minHeight: { xs: '100px', sm: '140px' },
          background: theme => theme.palette.mode === 'dark' 
            ? 'linear-gradient(145deg, #1a1a1a 0%, #262626 100%)'
            : 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
          boxShadow: theme => `
            0 4px 20px ${theme.palette.primary.main}15,
            0 2px 8px rgba(0,0,0,0.1)
          `,
          borderRadius: { xs: '16px', sm: '24px' },
          border: 1,
          borderColor: 'divider',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: 'translateY(0)',
          '&:active': {
            transform: 'translateY(2px)',
          }
        }
      }}>
        <Box sx={{ 
          mb: { xs: 1, sm: 3 },
          mt: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}>
          <Typography 
            variant="h4" 
            sx={{
              fontSize: { xs: '1.75rem', sm: '2.125rem' },
              fontWeight: 600,
              letterSpacing: '-0.02em',
              background: theme => `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('home.welcome')}, {user?.displayName || 'Student'}!
          </Typography>
          <Typography 
            variant="subtitle1" 
            color="text.secondary"
            sx={{ 
              fontSize: { xs: '0.875rem', sm: '1rem' },
              opacity: 0.8
            }}
          >
            {t('home.stats.totalCards')}: {stats.totalInDatabase} 
            ({stats.remainingToStudy} {t('home.stats.remainingToStudy')})
          </Typography>
        </Box>

        {isMobile ? (
          <MobileStatsOverview
            stats={{
              dueToday: stats.dueToday,
              mastered: stats.mastered,
              total: stats.total
            }}
            onAction={handleAction}
          />
        ) : (
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
            <Grid item xs={12} sm={6}>
              <Card3D>
                <CardContent sx={{ 
                  textAlign: 'center', 
                  py: { xs: 2, sm: 2.5 },
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <AnimatedCounter
                    end={stats.dueToday}
                    variant="h3"
                    color="warning.main"
                    gutterBottom
                  />
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('home.stats.dueToday')}
                  </Typography>
                </CardContent>
              </Card3D>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Card3D>
                <CardContent sx={{ 
                  textAlign: 'center', 
                  py: { xs: 2, sm: 2.5 },
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <AnimatedCounter
                    end={stats.mastered}
                    variant="h3"
                    color="success.main"
                    gutterBottom
                  />
                  <Typography variant="subtitle2" color="text.secondary">
                    {t('home.stats.mastered')}
                  </Typography>
                </CardContent>
              </Card3D>
            </Grid>
          </Grid>
        )}

        {!isMobile && (
          <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              gap: { xs: 1.5, sm: 2 },
              mt: { xs: 1, sm: 2 },
              '& .MuiButton-root': {
                borderRadius: '12px',
                minHeight: { xs: '56px', sm: '48px' },
                fontSize: { xs: '1rem', sm: '1.1rem' },
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: theme => `0 4px 12px ${theme.palette.primary.main}25`,
                '&:active': {
                  transform: 'translateY(1px)',
                  boxShadow: 'none'
                }
              }
            }}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<SchoolIcon />}
                onClick={() => navigate('/study')}
                disabled={stats.dueToday === 0}
                sx={{
                  py: 2,
                  fontSize: '1.1rem',
                  boxShadow: theme => `0 8px 32px ${theme.palette.primary.main}20`
                }}
              >
                {t('home.buttons.startReview')} ({stats.dueToday} {t('home.cards')})
              </Button>
              <Button
                variant="contained"
                size="large"
                fullWidth
                color="secondary"
                startIcon={<MenuBookIcon />}
                onClick={() => navigate('/reading')}
                sx={{
                  py: 2,
                  fontSize: '1.1rem',
                  boxShadow: theme => `0 8px 32px ${theme.palette.secondary.main}20`
                }}
              >
                {t('home.buttons.startReading')}
              </Button>
              <Button
                variant="outlined"
                size="large"
                fullWidth
                startIcon={<LibraryBooksIcon />}
                onClick={() => navigate('/import')}
                sx={{
                  py: 2,
                  fontSize: '1.1rem'
                }}
              >
                {t('home.buttons.addNewCards')}
              </Button>
            </Box>
          </Box>
        )}

        <Grid container spacing={{ xs: 2, sm: 3 }}>
          <Grid item xs={12} md={8}>
            <Card3D depth={1.5}>
              <CardContent sx={{ 
                p: { xs: 2, sm: 3 },
                '& .MuiLinearProgress-root': {
                  height: 8,
                  borderRadius: 4,
                  bgcolor: theme => theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'rgba(0,0,0,0.05)'
                }
              }}>
                <Typography variant="h6" gutterBottom>{t('home.progressOverview')}</Typography>
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('home.masteryProgress')}
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      {calculatePercentage(stats.mastered, stats.total)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={calculatePercentage(stats.mastered, stats.total)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                    {stats.mastered} {t('home.stats.of')} {stats.total} {t('home.stats.cardsMastered')}
                  </Typography>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('home.stats.weeklyGoal')} ({stats.weeklyGoal} {t('home.stats.minutesCompleted')})
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      {calculatePercentage(stats.weeklyProgress, stats.weeklyGoal)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={calculatePercentage(stats.weeklyProgress, stats.weeklyGoal)}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                    {stats.weeklyProgress} {t('home.stats.of')} {stats.weeklyGoal} {t('home.stats.minutesCompleted')}
                  </Typography>
                </Box>
              </CardContent>
            </Card3D>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card3D depth={1.5}>
              <CardContent sx={{ 
                p: { xs: 2, sm: 3 },
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}>
                <Typography variant="h6" gutterBottom>{t('home.studyTime')}</Typography>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <AnimatedCounter
                      end={stats.totalStudyMinutes}
                      variant="h3"
                      color="info.main"
                      gutterBottom
                    />
                    <Typography variant="subtitle2" color="text.secondary">
                      {t('home.totalMinutes')}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card3D>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};
