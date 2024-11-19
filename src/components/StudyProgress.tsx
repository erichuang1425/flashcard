import React from 'react';
import { Box, Typography, LinearProgress, Button, Paper, Chip } from '@mui/material';
import WhatshotIcon from '@mui/icons-material/Whatshot';
import { useI18n } from '../i18n/I18nContext';
import type { StudyProgress as StudyProgressType } from '../types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { FloatingBox, GlassPaper } from './common/StyledComponents';


ChartJS.register(ArcElement, Tooltip, Legend);


const chartOptions = {
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      enabled: true,
      callbacks: {
        label: (context: any) => {
          return `${context.label}: ${context.formattedValue}%`;
        }
      }
    }
  },
  cutout: '70%',
  maintainAspectRatio: false,
  animation: {
    duration: 1000
  }
};


const centerTextStyles = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center' as const
};

interface StudyProgressProps {
  progress: StudyProgressType;
  total: number;
}

export const StudyProgress: React.FC<StudyProgressProps> = ({ progress, total }) => {
  const { t } = useI18n();

  const calculateProgress = () => {
    if (!total) return 0;
    return Math.floor((progress.stats.cardsReviewed / total) * 100);
  };

  const accuracy = progress.stats.cardsReviewed ? 
    Math.round((progress.stats.correct / progress.stats.cardsReviewed) * 100) : 0;

  const chartData = {
    labels: [t('study.progress.completed'), t('study.progress.remaining')],
    datasets: [{
      data: [progress.stats.cardsReviewed, total - progress.stats.cardsReviewed],
      backgroundColor: ['#2196f3', '#e0e0e0'],
      borderWidth: 0
    }]
  };

  return (
    <GlassPaper elevation={0} sx={{ 
      position: 'relative',
      bgcolor: 'background.paper',
    }}>
      <FloatingBox sx={{ p: 2 }}>
        <Box sx={{ p: 1.5 }}> 
          <FloatingBox>
            <Box sx={{ mb: 2 }}> 
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 1.5
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 600,
                    background: 'linear-gradient(45deg, #2196f3, #1976d2)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {t('study.progress.overall')}
                  </Typography>
                  <Chip
                    size="small"
                    icon={<WhatshotIcon sx={{ fontSize: '1rem' }} />}
                    label={progress.stats.streak}
                    color="primary"
                    sx={{ 
                      height: 24,
                      background: 'linear-gradient(45deg, #2196f3, #1976d2)',
                      '& .MuiChip-label': {
                        fontWeight: 600
                      },
                      '& .MuiChip-icon': {
                        color: 'inherit'
                      }
                    }}
                  />
                </Box>
              </Box>
              
              {/* Progress Chart */}
              <Box sx={{ 
                height: 140, 
                position: 'relative', 
                mb: 1, 
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
              }}>
                <Doughnut data={chartData} options={chartOptions} />
                <Box sx={{
                  ...centerTextStyles,
                  animation: 'fadeIn 0.5s ease-in',
                  '& h5': {
                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }
                }}>
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                    {calculateProgress()}%
                  </Typography>
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary" align="center" display="block">
                {progress.stats.cardsReviewed} / {total} {t('study.progress.cardsCompleted')}
              </Typography>
            </Box>

            <Box sx={{ 
              mb: 2,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1 
            }}>
              <Paper variant="outlined" sx={{ 
                p: 1, 
                textAlign: 'center',
                bgcolor: 'background.default',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 2
                }
              }}> {/* Reduced padding */}
                <Typography variant="h6" color="success.main" sx={{ fontSize: '1.1rem' }}> {/* Smaller text */}
                  {progress.stats.correct}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('study.progress.correct')}
                </Typography>
              </Paper>
              <Paper variant="outlined" sx={{ 
                p: 1, 
                textAlign: 'center', 
                bgcolor: 'background.default',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 2
                }
              }}> {/* Reduced padding */}
                <Typography variant="h6" color="error.main" sx={{ fontSize: '1.1rem' }}> {/* Smaller text */}
                  {progress.stats.incorrect}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('study.progress.incorrect')}
                </Typography>
              </Paper>
            </Box>

            <Box sx={{ mb: 1.5 }}> {/* Reduced margin */}
              <Typography variant="body2" align="center" gutterBottom>
                {t('study.progress.accuracy')}: {accuracy}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={accuracy}
                color={accuracy > 70 ? 'success' : accuracy > 40 ? 'warning' : 'error'}
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  '.MuiLinearProgress-bar': {
                    transition: 'transform 1s ease-in-out',
                    borderRadius: 3,
                    backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)',
                    backgroundSize: '1rem 1rem',
                    animation: 'progress-stripes 1s linear infinite'
                  }
                }}
              />
            </Box>
          </FloatingBox>
        </Box>
      </FloatingBox>
    </GlassPaper>
  );
};
