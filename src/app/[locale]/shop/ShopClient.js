'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../../../i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  Box,
  Container,
  Typography,
  Breadcrumbs,
  Link,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Drawer,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import FilterListIcon from '@mui/icons-material/FilterList';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import FilterSidebar from '../../../components/Shop/FilterSidebar';
import ProductGrid from '../../../components/Shop/ProductGrid';
import { CustomPagination } from '../../../components/CustomPagination';

import { useCategories } from '../../../context/CategoriesContext';
import { useUI } from '../../../context/UIContext';

export default function ShopClient({ initialProducts, searchParams, pagination }) {
  const t = useTranslations('Shop');

  const tCats = useTranslations('CategoryNames');
  const router = useRouter();
  const filterSidebarRef = useRef(null);

  // We need to sync with searchParams prop passed from server for initial state
  const { categories } = useCategories();
  const { activeMobileMenu, toggleMenu, closeMobileMenus } = useUI();

  const mobileOpen = activeMobileMenu === 'filter';

  // Parse params helper
  const getParam = (key) => searchParams?.[key];
  const getAllParams = (key) => {
    const val = searchParams?.[key];
    if (Array.isArray(val)) return val;
    if (val) return [val];
    return [];
  };

  const [sortBy, setSortBy] = useState(getParam('sort') || 'default');

  // State for filters derived from props/URL
  // We use local state to manage the UI controls
  const [filters, setFilters] = useState({
    priceRange: [Number(getParam('minPrice')) || 0, Number(getParam('maxPrice')) || ''],
    discounted: getParam('discounted') === 'true',
    categories: getAllParams('category'),
    subcategories: getAllParams('subcategory'),
    types: getAllParams('type'),
    notes: getAllParams('notes'),
    brands: getAllParams('brands'),
    sizes: getAllParams('sizes'),
    originalBrand: getParam('originalBrand') === 'true',
    onlyStock: getParam('onlyStock') === 'true',
  });

  // Sync state with searchParams when they change (if client-side navigation happens)
  useEffect(() => {
    // Logic to re-sync if props change deeply
    setFilters({
      priceRange: [Number(getParam('minPrice')) || 0, Number(getParam('maxPrice')) || ''],
      discounted: getParam('discounted') === 'true',
      categories: getAllParams('category'),
      subcategories: getAllParams('subcategory'),
      types: getAllParams('type'),
      notes: getAllParams('notes'),
      brands: getAllParams('brands'),
      sizes: getAllParams('sizes'),
      originalBrand: getParam('originalBrand') === 'true',
      onlyStock: getParam('onlyStock') === 'true',
    });
    setSortBy(getParam('sort') || 'default');
  }, [searchParams]);

  const handleDrawerToggle = () => {
    toggleMenu('filter');
  };

  const handleSortChange = (event) => {
    const value = event.target.value;
    setSortBy(value);
    updateUrl({ ...filters, sort: value }, 1); // Reset to page 1 on sort
  };

  const handleApplyFilters = (newFilters) => {
    updateUrl({ ...newFilters, sort: sortBy }, 1); // Reset to page 1 on filter
    closeMobileMenus();
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      priceRange: [0, ''],
      discounted: false,
      categories: [],
      subcategories: [],
      types: [],
      brands: [],
      sizes: [],
      originalBrand: false,
      onlyStock: false,
      sort: 'default',
    };
    router.push('/shop');
  };

  const updateUrl = (currentFilters, page = 1) => {
    const params = new URLSearchParams();

    if (page > 1) params.set('page', page.toString());

    if (currentFilters.sort && currentFilters.sort !== 'default') params.set('sort', currentFilters.sort);

    if (currentFilters.priceRange) {
      if (currentFilters.priceRange[0] > 0) params.set('minPrice', currentFilters.priceRange[0]);
      if (currentFilters.priceRange[1]) params.set('maxPrice', currentFilters.priceRange[1]);
    }

    if (currentFilters.discounted) params.set('discounted', 'true');
    if (currentFilters.originalBrand) params.set('originalBrand', 'true');
    if (currentFilters.onlyStock) params.set('onlyStock', 'true');

    (currentFilters.categories || []).forEach((c) => params.append('category', c));
    (currentFilters.notes || []).forEach((c) => params.append('notes', c));
    (currentFilters.subcategories || []).forEach((s) => params.append('subcategory', s));
    (currentFilters.types || []).forEach((t) => params.append('type', t));
    (currentFilters.brands || []).forEach((b) => params.append('brands', b));
    (currentFilters.sizes || []).forEach((s) => params.append('sizes', s));

    router.push(`/shop?${params.toString()}`);
  };

  const handlePageChange = (event, targetPage) => {
    // Determine direction and cursor
    const params = new URLSearchParams(window.location.search);
    const currentPage = Number(getParam('page')) || 1;

    // Clear old cursor params
    params.delete('cursorId');
    params.delete('direction');
    params.set('page', targetPage.toString());

    // Logic:
    // 1. First Page: Direct
    // 2. Last Page: Direct
    // 3. Next Page (Sibling): Use last item of current list as cursor
    // 4. Prev Page (Sibling): Use first item of current list as cursor

    // We need current products range to determine cursors
    // initialProducts from props contains the current page's items
    const currentProducts = initialProducts || [];
    const firstItem = currentProducts[0];
    const lastItem = currentProducts[currentProducts.length - 1];

    if (targetPage === 1) {
      // Go to First Page (Clean URL)
      // No cursor needed
    } else if (pagination && targetPage === pagination.totalPages) {
      // Go to Last Page
      params.set('direction', 'last');
    } else if (targetPage > currentPage && lastItem) {
      // Next Page (or forward sibling)
      // Standard Firestore pagination usually only supports Next/Prev by 1 page unless we have cursors for others.
      // Given user constraint, we assume sequential or close jumps.
      // However, if I jump from 2 to 4, I can't use Page 2's cursor...
      // BUT user said "available pages are... siblings".
      // If I am at 2, available are 1, 3, Last.
      // So I only ever jump to 3 (which is Next).
      params.set('direction', 'next');
      params.set('cursorId', lastItem.id);
    } else if (targetPage < currentPage && firstItem) {
      // Prev Page (or backward sibling)
      params.set('direction', 'prev');
      params.set('cursorId', firstItem.id);
    }

    router.push(`/shop?${params.toString()}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasParams = Object.keys(searchParams || {}).some((k) => !['locale'].includes(k));

  // Breadcrumbs logic
  const breadcrumbs = [];
  const activeCategory = filters.categories?.[0];
  const activeSubCategory = filters.subcategories?.[0];
  const activeTypes = filters.types || [];

  const categoryLabel = activeCategory
    ? tCats.has(activeCategory)
      ? tCats(activeCategory)
      : categories[activeCategory]?.label
    : null;

  const subCategoryLabel =
    activeCategory && activeSubCategory
      ? tCats.has(activeSubCategory)
        ? tCats(activeSubCategory)
        : categories[activeCategory]?.subcategories?.[activeSubCategory]?.label || activeSubCategory
      : activeSubCategory;

  // Breadcrumbs Construction
  if (activeCategory || activeSubCategory || activeTypes.length > 0) {
    breadcrumbs.push(
      <Link
        key="shop"
        underline="hover"
        color="inherit"
        onClick={() => {
          router.push('/shop');
        }}
        sx={{ cursor: 'pointer' }}
      >
        {t('title')}
      </Link>,
    );
  } else {
    breadcrumbs.push(
      <Typography key="shop" color="text.primary">
        {t('title')}
      </Typography>,
    );
  }

  if (activeCategory) {
    if (activeSubCategory || activeTypes.length > 0) {
      breadcrumbs.push(
        <Link
          key="cat"
          underline="hover"
          color="inherit"
          onClick={() => {
            updateUrl({ ...filters, subcategories: [], types: [] });
          }}
          sx={{ cursor: 'pointer' }}
        >
          {categoryLabel}
        </Link>,
      );
    } else {
      breadcrumbs.push(
        <Typography key="cat" color="text.primary">
          {categoryLabel}
        </Typography>,
      );
    }
  }

  if (activeSubCategory) {
    if (activeTypes.length > 0) {
      breadcrumbs.push(
        <Link
          key="sub"
          underline="hover"
          color="inherit"
          onClick={() => {
            updateUrl({ ...filters, types: [] });
          }}
          sx={{ cursor: 'pointer' }}
        >
          {subCategoryLabel}
        </Link>,
      );
    } else {
      breadcrumbs.push(
        <Typography key="sub" color="text.primary">
          {subCategoryLabel}
        </Typography>,
      );
    }
  }

  if (activeTypes.length > 0) {
    breadcrumbs.push(
      <Typography key="types" color="text.primary">
        {activeTypes.map((type) => (tCats.has(type) ? tCats(type) : type)).join(', ')}
      </Typography>,
    );
  }

  return (
    <Container maxWidth="xl" sx={{ p: { xs: '10px', sm: 4 }, position: 'relative' }}>
      {/* Header & Breadcrumbs */}
      <Box sx={{ mb: 4 }}>
        {hasParams && (
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
            sx={{ mb: '1px', '& .MuiTypography-root': { fontSize: '0.775rem' } }}
          >
            {breadcrumbs}
          </Breadcrumbs>
        )}

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
          }}
        >
          <Typography sx={{ my: '5px' }} variant="h6" component="h1" fontWeight="bold">
            {activeCategory ? categoryLabel : t('title')}
          </Typography>

          {/* Desktop Sort By */}
          <FormControl
            size="small"
            sx={{
              width: '150px',
              maxWidth: '50%',
              minWidth: 0,
              display: { xs: 'none', md: 'inline-flex' },
              '& .MuiOutlinedInput-root': { borderRadius: 12, height: 32 },
            }}
          >
            <InputLabel>{t('sort_by')}</InputLabel>
            <Select value={sortBy} label={t('sort_by')} onChange={handleSortChange}>
              <MenuItem value="default">{t('sort.default')}</MenuItem>
              <MenuItem value="price-asc">{t('sort.price_asc')}</MenuItem>
              <MenuItem value="price-desc">{t('sort.price_desc')}</MenuItem>
              <MenuItem value="newest">{t('sort.newest')}</MenuItem>
              <MenuItem value="oldest">{t('sort.oldest')}</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Mobile Filter & Sort Row */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'space-between', gap: 1, my: '5px' }}>
          <Button
            size="small"
            // variant="outlined"
            startIcon={<TuneIcon />}
            onClick={handleDrawerToggle}
            sx={{ fontSize: '16px', p: 0 }}
          >
            {t('filter')}
          </Button>
          <FormControl
            size="small"
            sx={{
              width: '150px',
              maxWidth: '50%',
              minWidth: 0,
              flex: 'none',
              '& .MuiOutlinedInput-root': { borderRadius: 12, height: 30 },
            }}
          >
            <InputLabel>{t('sort_by')}</InputLabel>
            <Select value={sortBy} label={t('sort_by')} onChange={handleSortChange}>
              <MenuItem value="default">{t('sort.default')}</MenuItem>
              <MenuItem value="price-asc">{t('sort.price_asc')}</MenuItem>
              <MenuItem value="price-desc">{t('sort.price_desc')}</MenuItem>
              <MenuItem value="newest">{t('sort.newest')}</MenuItem>
              <MenuItem value="oldest">{t('sort.oldest')}</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {hasParams && (
          <Button sx={{ p: 0 }} size="small" color="error" onClick={handleResetFilters}>
            {t('reset_filters')}
          </Button>
        )}
      </Box>

      <Grid container spacing={4}>
        {/* Desktop Sidebar */}
        <Grid size={{ md: 3, lg: 3 }} sx={{ display: { xs: 'none', md: 'block' } }}>
          <FilterSidebar
            currentFilters={filters}
            showDetailedFilters={true}
            onApplyFilters={handleApplyFilters}
            onResetFilters={handleResetFilters}
          />
        </Grid>

        {/* Mobile Drawer Sidebar */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            zIndex: (theme) => theme.zIndex.drawer,
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: '100%',
              top: { xs: '56px', sm: '64px' },
              height: { xs: 'calc(100% - 56px)', sm: 'calc(100% - 64px)' },
              boxShadow: 'none',
            },
            '& .MuiBackdrop-root': {
              top: { xs: '56px', sm: '64px' },
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: '5px 10px',
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: 100,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            {/* Replaced 'Filter' title with 'Apply' button functionality */}
            <IconButton onClick={handleDrawerToggle}>
              <CloseIcon />
            </IconButton>
            <Button
              sx={{ fontWeight: 'bold' }}
              variant="text"
              onClick={() => {
                if (filterSidebarRef.current) {
                  filterSidebarRef.current.submit();
                  // We close mobile menu inside handleApplyFilters too, but good to be safe
                }
              }}
            >
              {t('apply_filters')}
            </Button>
          </Box>
          <Box sx={{ height: 'calc(100% - 60px)' }}>
            <FilterSidebar
              ref={filterSidebarRef}
              currentFilters={filters}
              showDetailedFilters={true}
              onApplyFilters={(f) => {
                handleApplyFilters(f);
                closeMobileMenus();
              }}
              onResetFilters={handleResetFilters}
            />
          </Box>
        </Drawer>

        {/* Product Grid */}
        <Grid size={{ xs: 12, md: 9, lg: 9 }}>
          <ProductGrid products={initialProducts} />

          {pagination && pagination.totalPages > 1 && (
            <CustomPagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              handlePageChange={handlePageChange}
            />
          )}
        </Grid>
      </Grid>
    </Container>
  );
}
