import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ImageIcon from '@mui/icons-material/Image';
import { useAuth } from '../../context/AuthContext';
import {
  batchDeleteArticles,
  setArticleCover,
} from '../../services/articleService';
import { Article } from '../../types/reading';
import { useI18n } from '../../i18n/I18nContext';

interface ManageArticlesTabProps {
  articles: Article[];
  onChanged: () => void | Promise<void>;
}

export const ManageArticlesTab: React.FC<ManageArticlesTabProps> = ({
  articles,
  onChanged,
}) => {
  const { user } = useAuth();
  const { t } = useI18n();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggleSelected = (articleId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      return next;
    });
  };

  const removeSelected = async () => {
    if (!user || selected.size === 0) return;
    setBusy(true);
    try {
      await batchDeleteArticles(user.uid, [...selected]);
      setSelected(new Set());
      await onChanged();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
        <Typography color="text.secondary">
          {t('reading.manage.selected', { count: selected.size })}
        </Typography>
        <Button
          color="error"
          startIcon={<DeleteIcon />}
          disabled={selected.size === 0 || busy}
          onClick={() => void removeSelected()}
        >
          {t('reading.manage.delete')}
        </Button>
      </Box>
      <List disablePadding>
        {articles.map((article) => (
          <ListItem
            key={article.id}
            divider
            secondaryAction={
              <Stack direction="row">
                <Tooltip title={t('reading.manage.cover')}>
                  <IconButton component="label">
                    <ImageIcon />
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (user && file) {
                          void setArticleCover(user.uid, article.id, file).then(
                            onChanged
                          );
                        }
                        event.target.value = '';
                      }}
                    />
                  </IconButton>
                </Tooltip>
                {article.coverImage ? (
                  <Tooltip title={t('reading.manage.removeCover')}>
                    <IconButton
                      onClick={() => {
                        if (user) {
                          void setArticleCover(user.uid, article.id, null).then(
                            onChanged
                          );
                        }
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </Stack>
            }
          >
            <Checkbox
              checked={selected.has(article.id)}
              onChange={() => toggleSelected(article.id)}
              inputProps={{ 'aria-label': article.title }}
            />
            <ListItemAvatar>
              <Avatar src={article.coverImage}>
                {article.title.charAt(0).toUpperCase()}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={article.title}
              secondary={`${article.category} · ${article.wordCount}`}
            />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
};
