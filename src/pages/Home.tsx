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
import { AnimatedCounter } from '../components/AnimatedCounter';
import { Flashcard } from '../types';

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
        const [cards, studyStats, totalStats, masteredCount] = await Promise.all([
          getUserFlashcards(user.uid),
          getUserStudyStats(user.uid),
          getTotalCardsCount(user.uid),
          getMasteryCount(user.uid)
        ]);

        if (!mounted) return;

        const now = new Date();
        const dueToday = cards.filter(card => {
          if (!card.nextReview) return true;
          const nextReview = card.nextReview instanceof Date 
            ? card.nextReview 
            : new Date(card.nextReview);
          return nextReview <= now;
        }).length;

        // Map Firestore data to component state
        setStats({
          total: totalStats.totalCards,
          dueToday,
          streak: studyStats.streak,
          mastered: masteredCount,
          averageAccuracy: studyStats.averageAccuracy,
          studyMinutes: studyStats.totalStudyMinutes || studyStats.studyMinutes || 0,
          weeklyProgress: studyStats.weeklyProgress,
          weeklyGoal: studyStats.weeklyStudyGoal,
          totalInDatabase: totalStats.totalCards,
          remainingToStudy: totalStats.remainingCards,
          totalStudied: studyStats.totalStudySessions
        });

        // Debug info
        console.debug('Raw Data:', {
          cards: cards.length,
          studyStats,
          totalStats,
          masteredCount,
          dueToday
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
    // Set up auto-refresh every 5 minutes
    const refreshInterval = setInterval(loadStats, 5 * 60 * 1000);
    
    return () => { 
      mounted = false;
      clearInterval(refreshInterval);
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
      minHeight: '100vh',
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
              Welcome back, {user?.displayName || 'Student'}!
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Total cards: {stats.totalInDatabase} ({stats.remainingToStudy} remaining to study)
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
                  Due Today
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
                  Mastered
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
                  Total Studied
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
                  Day Streak
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
            Start Review ({stats.dueToday} cards)
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
            Add New Cards
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
                <Typography variant="h6" gutterBottom>Progress Overview</Typography>
                <Box sx={{ mb: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Mastery Progress
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
                    {stats.mastered} of {stats.total} cards mastered
                  </Typography>
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Weekly Study Goal ({stats.weeklyGoal} minutes)
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
                    {stats.weeklyProgress} of {stats.weeklyGoal} minutes completed
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
                <Typography variant="h6" gutterBottom>Study Time</Typography>
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <AnimatedCounter
                      end={stats.studyMinutes}
                      variant="h3"
                      color="info.main"
                      gutterBottom
                    />
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Minutes
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
