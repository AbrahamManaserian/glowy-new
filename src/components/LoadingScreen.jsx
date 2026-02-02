'use client';

import React from 'react';
import { Box, CircularProgress } from '@mui/material';


export default function LoadingScreen({ transparent = false }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100%',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999,
        bgcolor: transparent ? 'rgba(255, 255, 255, 0.5)' : 'background.default',
        // backdropFilter: transparent ? 'blur(2px)' : 'none',
      }}
    >
      <CircularProgress />
    </Box>
  );
}
