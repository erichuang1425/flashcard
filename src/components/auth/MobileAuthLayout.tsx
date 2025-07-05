import React from 'react';
import { Box, Container, Typography, Paper, Theme } from '@mui/material';
import { motion, cubicBezier, AnimatePresence } from 'framer-motion';
import SchoolIcon from '@mui/icons-material/School';
import { useI18n } from '../../i18n/I18nContext';
import { useLocation, useNavigate } from 'react-router-dom';

export const MobileAuthLayout: React.FC<{
  children: React.ReactNode;
  onExit?: () => Promise<void>;
}> = ({ children, onExit }) => {
  const { t } = useI18n();
  const location = useLocation();
  const isRegisterPage = location.pathname === '/register';

  const bannerVariants = {
    initial: {
      height: '45%',
      opacity: 0,
      scale: 1.2,
      boxShadow: '0 0px 0px rgba(0,0,0,0)'
    },
    visible: {
      height: '98%',
      y: 0,
      opacity: 1,
      scale: 1,
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      transition: {
        height: {
          duration: 1.6,
          type: "spring",
          stiffness: 25,
          damping: 8,
          bounce: 0.4
        },
        opacity: {
          duration: 0.8
        },
        scale: {
          duration: 1.2,
          ease: "easeOut"
        },
        boxShadow: { duration: 1.2 }
      }
    },
    collapse: {
      height: '98%',
      y: '-50vh',
      transition: {
        delay: 1,
        duration: 0.8,
        type: "spring",
        stiffness: 40,
        damping: 15
      }
    },
    exit: {
      height: '45%',
      opacity: 0,
      scale: 1.2,
      transition: {
        height: {
          delay: 0.2,
          duration: 0.8,
          type: "spring",
          stiffness: 40,
          damping: 15
        },
        opacity: {
          duration: 0.4
        },
        scale: {
          duration: 0.8,
          ease: "easeIn"
        }
      }
    }
  };

  const brandingVariants = {
    initial: { 
      y: 0,
      opacity: 0,
      scale: 0.8
    },
    visible: {
      y: -10,
      opacity: 1,
      scale: 2,
      transition: {
        delay: 0.3,
        duration: 1.2,
        type: "spring",
        stiffness: 80,
        damping: 15
      }
    },
    collapse: {
      y: '20vh',
      scale: 0.85,
      transition: {
        delay: 1,
        duration: 0.8,
        type: "spring",
        stiffness: 100,
        damping: 20
      }
    },
    exit: {
      y: 50,
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.4,
        ease: "easeIn"
      }
    }
  };

  const contentVariants = {
    initial: { 
      y: 200,
      opacity: 0,
      scale: 0.7,
      rotateX: 40,
      z: -100
    },
    visible: { 
      y: 0,
      opacity: 1,
      scale: 1,
      rotateX: 0,
      z: 0,
      transition: {
        delay: 1.8,
        duration: 0.6,
        type: "spring",
        stiffness: 150,
        damping: 12,
        mass: 1.2,
        velocity: 2
      }
    },
    exit: {
      y: 100,
      opacity: 0,
      scale: 0.8,
      rotateX: -20,
      z: -50,
      transition: {
        duration: 0.4,
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    }
  };

  const iconVariants = {
    initial: { 
      scale: 0,
      opacity: 0,
      rotate: -180
    },
    visible: { 
      scale: 1,
      opacity: 1,
      rotate: 0,
      transition: {
        delay: 0.2,
        duration: 0.6,
        type: "spring",
        stiffness: 150,
        damping: 15
      }
    },
    exit: {
      scale: 0,
      opacity: 0,
      rotate: -180,
      transition: {
        delay: 0.1,
        duration: 0.4,
        type: "spring",
        stiffness: 200,
        damping: 15
      }
    }
  };

  const handleExit = async () => {
    if (onExit) {
      await onExit();
    }
  };

  return (
    <AnimatePresence mode="wait" onExitComplete={handleExit}>
      <Box
        component={motion.div}
        initial="initial"
        animate="visible"
        exit="exit"
        sx={{
          minHeight: '100dvh',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box
          sx={theme => ({
            position: 'absolute',
            top: -50,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            background: theme => `linear-gradient(135deg, 
              ${isRegisterPage ? theme.palette.secondary.dark : theme.palette.primary.dark},
              ${isRegisterPage ? theme.palette.secondary.main : theme.palette.primary.main}
            )`,
            borderBottomLeftRadius: '4rem',
            borderBottomRightRadius: '4rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translateZ(0)',
            overflow: 'hidden',
            transformOrigin: 'top',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          })}
          component={motion.div}
          variants={bannerVariants}
          animate={["visible", "collapse"]}
        >
          <motion.div
            variants={brandingVariants}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <motion.div variants={iconVariants}>
              <SchoolIcon 
                sx={{ 
                  fontSize: 52,
                  color: 'white',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                }} 
              />
            </motion.div>
            <Typography 
              variant="h4" 
              sx={{
                fontWeight: 700,
                textAlign: 'center',
                color: 'white',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)',
                fontSize: { xs: '1.8rem', sm: '2.5rem' }
              }}
            >
              {t('auth.branding.title')}
            </Typography>
          </motion.div>
        </Box>

        <Container
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            px: 2,
            pb: 4,
            pt: '57%',
            position: 'relative',
            zIndex: 1,
            perspective: '1200px',
            pointerEvents: 'none',
            '& > *': {
              pointerEvents: 'auto'
            },
            maxHeight: '100dvh',
            overflow: 'hidden'
          }}
        >
          <motion.div
            variants={contentVariants}
            style={{ 
              width: '100%',
              transformStyle: 'preserve-3d',
              maxHeight: 'calc(100dvh - 45%)',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 3 },
                borderRadius: 3,
                backdropFilter: 'blur(10px)',
                background: theme => 
                  theme.palette.mode === 'dark' 
                    ? 'rgba(25, 25, 25, 0.9)'
                    : 'rgba(255, 255, 255, 0.95)',
                boxShadow: theme => 
                  `0 20px 50px ${theme.palette.mode === 'dark' 
                    ? 'rgba(0,0,0,0.5)' 
                    : 'rgba(0,0,0,0.15)'},
                   0 10px 24px rgba(0,0,0,0.1)`,
                transform: 'translateZ(0)',
                transition: 'box-shadow 0.6s ease-out',
                '&:hover': {
                  boxShadow: theme =>
                    `0 25px 60px ${theme.palette.mode === 'dark'
                      ? 'rgba(0,0,0,0.6)'
                      : 'rgba(0,0,0,0.2)'},
                     0 12px 28px rgba(0,0,0,0.15)`
                },
                '& .MuiDivider-root': {
                  my: 1.5,
                },
                maxHeight: 'calc(100dvh - 45%)',
                overflow: 'auto',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: 'rgba(0,0,0,0.2)',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: 'transparent',
                }
              }}
            >
              {children}
            </Paper>
          </motion.div>
        </Container>
      </Box>
    </AnimatePresence>
  );
};