import React from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import type { UserAchievement } from '../../types/gamification';

interface Props {
  achievements: UserAchievement[];
}

export const Achievements: React.FC<Props> = ({ achievements }) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Achievements
      </Typography>
      <Grid container spacing={2}>
        {achievements.map(achievement => (
          <Grid item xs={12} sm={6} md={4} key={achievement.id}>
            <Paper
              sx={{
                p: 2,
                opacity: achievement.achieved ? 1 : 0.5,
                transition: 'all 0.2s'
              }}
            >
              {/* Achievement content */}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};