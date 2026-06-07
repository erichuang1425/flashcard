import React from 'react';
import { Box, ToggleButton, ToggleButtonGroup } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { useLanguage } from '../i18n/LanguageContext';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, Language } from '../i18n/translations';

/**
 * Compact language toggle for the auth screens, so a brand-new visitor can
 * read the page in their language before they have an account or preferences.
 */
export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TranslateIcon fontSize="small" color="action" />
      <ToggleButtonGroup
        size="small"
        exclusive
        value={language}
        onChange={(_, next: Language | null) => {
          if (next) setLanguage(next);
        }}
        aria-label="Select language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <ToggleButton key={lang} value={lang} sx={{ textTransform: 'none', px: 1.5 }}>
            {LANGUAGE_NAMES[lang]}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};
