'use client';
import { Box, Typography } from '@mui/material';

export default function UserOrdersPage() {
  return (
    <Box>
      <Typography variant="h5" fontWeight="bold">
        Orders
      </Typography>
      <Typography color="text.secondary">Your orders will appear here.</Typography>
    </Box>
  );
}
