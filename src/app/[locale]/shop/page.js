'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '../../../i18n/routing';
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
  Stack,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

import FilterSidebar from '../../../components/Shop/FilterSidebar';
import ProductGrid from '../../../components/Shop/ProductGrid';

import { useCategories } from '../../../context/CategoriesContext';

export default function ShopPage() {
  const t = useTranslations('Shop');
  const tPages = useTranslations('Pages');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { categories } = useCategories(); // Get categories for labels

  // Determine if we have active filters/params
  // Note: 'page' and 'sort' might be params but don't necessarily trigger "Detailed Filter View" if that's what user means.
  // But usually any param implies filtering.
  const hasParams = Array.from(searchParams.keys()).some((key) =>
    [
      'category',
      'subcategory',
      'type',
      'minPrice',
      'maxPrice',
      'discounted',
      'brands',
      'sizes',
      'q',
    ].includes(key),
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default');

  // State for filters derived from URL
  const [filters, setFilters] = useState({
    priceRange: [Number(searchParams.get('minPrice')) || 0, Number(searchParams.get('maxPrice')) || 1000],
    discounted: searchParams.get('discounted') === 'true',
    categories: searchParams.getAll('category'),
    subcategories: searchParams.getAll('subcategory'),
    types: searchParams.getAll('type'),
    brands: searchParams.getAll('brands'),
    sizes: searchParams.getAll('sizes'),
    originalBrand: searchParams.get('originalBrand') === 'true',
    onlyStock: searchParams.get('onlyStock') === 'true',
  });

  // Update filters when URL params change
  useEffect(() => {
    setFilters({
      priceRange: [Number(searchParams.get('minPrice')) || 0, Number(searchParams.get('maxPrice')) || 1000],
      discounted: searchParams.get('discounted') === 'true',
      categories: searchParams.getAll('category'),
      subcategories: searchParams.getAll('subcategory'),
      types: searchParams.getAll('type'),
      brands: searchParams.getAll('brands'),
      sizes: searchParams.getAll('sizes'),
      originalBrand: searchParams.get('originalBrand') === 'true',
      onlyStock: searchParams.get('onlyStock') === 'true',
    });
    setSortBy(searchParams.get('sort') || 'default');
  }, [searchParams]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSortChange = (event) => {
    const value = event.target.value;
    setSortBy(value);
    updateUrl({ ...filters, sort: value });
  };

  const handleApplyFilters = (newFilters) => {
    updateUrl({ ...newFilters, sort: sortBy });
    setMobileOpen(false);
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      priceRange: [0, 1000],
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
    setFilters(defaultFilters); // Optimistic update
    router.push('/shop');
  };

  const updateUrl = (currentFilters) => {
    const params = new URLSearchParams();

    if (currentFilters.sort && currentFilters.sort !== 'default') params.set('sort', currentFilters.sort);

    if (currentFilters.priceRange) {
      if (currentFilters.priceRange[0] > 0) params.set('minPrice', currentFilters.priceRange[0]);
      if (currentFilters.priceRange[1] < 1000) params.set('maxPrice', currentFilters.priceRange[1]);
    }

    if (currentFilters.discounted) params.set('discounted', 'true');
    if (currentFilters.originalBrand) params.set('originalBrand', 'true');
    if (currentFilters.onlyStock) params.set('onlyStock', 'true');

    (currentFilters.categories || []).forEach((c) => params.append('category', c));
    (currentFilters.subcategories || []).forEach((s) => params.append('subcategory', s));
    (currentFilters.types || []).forEach((t) => params.append('type', t));
    (currentFilters.brands || []).forEach((b) => params.append('brands', b));
    (currentFilters.sizes || []).forEach((s) => params.append('sizes', s));

    router.push(`/shop?${params.toString()}`);
  };

  // Breadcrumbs
  const breadcrumbs = [
    <Link
      key="home"
      underline="hover"
      color="inherit"
      onClick={() => router.push('/')}
      sx={{ cursor: 'pointer' }}
    >
      Home
    </Link>,
  ];

  const activeCategory = filters.categories?.[0];
  const activeSubCategory = filters.subcategories?.[0];
  const activeTypes = filters.types || [];

  // Data helpers
  const categoryLabel = activeCategory ? categories[activeCategory]?.label || activeCategory : null;
  const subCategoryLabel =
    activeCategory && activeSubCategory && categories[activeCategory]?.subcategories?.[activeSubCategory]
      ? categories[activeCategory].subcategories[activeSubCategory].label || activeSubCategory
      : activeSubCategory;

  // 1. Shop Link/Text
  if (activeCategory || activeSubCategory || activeTypes.length > 0) {
    breadcrumbs.push(
      <Link
        key="shop"
        underline="hover"
        color="inherit"
        onClick={() => router.push('/shop')}
        sx={{ cursor: 'pointer' }}
      >
        Shop
      </Link>,
    );
  } else {
    breadcrumbs.push(
      <Typography key="shop" color="text.primary">
        Shop
      </Typography>,
    );
  }

  // 2. Category Link/Text
  if (activeCategory) {
    if (activeSubCategory || activeTypes.length > 0) {
      breadcrumbs.push(
        <Link
          key="cat"
          underline="hover"
          color="inherit"
          onClick={() => updateUrl({ ...filters, subcategories: [], types: [] })}
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

  // 3. Subcategory Link/Text
  if (activeSubCategory) {
    if (activeTypes.length > 0) {
      breadcrumbs.push(
        <Link
          key="sub"
          underline="hover"
          color="inherit"
          onClick={() => updateUrl({ ...filters, types: [] })}
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

  // 4. Types Text
  if (activeTypes.length > 0) {
    breadcrumbs.push(
      <Typography key="types" color="text.primary">
        {activeTypes.join(', ')}
      </Typography>,
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header & Breadcrumbs */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} aria-label="breadcrumb" sx={{ mb: 2 }}>
          {breadcrumbs}
        </Breadcrumbs>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
          }}
        >
          <Typography variant="h4" component="h1" fontWeight="bold">
            {activeCategory ? categoryLabel : 'Shop'}
          </Typography>

          {/* Mobile Filter Button */}
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={handleDrawerToggle}
            sx={{ display: { md: 'none' } }}
          >
            Filter
          </Button>

          {/* Sort By */}
          <FormControl size="small" sx={{ minWidth: 150, display: { xs: 'none', md: 'inline-flex' } }}>
            <InputLabel>Sort by</InputLabel>
            <Select value={sortBy} label="Sort by" onChange={handleSortChange}>
              <MenuItem value="default">Default</MenuItem>
              <MenuItem value="price-asc">Price: Low to High</MenuItem>
              <MenuItem value="price-desc">Price: High to Low</MenuItem>
              <MenuItem value="newest">Newest</MenuItem>
              <MenuItem value="oldest">Oldest</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Mobile Sort display (optional, separate line) */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, mt: 2, justifyContent: 'flex-end' }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Sort by</InputLabel>
            <Select value={sortBy} label="Sort by" onChange={handleSortChange}>
              <MenuItem value="default">Default</MenuItem>
              <MenuItem value="price-asc">Price: Low to High</MenuItem>
              <MenuItem value="price-desc">Price: High to Low</MenuItem>
              <MenuItem value="newest">Newest</MenuItem>
              <MenuItem value="oldest">Oldest</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {hasParams && (
          <Button size="small" color="error" onClick={handleResetFilters} sx={{ mt: 1 }}>
            Reset filters
          </Button>
        )}
      </Box>

      <Grid container spacing={4}>
        {/* Desktop Sidebar */}
        <Grid size={{ md: 3, lg: 2.5 }} sx={{ display: { xs: 'none', md: 'block' } }}>
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
          ModalProps={{ keepMounted: true }} // Better open performance on mobile
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280, height: '100%' },
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
            <IconButton onClick={handleDrawerToggle}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ height: 'calc(100% - 50px)' }}>
            <FilterSidebar
              currentFilters={filters}
              showDetailedFilters={true}
              onApplyFilters={(f) => {
                handleApplyFilters(f);
                setMobileOpen(false);
              }}
              onResetFilters={handleResetFilters}
            />
          </Box>
        </Drawer>

        {/* Product Grid */}
        <Grid size={{ xs: 12, md: 9, lg: 9.5 }}>
          <ProductGrid filters={filters} sortBy={sortBy} />
        </Grid>
      </Grid>
    </Container>
  );
}
