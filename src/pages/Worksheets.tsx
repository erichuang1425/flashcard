import React, { useEffect, useState } from 'react';
import { 
  Container, Typography, Box, Grid, Card, CardContent, 
  CardActions, Button, Chip, IconButton, Tooltip,
  LinearProgress, CardHeader, Avatar, Menu, MenuItem,
  Badge, Divider, Dialog, DialogTitle, DialogContent, List, ListItem, ListItemText
} from '@mui/material';
import { 
  Schedule as ScheduleIcon,
  MoreVert as MoreVertIcon,
  Assignment as AssignmentIcon,
  Star as StarIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PlayArrow as PlayIcon,
  Download as DownloadIcon,
  Description as DescriptionIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getUserWorksheets, deleteWorksheet } from '../services/firestore';
import type { Worksheet, WorksheetStats } from '../types';
import { WorksheetGenerator } from '../components/WorksheetGenerator';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { initializePdfMake, generateWorksheetPDF } from '../services/pdfService';
import { generateDOCX, downloadDOCX } from '../services/exportService';

export const Worksheets: React.FC = () => {
  const { user } = useAuth();
  const [worksheets, setWorksheets] = useState<Worksheet[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWorksheet, setSelectedWorksheet] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);
  const [selectedWorksheetAnswers, setSelectedWorksheetAnswers] = useState<{
    title: string;
    answers: { [key: string]: { correctAnswer: string; question: string; explanation?: string } }
  } | null>(null);
  const [activeQuestion, setActiveQuestion] = useState<number>(0);
  const navigate = useNavigate();

  useEffect(() => {
    const loadWorksheets = async () => {
      if (user) {
        const userWorksheets = await getUserWorksheets(user.uid);
        // Convert Firestore Timestamps to JS Dates
        const processedWorksheets = userWorksheets.map(worksheet => ({
          ...worksheet,
          createdAt: worksheet.createdAt instanceof Date ? 
            worksheet.createdAt : 
            worksheet.createdAt && typeof worksheet.createdAt === 'object' && 'toDate' in worksheet.createdAt ? 
            (worksheet.createdAt as { toDate(): Date }).toDate() : new Date()
        }));
        setWorksheets(processedWorksheets);
      }
    };
    loadWorksheets();
  }, [user]);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>, worksheetId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorksheet(worksheetId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorksheet(null);
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!selectedWorksheet) return;
    
    try {
      const worksheet = worksheets.find(w => w.id === selectedWorksheet);
      if (!worksheet) throw new Error('Worksheet not found');

      if (format === 'pdf') {
        try {
          const pdfMake = await initializePdfMake();
          const docDefinition = await generateWorksheetPDF(worksheet);
          pdfMake.createPdf(docDefinition).download(`${worksheet.title}.pdf`);
        } catch (pdfError) {
          console.error('PDF generation failed:', pdfError);

        }
      } else {
        const doc = await generateDOCX(worksheet);
        await downloadDOCX(doc, `${worksheet.title}.docx`);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
    handleMenuClose();
  };

  const getDifficultyColor = (difficulty: string): 'success' | 'warning' | 'error' | 'primary' => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'primary';
    }
  };

  const handleStartWorksheet = (worksheetId: string) => {
    if (!worksheetId) return;
    navigate(`/study/worksheet/${worksheetId}`);
  };

  const handleEditWorksheet = (worksheetId: string) => {
    if (!worksheetId) return;
    navigate(`/worksheets/edit/${worksheetId}`);
    handleMenuClose();
  };

  const handleDeleteWorksheet = async (worksheetId: string) => {
    try {
      await deleteWorksheet(user?.uid || '', worksheetId);
      setWorksheets(worksheets.filter(w => w.id !== worksheetId));
      handleMenuClose();
    } catch (error) {
      console.error('Failed to delete worksheet:', error);
    }
  };

  const getWorksheetProgress = (worksheet: Worksheet): number => {
    if (!worksheet.stats) return 0;
    const { completed, total } = worksheet.stats;
    return total > 0 ? (completed / total) * 100 : 0;
  };

  const handleViewAnswers = (worksheet: Worksheet) => {
    const answers: { [key: string]: { correctAnswer: string; question: string; explanation?: string } } = {};
    
    worksheet.questions.forEach((q, index) => {
      const answerKey = q.id || `q${index}`;
      const worksheetAnswer = worksheet.answers?.[answerKey];
      
      answers[answerKey] = {
        question: q.question,
        correctAnswer: worksheetAnswer?.correctAnswer || q.correctAnswer,
        explanation: worksheetAnswer?.explanation
      };
    });
  
    setSelectedWorksheetAnswers({
      title: worksheet.title,
      answers
    });
    setActiveQuestion(0); // Reset to first question
    setShowAnswers(true);
    handleMenuClose();
  };

  const scrollToQuestion = (index: number) => {
    const element = document.getElementById(`question-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveQuestion(index);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ 
      minHeight: '100vh',
      py: { xs: 2, sm: 4 }
    }}>
      <Box sx={{ 
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 2, sm: 3 }
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 2, sm: 0 }
        }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            My Worksheets
          </Typography>
          <Button
            variant="contained"
            startIcon={<AssignmentIcon />}
            onClick={() => window.location.hash = '#create'}
          >
            Create New
          </Button>
        </Box>

        <Grid container spacing={{ xs: 1.5, sm: 3 }}>
          {worksheets.map(worksheet => (
            <Grid item xs={12} sm={6} md={4} key={worksheet.id}>
              <Card sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => theme.shadows[8],
                }
              }}>
                <CardHeader
                  avatar={
                    <Avatar sx={{ bgcolor: (theme) => theme.palette[getDifficultyColor(worksheet.difficulty)].main }}>
                      {worksheet.title?.[0] || 'W'}
                    </Avatar>
                  }
                  action={
                    <IconButton onClick={(e) => handleMenuClick(e, worksheet.id || '')}>
                      <MoreVertIcon />
                    </IconButton>
                  }
                  title={worksheet.title || `Worksheet ${worksheet.templateId}`}
                  subheader={format(new Date(worksheet.createdAt), 'MMM d, yyyy')}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={getWorksheetProgress(worksheet)}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip
                      size="small"
                      label={`${worksheet.stats?.completed || 0}/${worksheet.stats?.total || worksheet.questions?.length || 0} Completed`}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      size="small"
                      label={worksheet.difficulty}
                      color={getDifficultyColor(worksheet.difficulty)}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {worksheet.categories.map(category => (
                      <Chip
                        key={category}
                        label={category}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem' }}
                      />
                    ))}
                  </Box>
                </CardContent>
                <Divider />
                <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon fontSize="small" color="action" />
                    <Typography variant="caption">
                      {worksheet.timeLimit} min
                    </Typography>
                  </Box>
                  <Button
                    startIcon={<PlayIcon />}
                    variant="contained"
                    size="small"
                    onClick={() => handleStartWorksheet(worksheet.id || '')}
                  >
                    {worksheet.stats?.completed ? 'Continue' : 'Start'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={() => handleViewAnswers(worksheets.find(w => w.id === selectedWorksheet)!)}>
            <VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View Answers
          </MenuItem>
          <MenuItem onClick={() => handleExport('pdf')}>
            <DownloadIcon fontSize="small" sx={{ mr: 1 }} /> Export as PDF
          </MenuItem>
          <MenuItem onClick={() => handleExport('docx')}>
            <DescriptionIcon fontSize="small" sx={{ mr: 1 }} /> Export as Word
          </MenuItem>
          <MenuItem onClick={() => selectedWorksheet && handleEditWorksheet(selectedWorksheet)}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
          </MenuItem>
          <MenuItem onClick={() => selectedWorksheet && handleDeleteWorksheet(selectedWorksheet)}>
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>

        <Box id="create" sx={{ mt: 6 }}>
          <WorksheetGenerator />
        </Box>
      </Box>

      <Dialog 
        open={showAnswers} 
        onClose={() => setShowAnswers(false)} 
        maxWidth="md" 
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {selectedWorksheetAnswers?.title} - Answer Key
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => handleExport('pdf')}
                startIcon={<DownloadIcon />}
              >
                PDF
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={() => handleExport('docx')}
                startIcon={<DescriptionIcon />}
              >
                Word
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Box sx={{ 
                position: 'sticky', 
                top: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 2 
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  flexWrap: 'wrap',
                  mb: 1 
                }}>
                  <Button
                    size="small"
                    variant={activeQuestion === 0 ? "contained" : "outlined"}
                    onClick={() => scrollToQuestion(0)}
                  >
                    First
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => scrollToQuestion(Math.max(0, activeQuestion - 1))}
                    disabled={activeQuestion === 0}
                  >
                    Prev
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => scrollToQuestion(Math.min(
                      Object.keys(selectedWorksheetAnswers?.answers || {}).length - 1,
                      activeQuestion + 1
                    ))}
                    disabled={!selectedWorksheetAnswers || 
                      activeQuestion === Object.keys(selectedWorksheetAnswers.answers).length - 1}
                  >
                    Next
                  </Button>
                  <Button
                    size="small"
                    variant={activeQuestion === (selectedWorksheetAnswers ? 
                      Object.keys(selectedWorksheetAnswers.answers).length - 1 : 0) ? 
                      "contained" : "outlined"}
                    onClick={() => selectedWorksheetAnswers && 
                      scrollToQuestion(Object.keys(selectedWorksheetAnswers.answers).length - 1)}
                  >
                    Last
                  </Button>
                </Box>
                <List dense sx={{ 
                  maxHeight: 'calc(100vh - 250px)',
                  overflowY: 'auto',
                  '&::-webkit-scrollbar': {
                    width: '8px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'action.hover',
                    borderRadius: '4px',
                  }
                }}>
                  {selectedWorksheetAnswers && Object.entries(selectedWorksheetAnswers.answers).map(([id, data], index) => (
                    <ListItem 
                      key={`nav-${id}`}
                      component="div"
                      sx={{ 
                        cursor: 'pointer',
                        width: '100%',
                        textAlign: 'left',
                        bgcolor: activeQuestion === index ? 'action.selected' : 'transparent',
                        '&:hover': {
                          bgcolor: 'action.hover'
                        }
                      }}
                      onClick={() => scrollToQuestion(index)}
                    >
                      <ListItemText 
                        primary={`Question ${index + 1}`}
                        primaryTypographyProps={{
                          color: activeQuestion === index ? 'primary' : 'textPrimary',
                          variant: 'body2'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Grid>
            <Grid item xs={9}>
              <List>
                {selectedWorksheetAnswers && Object.entries(selectedWorksheetAnswers.answers).map(([id, data], index) => (
                  <ListItem 
                    key={id} 
                    divider 
                    id={`question-${index}`}
                    sx={{
                      scrollMarginTop: '20px',
                      bgcolor: activeQuestion === index ? 'action.hover' : 'transparent',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ mb: 1 }}>
                          <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                            Question {index + 1}: {data.question}
                          </span>
                        </Box>
                      }
                      secondary={
                        <Typography
                          component="span" 
                          variant="body2"
                          sx={{
                            display: 'block',
                            color: 'text.secondary',
                            fontSize: '0.875rem'
                          }}
                        >
                          {data.explanation}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Container>
  );
};
