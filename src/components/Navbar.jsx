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
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import Collapse from '@mui/material/Collapse';

import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import PaymentOutlinedIcon from '@mui/icons-material/PaymentOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TranslateIcon from '@mui/icons-material/Translate';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import DashboardIcon from '@mui/icons-material/Dashboard';
import Avatar from '@mui/material/Avatar';

import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '../i18n/routing';
import { ShoppingBasketIcon } from './ShoppingBasketIcon';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';


const navItems = ['shop', 'makeup', 'fragrance', 'sale', 'gift cards', 'about'];
const languages = [
  { code: 'am', label: 'Հայերեն' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
];

function Navbar({ locale }) {
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorElUser, setAnchorElUser] = useState(null);
  const [langOpen, setLangOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen((prevState) => !prevState);
  };

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(event.currentTarget);
    setLangOpen(false); // Reset lang menu state
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const changeLanguage = (newLocale) => {
    localStorage.setItem('preferredLanguage', newLocale);
    router.replace(pathname, { locale: newLocale });
    handleCloseUserMenu();
  };

  useEffect(() => {
    localStorage.setItem('preferredLanguage', locale);
  }, [locale]);

  if (pathname && pathname.startsWith('/admin')) {
    return null;
  }

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
                    textTransform: 'capitalize',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  const menuItems = [
    { label: t('profile'), icon: <PersonOutlineIcon fontSize="small" />, link: '/profile' },
    { label: t('orders'), icon: <ShoppingBagOutlinedIcon fontSize="small" />, link: '/orders' },
    { label: t('wishlist'), icon: <FavoriteBorderIcon fontSize="small" />, link: '/wishlist' },
    ...(user?.role === 'admin'
      ? [{ label: 'Admin Panel', icon: <DashboardIcon fontSize="small" />, link: '/admin/dashboard' }]
      : []),
    ...(user
      ? [
          { label: t('settings'), icon: <SettingsOutlinedIcon fontSize="small" />, link: '/settings' },
          { label: t('payment'), icon: <PaymentOutlinedIcon fontSize="small" />, link: '/payment' },
        ]
      : []),
    { label: t('help'), icon: <HelpOutlineIcon fontSize="small" />, link: '/help' },
  ];

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        borderBottom: '1px solid #eaeaea',
        bgcolor: 'background.paper',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar || 1100,
      }}
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
                    textTransform: 'capitalize',
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

          {/* Actions (User Menu + Basket) */}
          <Box sx={{ flexGrow: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton sx={{ ml: 1 }}>
              <ShoppingBasketIcon color="#000" size="24" />
            </IconButton>
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              <Avatar
                sx={{ bgcolor: 'transparent', color: '#000', width: 32, height: 32 }}
                src={user?.photoURL}
                alt={user?.displayName || 'User'}
              >
                {!user?.photoURL && <PersonOutlineIcon sx={{ fontSize: 27 }} />}
              </Avatar>
            </IconButton>

            <Menu
              sx={{ mt: '45px' }}
              id="menu-appbar"
              anchorEl={anchorElUser}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElUser)}
              onClose={handleCloseUserMenu}
              PaperProps={{
                style: {
                  width: 250,
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 'bold' }}>
                  {user ? t('welcome', { name: user.displayName || user.email }) : t('welcome_guest')}
                </Typography>
                {user && user.email && (
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {user.email}
                  </Typography>
                )}
              </Box>
              <Divider />

              {menuItems.map((item) => (
                <MenuItem key={item.label} onClick={handleCloseUserMenu} component={Link} href={item.link}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </MenuItem>
              ))}

              <MenuItem onClick={() => setLangOpen(!langOpen)}>
                <ListItemIcon>
                  <TranslateIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={t('language')} />
                {langOpen ? <ExpandLess /> : <ExpandMore />}
              </MenuItem>
              <Collapse in={langOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {languages.map((lang) => (
                    <ListItemButton
                      key={lang.code}
                      sx={{ pl: 4 }}
                      onClick={() => changeLanguage(lang.code)}
                      selected={locale === lang.code}
                    >
                      <ListItemText primary={lang.label} />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>

              <Divider />

              {user ? (
                <MenuItem
                  onClick={() => {
                    logout();
                    handleCloseUserMenu();
                  }}
                >
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={t('logout')} />
                </MenuItem>
              ) : (
                <MenuItem onClick={handleCloseUserMenu} component={Link} href={`/signin?from=${pathname}`}>
                  <ListItemIcon>
                    <LoginIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={t('login')} />
                </MenuItem>
              )}
            </Menu>
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
