'use client';
import { Box, Container, Stack } from '@mui/material';
import UserSidebar from '../../../components/UserSidebar';
import { useAuth } from '../../../context/AuthContext';
import { usePathname } from 'next/navigation';

export default function UserLayout({ children }) {
  const { user, loading } = useAuth();

  // Do NOT return null if loading or not user here, because the child pages (like profile)
  // handle the empty/loading states themselves (like showing "Sign in")
  // However, sidebar should probably only show if logged in, which we handle in the Sidebar component itself.

  if (loading) return null;

  return (
    <Container
      maxWidth="xl"
      sx={{
        mt: { xs: 2, md: 4 },
        mb: { xs: 2, md: 4 },
        px: { xs: 1, sm: 2, md: 3 },
      }}
    >
      <Stack direction="row" spacing={{ xs: 0, md: 3 }}>
        <Box sx={{ display: { xs: 'none', md: 'block' }, width: 280, flexShrink: 0 }}>
          <UserSidebar />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
      </Stack>
    </Container>
  );
}
