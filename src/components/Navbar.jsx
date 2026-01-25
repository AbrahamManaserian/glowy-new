'use client';

import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '../i18n/routing';
import { ShoppingBasketIcon } from './ShoppingBasketIcon';
import { useEffect, useState } from 'react';

const navItems = ['shop', 'makeup', 'fragrance', 'sale', 'gift cards', 'about'];
const languages = ['am', 'ru', 'en'];

function Navbar({ locale }) {
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prevState) => !prevState);
  };

  const changeLanguage = (newLocale) => {
    localStorage.setItem('preferredLanguage', newLocale);
    router.replace(pathname, { locale: newLocale });
  };

  useEffect(() => {
    localStorage.setItem('preferredLanguage', locale);
  }, [locale]);

  const getPath = (item) => {
    if (item === 'gift cards') return '/gift-cards';
    return `/${item}`;
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
      <Typography variant="h6" sx={{ my: 2, fontWeight: 300, letterSpacing: '.2rem' }}>
        GLOWY
      </Typography>
      <List>
        {navItems.map((item) => {
          const path = getPath(item);
          const isActive = pathname === path;
          return (
            <ListItem key={item} disablePadding>
              <ListItemButton sx={{ textAlign: 'center' }} component={Link} href={path}>
                <ListItemText
                  primary={t(item)}
                  primaryTypographyProps={{
                    color: isActive ? '#f44336' : 'inherit',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, p: 2 }}>
        {languages.map((lang) => (
          <Button
            key={lang}
            onClick={() => changeLanguage(lang)}
            sx={{
              minWidth: 'auto',
              fontWeight: locale === lang ? 'bold' : 'normal',
              color: 'text.primary',
            }}
          >
            {lang.toUpperCase()}
          </Button>
        ))}
      </Box>
    </Box>
  );

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{ borderBottom: '1px solid #eaeaea', bgcolor: 'background.paper' }}
    >
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          {/* Mobile Menu Icon */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleDrawerToggle}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
          </Box>

          {/* Desktop Logo */}
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 300,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: '1.5rem',
            }}
          >
            GLOWY
          </Typography>

          {/* Mobile Logo (Centered) */}
          <Typography
            variant="h5"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'monospace',
              fontWeight: 300,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
              fontSize: '1.2rem',
            }}
          >
            GLOWY
          </Typography>

          {/* Desktop Menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center', gap: 2 }}>
            {navItems.map((item) => {
              const path = getPath(item);
              const isActive = pathname === path;

              return (
                <Button
                  key={item}
                  component={Link}
                  href={path}
                  sx={{
                    my: 2,
                    color: isActive ? '#f44336' : 'text.primary',
                    display: 'block',
                    fontWeight: 400,
                    letterSpacing: '0.05rem',
                    '&:hover': {
                      backgroundColor: 'transparent',
                      textDecoration: 'underline',
                      color: isActive ? '#f44336' : 'text.primary',
                    },
                  }}
                >
                  {t(item)}
                </Button>
              );
            })}
          </Box>

          {/* Actions (Lang + Basket) */}
          <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
              {languages.map((lang) => (
                <Button
                  key={lang}
                  onClick={() => changeLanguage(lang)}
                  sx={{
                    minWidth: '30px',
                    padding: '0 5px',
                    fontWeight: locale === lang ? 'bold' : 'normal',
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                  }}
                >
                  {lang.toUpperCase()}
                </Button>
              ))}
            </Box>

            <IconButton sx={{ ml: 1 }}>
              <ShoppingBasketIcon color="#000" size="24" />
            </IconButton>
          </Box>
        </Toolbar>
      </Container>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
        }}
      >
        {drawer}
      </Drawer>
    </AppBar>
  );
}
export default Navbar;
