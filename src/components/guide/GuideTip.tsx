import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  ClickAwayListener,
  Fade,
  Paper,
  Popper,
  Typography,
  useTheme,
} from '@mui/material';
import type { PopperPlacementType } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { useGuide } from '../../context/GuideContext';
import { useLanguage } from '../../i18n/LanguageContext';

interface GuideTipProps {
  /** Stable id so a dismissed tip stays dismissed across sessions. */
  id: string;
  /** Lower numbers show first when several tips share a screen. */
  order: number;
  /** Short heading for the callout. */
  title: string;
  /** One or two sentences explaining the feature being pointed at. */
  body: string;
  /** Where the callout sits relative to the highlighted target. */
  placement?: PopperPlacementType;
  /** The control this tip is teaching — highlighted while the tip is active. */
  children: React.ReactNode;
}

/**
 * A contextual coach mark. It renders its child control inline (untouched) and,
 * when this is the active tip, draws attention with a soft pulsing ring plus an
 * anchored callout that the user dismisses with "Got it". The callout also
 * offers a one-tap way to switch every tip off, so guidance never becomes a
 * nuisance.
 */
export const GuideTip: React.FC<GuideTipProps> = ({
  id,
  order,
  title,
  body,
  placement = 'bottom',
  children,
}) => {
  const theme = useTheme();
  const { t } = useLanguage();
  const { activeTipId, registerTip, unregisterTip, dismissTip, setTipsEnabled } =
    useGuide();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Register on mount / unregister on unmount so the sequencer only ever
  // considers tips whose target is actually on screen right now.
  const orderRef = useRef(order);
  orderRef.current = order;
  useEffect(() => {
    registerTip({ id, order: orderRef.current });
    return () => unregisterTip(id);
  }, [id, registerTip, unregisterTip]);

  const open = activeTipId === id && Boolean(anchorEl);

  return (
    <>
      <Box
        ref={setAnchorEl}
        sx={{
          display: 'inline-block',
          position: 'relative',
          width: '100%',
          borderRadius: 2,
          transition: 'box-shadow 0.2s ease',
          ...(open && {
            // A gentle, looping highlight ring that says "look here" without the
            // jarring full-screen overlay of a modal tour.
            animation: 'guideTipPulse 1.8s ease-in-out infinite',
            '@keyframes guideTipPulse': {
              '0%, 100%': {
                boxShadow: `0 0 0 3px ${theme.palette.primary.main}55`,
              },
              '50%': {
                boxShadow: `0 0 0 7px ${theme.palette.primary.main}22`,
              },
            },
          }),
        }}
      >
        {children}
      </Box>

      <Popper
        open={open}
        anchorEl={anchorEl}
        placement={placement}
        transition
        // Keep the callout clear of the highlighted control and inside the
        // viewport on small screens.
        modifiers={[
          { name: 'offset', options: { offset: [0, 12] } },
          { name: 'preventOverflow', options: { padding: 8 } },
          { name: 'flip', options: { padding: 8 } },
        ]}
        sx={{ zIndex: theme.zIndex.tooltip }}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={200}>
            <Paper
              elevation={8}
              sx={{
                maxWidth: 300,
                p: 2,
                borderRadius: 3,
                border: `1px solid ${theme.palette.primary.main}33`,
              }}
            >
              <ClickAwayListener onClickAway={() => { /* keep open until dismissed */ }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LightbulbIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {title}
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ lineHeight: 1.6, mb: 1.5 }}
                  >
                    {body}
                  </Typography>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                    }}
                  >
                    <Button
                      size="small"
                      onClick={() => setTipsEnabled(false)}
                      sx={{ color: 'text.secondary', textTransform: 'none' }}
                    >
                      {t('guide.turnOff')}
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => dismissTip(id)}
                    >
                      {t('guide.gotIt')}
                    </Button>
                  </Box>
                </Box>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  );
};
