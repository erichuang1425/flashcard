import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { HeatMapGrid } from 'react-grid-heatmap';
import type { StudyAnalytics } from '../../types/analytics';

interface Props {
  patterns: StudyAnalytics['studyPatterns'];
}

export const StudyPatterns: React.FC<Props> = ({ patterns }) => {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const maxCount = Math.max(...patterns.map(p => p.count));
  
  return (
    <Box sx={{ width: '100%', overflow: 'hidden' }}>
      <Paper sx={{ 
        p: { xs: 1.5, sm: 3 },
        width: '100%',
        overflow: 'hidden'
      }}>
        <Typography variant="h6" gutterBottom>Study Activity</Typography>
        <Box sx={{
          width: '100%',
          overflow: 'hidden',
          '& .chart-container': {
            width: '100%',
            maxWidth: '100%',
            position: 'relative',
            height: { xs: 200, sm: 300 },
            overflowX: 'hidden'
          }
        }}>
          <Box sx={{ height: 120, mt: 2 }}>
            <HeatMapGrid
              data={[patterns.map(p => p.count / maxCount)]}
              xLabels={weekdays}
              yLabels={['Activity']}
              cellHeight="60px"
              cellRender={(x, y, value) => (
                <div title={`${weekdays[x]}: ${patterns[x].count} cards`}>
                  {patterns[x].count}
                </div>
              )}
              cellStyle={(x, y, ratio) => ({
                background: `rgb(0, 180, 216, ${ratio})`,
                fontSize: '11px',
                color: ratio > 0.5 ? '#fff' : '#000'
              })}
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
