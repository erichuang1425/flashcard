import React from 'react';
import { Box, Typography, Paper, Grid, Divider } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import type { StudyAnalytics } from '../../types/analytics';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Props {
  analytics: StudyAnalytics;
}

export const AnalyticsOverview: React.FC<Props> = ({ analytics }) => {
  const studyTimeData = {
    labels: analytics.dailyStudyTime.map(d => d.date),
    datasets: [
      {
        label: 'Study Time (minutes)',
        data: analytics.dailyStudyTime.map(d => d.minutes),
        fill: true,
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4
      }
    ]
  };

  const masteryData = {
    labels: analytics.masteryTrend.map(d => d.date),
    datasets: [
      {
        label: 'Cards Mastered',
        data: analytics.masteryTrend.map(d => d.mastered),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      <Grid container spacing={2} sx={{ 
        width: '100%', 
        mx: 0,
        '& .MuiGrid-item': {  // Ensure grid items don't overflow
          maxWidth: '100%',
          '& > *': {
            maxWidth: '100%'
          }
        }
      }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: { xs: 1.5, sm: 3 },
            width: '100%',
            overflow: 'hidden',  // Ensure content doesn't overflow
            '& canvas': {
              maxWidth: '100%',
              height: 'auto !important',
            }
          }}>
            <Typography variant="h6" gutterBottom>Study Overview</Typography>
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Total Study Time</Typography>
                  <Typography variant="h4">{analytics.totalStudyTime}m</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Cards Reviewed</Typography>
                  <Typography variant="h4">{analytics.totalCardsReviewed}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Accuracy Rate</Typography>
                  <Typography variant="h4">{analytics.accuracyRate}%</Typography>
                </Grid>
              </Grid>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>Daily Study Time</Typography>
            <Box sx={{ 
              width: '100%',
              overflowX: 'hidden',
              '& .chart-wrapper': {
                width: '100%',
                position: 'relative',
                '& canvas': {
                  maxWidth: '100%',
                  height: 'auto !important'
                }
              }
            }}>
              <Box sx={{ height: 200, mt: 2 }}>
                <Line data={studyTimeData} options={options} />
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Mastery Progress</Typography>
            <Box sx={{ height: 300 }}>
              <Line data={masteryData} options={options} />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};