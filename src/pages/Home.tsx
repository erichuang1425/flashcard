import React, { useEffect, useState } from 'react';
import { 
  Container, Typography, Box, Button, Grid, Paper, 
  CircularProgress, Card, CardContent, CardActions,
  LinearProgress, Tooltip, IconButton
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserFlashcards, getUserStudyStats } from '../services/firestore';
import SchoolIcon from '@mui/icons-material/School';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import TimerIcon from '@mui/icons-material/Timer';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import { AnimatedCounter } from '../components/AnimatedCounter';
import { GuideTip } from '../components/guide/GuideTip';
import { Flashcard } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface StudyStats {
  total: number;
  dueToday: number;
  streak: number;
  mastered: number;
  averageAccuracy: number;
  studyMinutes: number;
  weeklyProgress: number;
  weeklyGoal: number;
  totalInDatabase: number;
  remainingToStudy: number;
  totalStudied: number;
}

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState<StudyStats>({
    total: 0,
    dueToday: 0,
    streak: 0,
    mastered: 0,
    averageAccuracy: 0,
    studyMinutes: 0,
    weeklyProgress: 0,
    weeklyGoal: 0,
    totalInDatabase: 0,
    remainingToStudy: 0,
    totalStudied: 0
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
      
      try {
        setLoading(true);
        // A single read of the user's flashcards covers every card-derived
        // metric below. Previously this also issued getTotalCardsCount and
        // getMasteryCount, which re-scanned the same collection two more times.
        const [cards, studyStats] = await Promise.all([
          getUserFlashcards(user.uid),
          getUserStudyStats(user.uid),
        ]);

        if (!mounted) return;

        const now = new Date();
        let dueToday = 0;
        let masteredCount = 0;
        let studiedCards = 0;
        for (const card of cards) {
          if (card.mastered) masteredCount++;
          if (card.lastReviewed) studiedCards++;
          const nextReview = card.nextReview instanceof Date
            ? card.nextReview
            : card.nextReview ? new Date(card.nextReview) : null;
          if (!nextReview || nextReview <= now) dueToday++;
        }
        const totalCards = cards.length;

        // Map Firestore data to component state
        setStats({
          total: totalCards,
          dueToday,
          streak: studyStats.streak,
          mastered: masteredCount,
          averageAccuracy: studyStats.averageAccuracy,
          studyMinutes: studyStats.totalStudyMinutes || studyStats.studyMinutes || 0,
          weeklyProgress: studyStats.weeklyProgress,
          weeklyGoal: studyStats.weeklyStudyGoal,
          totalInDatabase: totalCards,
          remainingToStudy: totalCards - studiedCards,
          totalStudied: studyStats.totalStudySessions
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

    // Refresh when the user returns to the tab rather than polling on a timer.
    // The previous 5-minute interval kept re-reading the entire library from an
    // idle background tab, which dominated Firestore read costs for no benefit.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadStats();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{
      minHeight: '100%',
      py: { xs: 2, sm: 4 }
    }}>
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 3 },
        pb: { xs: 2, sm: 4 },
        '& .MuiCard-root': {
          height: 'auto', 
          minHeight: { xs: '120px', sm: '140px' }, 
          background: theme => theme.palette.mode === 'dark' 
            ? 'linear-gradient(145deg, #1a1a1a 0%, #262626 100%)'
            : 'linear-gradient(145deg, #ffffff 0%, #fafafa 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          border: '1px solid',
          borderColor: 'divider',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.1)'
          }
        }
      }}>
        {/* Header Section - Adjust spacing */}
        <Box sx={{ mb: { xs: 2, sm: 3 }, mt: 1 }}>
          <Box flex={1}>
            <Typography variant="h4" gutterBottom>
              {t('home.welcome', { name: user?.displayName || t('home.student') })}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {t('home.totalCards', {
                total: stats.totalInDatabase,
                remaining: stats.remainingToStudy,
              })}
            </Typography>
          </Box>
        </Box>

        {/* Quick Stats - Adjust card heights */}
        <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: { xs: 2, sm: 3 } }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
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
                  {t('home.dueToday')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
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
                  {t('home.mastered')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ 
                textAlign: 'center', 
                py: { xs: 2, sm: 2.5 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <AnimatedCounter
                  end={stats.totalStudied}
                  variant="h3"
                  color="info.main"
                  gutterBottom
                />
                <Typography variant="subtitle2" color="text.secondary">
                  {t('home.totalStudied')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent sx={{ 
                textAlign: 'center', 
                py: { xs: 2, sm: 2.5 },
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <AnimatedCounter
                  end={stats.streak}
                  variant="h3"
                  sx={{ color: '#ff9800' }}
                  gutterBottom
                />
                <Typography variant="subtitle2" color="text.secondary">
                  {t('home.dayStreak')}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Action Buttons - Adjust spacing */}
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 1.5, sm: 2 },
          flexDirection: { xs: 'column', sm: 'row' },
          '& .MuiButton-root': {
            minHeight: { xs: '48px', sm: 'auto' },
            fontSize: { xs: '1rem', sm: '1.1rem' }
          }
        }}>
          <GuideTip
            id="home.start"
            order={1}
            title={t('guide.homeStart.title')}
            body={t('guide.homeStart.body')}
            placement="bottom"
          >
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
              {t('home.startReview', { count: stats.dueToday })}
            </Button>
          </GuideTip>
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
            {t('home.addCards')}
          </Button>
        </Box>

        {/* Detailed Stats - Optimize layout */}
        <Grid container spacing={{ xs: 2, sm: 3 }}>
          {/* Progress Card */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent sx={{ 
                p: { xs: 2, sm: 3 },
                '& .MuiLinearProgress-root': {
                  height: 6,
                  borderRadius: 3
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
                    {t('home.masteredOf', { mastered: stats.mastered, total: stats.total })}
                  </Typography>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {t('home.weeklyGoal', { minutes: stats.weeklyGoal })}
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      {calculatePercentage(stats.weeklyProgress, stats.weeklyGoal)}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={calculatePercentage(stats.weeklyProgress, stats.weeklyGoal)}
                    color="secondary"
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
                    {t('home.minutesCompleted', {
                      progress: stats.weeklyProgress,
                      goal: stats.weeklyGoal,
                    })}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ 
                p: { xs: 2, sm: 3 },
                minHeight: { xs: '160px', sm: '180px' },
                display: 'flex',
                flexDirection: 'column'
              }}>
                <Typography variant="h6" gutterBottom>{t('home.studyTime')}</Typography>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <AnimatedCounter
                      end={stats.studyMinutes}
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
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};
