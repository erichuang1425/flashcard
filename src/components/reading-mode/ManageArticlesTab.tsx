import React, { useState } from 'react';
import {
  Box,
  Typography,
  Checkbox,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Alert,
  LinearProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { batchDeleteArticles } from '../../services/articleService';
import { format } from 'date-fns';
import { Article } from '../../context/ReadingModeContext';
import { logger } from '../../services/logging';

interface ManageArticlesTabProps {
  articles: Article[];
  onArticlesDeleted: () => void;
}

export const ManageArticlesTab: React.FC<ManageArticlesTabProps> = ({ articles, onArticlesDeleted }) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(articles.map(article => article.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleDelete = async () => {
    if (!user || !selected.length) return;

    try {
      setIsDeleting(true);
      

      await batchDeleteArticles(user.uid, selected);

      // Clear selection and update UI
      setSelected([]);
      onArticlesDeleted();
    } catch (err) {
      setError(t('reading.manage.error.deleteFailed'));
      logger.error('Failed to delete articles', err as Error, {
        userId: user.uid,
        selectedCount: selected.length
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {t('reading.manage.title')} ({articles.length})
        </Typography>
        {selected.length > 0 && (
          <Button
            startIcon={<DeleteIcon />}
            color="error"
            onClick={() => setDeleteDialogOpen(true)}
          >
            {t('reading.manage.deleteSelected', { values:{values: selected.length }})}
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < articles.length}
                  checked={articles.length > 0 && selected.length === articles.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>{t('reading.manage.columns.title')}</TableCell>
              <TableCell>{t('reading.manage.columns.category')}</TableCell>
              <TableCell>{t('reading.manage.columns.wordCount')}</TableCell>
              <TableCell>{t('reading.manage.columns.lastRead')}</TableCell>
              <TableCell>{t('reading.manage.columns.progress')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {articles.map((article) => (
              <TableRow 
                key={article.id}
                hover
                selected={selected.includes(article.id)}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.includes(article.id)}
                    onChange={() => handleSelect(article.id)}
                  />
                </TableCell>
                <TableCell>{article.title}</TableCell>
                <TableCell>{article.category}</TableCell>
                <TableCell>{article.wordCount}</TableCell>
                <TableCell>
                  {article.lastRead 
                    ? format(article.lastRead, 'PP')
                    : t('reading.manage.never')}
                </TableCell>
                <TableCell>
                  {article.progress.completed ? (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      color: 'success.main',
                      gap: 1 
                    }}>
                      <CheckCircleIcon fontSize="small" />
                      {/* Access wordsRead/wordCount instead of progress property */}
                      {`${Math.round((article.progress.wordsRead / article.wordCount) * 100)}%`}
                    </Box>
                  ) : (
                    `${Math.round((article.progress.wordsRead / article.wordCount) * 100)}%`
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          {t('reading.manage.deleteConfirmTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {t('reading.manage.deleteConfirmMessage', { values:{values: selected.length }})}
          </Typography>
          {isDeleting && <LinearProgress sx={{ mt: 2 }} />}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            disabled={isDeleting}
          >
            {t('reading.manage.confirmDelete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};