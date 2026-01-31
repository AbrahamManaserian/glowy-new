'use client';

import React, { useState, useRef } from 'react';
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  InputBase,
  Container,
  Typography,
  Paper,
  ClickAwayListener,
  MenuList,
  MenuItem,
  Popper,
  Grow,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import { useCategories } from '../context/CategoriesContext';
import { useTranslations } from 'next-intl';
import { useRouter } from '../i18n/navigation';
import { useSearchParams } from 'next/navigation';

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.black, 0.03),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.black, 0.06),
  },
  marginRight: 0,
  marginLeft: theme.spacing(2),
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
  },
  width: '100%',
  display: 'flex',
  flexGrow: 1,
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.secondary,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
  },
}));

export default function CategoriesBar() {
  const t = useTranslations('Categories');
  const tCats = useTranslations('CategoryNames'); // For dynamic category names
  const { categories, loading } = useCategories();
  const router = useRouter();
  const searchParams = useSearchParams();
  const anchorRef = useRef(null);

  // Categories Menu State
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
      return;
    }
    setOpen(false);
    setActiveCategory(null);
  };

  function handleListKeyDown(event) {
    if (event.key === 'Tab') {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  }

  const handleCategoryHover = (key) => {
    if (activeCategory !== key) {
      setActiveCategory(key);
    }
  };

  const categoryKeys = Object.keys(categories);

  const currentCat = searchParams.get('category');
  const currentSub = searchParams.get('subcategory');
  const currentType = searchParams.get('type')?.trim();

  // Navigate to category page
  const handleCategoryClick = (key) => {
    router.push(`/shop?category=${key}`);
    setOpen(false);
  };

  return (
    <AppBar
      position="static"
      color="default"
      elevation={0}
      sx={{
        borderColor: 'divider',
        bgcolor: 'background.paper',
        zIndex: 900,
        display: 'block',
        maxWidth: 1200,
        margin: '0 auto',
        padding: 0,
      }}
    >
      {/* <Container sx={{ padding: 0 }} maxWidth="xl"> */}
      <Toolbar disableGutters variant="dense" sx={{ minHeight: '60px !important', px: '15px' }}>
        {/* Categories Button */}
        <Box sx={{ position: 'relative', display: { xs: 'none', md: 'block' } }}>
          <Button
            ref={anchorRef}
            id="composition-button"
            aria-controls={open ? 'composition-menu' : undefined}
            aria-expanded={open ? 'true' : undefined}
            aria-haspopup="true"
            onClick={handleToggle}
            color="inherit"
            startIcon={<MenuIcon />}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 2,
              px: 2,
              mr: 2,
              height: 40,
              color: 'text.secondary',
              bgcolor: open ? 'action.hover' : 'transparent',
              '&:hover': {
                bgcolor: 'action.hover',
                color: 'text.primary',
              },
            }}
          >
            {t('title')}
          </Button>
          <Popper
            open={open}
            anchorEl={anchorRef.current}
            role={undefined}
            placement="bottom-start"
            transition
            disablePortal
            sx={{ zIndex: 1300 }}
          >
            {({ TransitionProps, placement }) => (
              <Grow
                {...TransitionProps}
                style={{
                  transformOrigin: placement === 'bottom-start' ? 'left top' : 'left bottom',
                  marginTop: '10px',
                }}
              >
                <Paper
                  sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    overflow: 'hidden',
                    boxShadow: 4,
                    borderRadius: 2,
                  }}
                >
                  <ClickAwayListener onClickAway={handleClose}>
                    <Box sx={{ display: 'flex' }}>
                      {/* Left Column: Categories */}
                      <MenuList
                        autoFocusItem={open}
                        id="composition-menu"
                        aria-labelledby="composition-button"
                        onKeyDown={handleListKeyDown}
                        sx={{ minWidth: 250, py: 1, bgcolor: 'grey.50' }}
                      >
                        {loading ? (
                          <MenuItem disabled>Loading...</MenuItem>
                        ) : (
                          categoryKeys.map((key) => {
                            const isCurrent = currentCat === key;
                            return (
                              <MenuItem
                                key={key}
                                onMouseEnter={() => handleCategoryHover(key)}
                                onClick={() => handleCategoryClick(key)}
                                selected={activeCategory === key}
                                sx={{
                                  justifyContent: 'space-between',
                                  py: 1.5,
                                  px: 3,
                                  // Fix hover/selected visual jumping
                                  '&.Mui-selected': {
                                    bgcolor: 'background.paper',
                                    color: 'primary.main',
                                    fontWeight: 'bold',
                                  },
                                  '&.Mui-selected:hover': { bgcolor: 'background.paper' },
                                  '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
                                  color: !activeCategory && isCurrent ? 'var(--active-color)' : 'inherit',
                                }}
                                disableRipple
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 'inherit',
                                    color:
                                      isCurrent && activeCategory !== key ? 'var(--active-color)' : 'inherit',
                                  }}
                                >
                                  {/* Use translation */}
                                  {tCats(key)}
                                </Typography>
                                {categories[key].subcategories && <KeyboardArrowRightIcon fontSize="small" />}
                              </MenuItem>
                            );
                          })
                        )}
                      </MenuList>

                      {/* Right Column: Subcategories (Mega Menu Panel) */}
                      {activeCategory && categories[activeCategory]?.subcategories && (
                        <Box
                          ref={(node) => {
                            if (node) node.scrollTop = 0;
                          }}
                          sx={{
                            p: 4,
                            bgcolor: 'background.paper',
                            width: { md: 'calc(100vw - 280px)', lg: 920 },
                            maxWidth: '100%',
                            minHeight: 450,
                            overflowY: 'auto',
                          }}
                        >
                          {/* Grid Layout for Subcategories */}
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(4, 1fr)',
                              gap: 4,
                            }}
                          >
                            {Object.entries(categories[activeCategory].subcategories).map(
                              ([subKey, subVal]) => {
                                const isSubActive = currentCat === activeCategory && currentSub === subKey;
                                return (
                                  <Box key={subKey}>
                                    <Typography
                                      variant="subtitle2"
                                      sx={{
                                        fontWeight: 'bold',
                                        mb: 2,
                                        fontSize: '0.95rem',
                                        cursor: 'pointer',
                                        color: isSubActive ? 'var(--active-color)' : 'inherit',
                                        '&:hover': { color: 'var(--active-color)' },
                                      }}
                                      onClick={() => {
                                        router.push(`/shop?category=${activeCategory}&subcategory=${subKey}`);
                                        setOpen(false);
                                      }}
                                    >
                                      {/* Use translation for subcategory */}
                                      {tCats(subKey)}
                                    </Typography>

                                    {/* List of Types */}
                                    {subVal.types && Array.isArray(subVal.types) && (
                                      <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
                                        {subVal.types.map((type) => {
                                          const isTypeActive =
                                            currentCat === activeCategory &&
                                            currentSub === subKey &&
                                            currentType === type;
                                          return (
                                            <Box component="li" key={type} sx={{ mb: 1 }}>
                                              <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                  cursor: 'pointer',
                                                  '&:hover': {
                                                    color: 'var(--active-color)',
                                                    textDecoration: 'underline',
                                                  },
                                                  fontSize: '0.875rem',
                                                  color: isTypeActive
                                                    ? 'var(--active-color)'
                                                    : 'text.secondary',
                                                  textDecoration: isTypeActive ? 'underline' : 'none',
                                                }}
                                                onClick={() => {
                                                  router.push(
                                                    `/shop?category=${activeCategory}&subcategory=${subKey}&type=${encodeURIComponent(type)}`,
                                                  );
                                                  setOpen(false);
                                                }}
                                              >
                                                {/* Try to translate type as well */}
                                                {tCats(type)}
                                              </Typography>
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    )}
                                  </Box>
                                );
                              },
                            )}
                          </Box>
                        </Box>
                      )}
                    </Box>
                  </ClickAwayListener>
                </Paper>
              </Grow>
            )}
          </Popper>
        </Box>

        {/* Search Bar */}
        <Search sx={{ borderRadius: 2 }}>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <StyledInputBase placeholder={t('search_placeholder')} inputProps={{ 'aria-label': 'search' }} />
        </Search>
      </Toolbar>
      {/* </Container> */}
    </AppBar>
  );
}
