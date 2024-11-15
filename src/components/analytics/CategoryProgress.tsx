import React from 'react';
import { Box, Typography, Paper, Grid, useTheme } from '@mui/material';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  Colors
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useI18n } from '../../i18n/I18nContext';

// Register required chart elements
ChartJS.register(ArcElement, Tooltip, Legend, Colors);

interface CategoryProgressProps {
  categories: Array<{
    name: string;
    count: number;
    mastered: number;
  }>;
}

const chartOptions = {
  plugins: {
    legend: {
      position: 'bottom' as const,
      align: 'center' as const
    },
    doughnut: {
      cutout: '70%',
    }
  },
  layout: {
    padding: 20
  },
  maintainAspectRatio: true
};

// Center text styles
const centerTextStyles = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  textAlign: 'center',
  pointerEvents: 'none',
  width: '100%'
};

export const CategoryProgress: React.FC<CategoryProgressProps> = ({ categories }) => {
  const theme = useTheme();
  const { t } = useI18n();

  if (!categories || categories.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography>{t('settings.categories.noData')}</Typography>
      </Box>
    );
  }

  const sortedCategories = [...categories].sort((a, b) => 
    (b.mastered / b.count) - (a.mastered / a.count)
  );

  const chartData = {
    labels: sortedCategories.map(cat => cat.name),
    datasets: [{
      data: sortedCategories.map(cat => 
        Math.round((cat.mastered / cat.count) * 100)
      ),
      backgroundColor: sortedCategories.map((_, i) => 
        `hsla(${(i * 360) / sortedCategories.length}, 70%, 50%, 0.8)`
      ),
      borderColor: theme.palette.background.paper,
      borderWidth: 1,
      hoverBorderWidth: 2,
      hoverBorderColor: theme.palette.primary.main,
    }, {
      // Add background dataset for unmastered portions
      data: sortedCategories.map(cat => 
        Math.round((1 - cat.mastered / cat.count) * 100)
      ),
      backgroundColor: theme.palette.grey[200], // Grey background for non-mastered portions
      borderWidth: 0,
    }]
  };

  const totalMastered = categories.reduce((acc, cat) => acc + cat.mastered, 0);
  const totalCount = categories.reduce((acc, cat) => acc + cat.count, 0);
  const overallPercentage = Math.round((totalMastered / totalCount) * 100) || 0;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'right' as const,
        align: 'center' as const,
        labels: {
          boxWidth: 15,
          padding: 15,
          font: {
            size: 11,
          },
          generateLabels: (chart: any) => {
            const { data } = chart;
            if (data.labels.length === 0) return [];

            return data.labels.map((label: string, i: number) => {
              const category = sortedCategories[i];
              const percentage = Math.round((category.mastered / category.count) * 100);
              return {
                text: `${label} (${category.mastered}/${category.count}) - ${percentage}%`,
                fillStyle: data.datasets[0].backgroundColor[i],
                hidden: false,
                index: i,
              };
            });
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            // Only show tooltips for the first dataset (mastered portions)
            if (context.datasetIndex === 0) {
              const category = sortedCategories[context.dataIndex];
              return `${category.name}: ${context.formattedValue}% (${category.mastered}/${category.count})`;
            }
            return undefined;
          }
        }
      }
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          {t('settings.categories.title')}
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Paper sx={{ p: 2, height: '400px', position: 'relative' }}>
          <Box sx={{ height: '100%', display: 'flex', position: 'relative' }}>
            <Box sx={{ flex: 1, minHeight: '100%', position: 'relative' }}>
              <Doughnut data={chartData} options={options} />
              <Box sx={centerTextStyles}>
                <Typography variant="h3" color="primary" sx={{ mb: 0.5 }}>
                  {overallPercentage}%
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {t('home.stats.cardsMastered')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {totalMastered} / {totalCount}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};
