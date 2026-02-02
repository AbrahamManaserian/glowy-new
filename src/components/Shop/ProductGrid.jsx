'use client';

import React from 'react';
import { Box, Card, CardMedia, Typography, Button, Rating, IconButton } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useRouter } from '../../i18n/navigation';
import { useTranslations } from 'next-intl';
import { ShoppingBasketIcon } from '../ShoppingBasketIcon';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const dummyProducts = [
  {
    id: 1,
    name: 'Aventus',
    price: 44000,
    rating: 4.5,
    reviews: 12,
    brand: 'Creed',
    size: '100',
    unit: 'ml',
    mainImage: 'https://placehold.co/400',
    options: [{ name: 'Size', values: ['50', '100', '200'] }],
  },
  {
    id: 2,
    name: 'Gentleman Intense',
    price: 48000,
    rating: 4.8,
    reviews: 34,
    brand: 'Givenchy',
    size: '100',
    unit: 'ml',
    mainImage: 'https://placehold.co/400',
    options: [{ name: 'Size', values: ['50', '100'] }],
  },
  {
    id: 3,
    name: 'Gentleman Eau De Parfum',
    price: 39000,
    rating: 4.2,
    reviews: 8,
    brand: 'Givenchy',
    mainImage: 'https://placehold.co/400',
  },
  {
    id: 4,
    name: 'Code Eau de Toilette',
    price: 10500,
    rating: 4.0,
    reviews: 5,
    brand: 'Giorgio Armani',
    mainImage: 'https://placehold.co/400',
  },
];

export default function ProductGrid({ products, filters, sortBy }) {
  const router = useRouter();
  const t = useTranslations('Shop');

  // If products are passed, usage them, else use dummy (or empty)
  const displayProducts = products && products.length > 0 ? products : dummyProducts;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        {displayProducts.map((product) => {
          // Logic to find Size options
          const sizeOption = product.options?.find((opt) => opt.name?.toLowerCase() === 'size');
          const sizeCount = sizeOption?.values?.length || 0;

          const displayName = product.name;
          const displayImage = product.mainImage || product.image || 'https://placehold.co/400';
          const sizeUnit = product.unit || 'ml';
          const defaultSize = product.size || '100';

          return (
            <Grid size={{ xs: 6, sm: 6, md: 4, lg: 3 }} key={product.id}>
              <Card
                elevation={0}
                sx={{
                  border: 'none',
                  borderRadius: 0,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s',
                  bgcolor: 'transparent',
                }}
              >
                {/* Image Area */}
                <Box
                  sx={{
                    position: 'relative',
                    pt: '100%',
                    mb: 1.5,
                    borderRadius: 4,
                    overflow: 'hidden',
                    bgcolor: 'white',
                    border: '1px solid',
                    borderColor: 'rgba(0,0,0,0.05)',
                  }}
                >
                  <CardMedia
                    component="img"
                    image={displayImage}
                    alt={displayName}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      // p: 0,
                    }}
                  />
                </Box>

                {/* Content Area */}
                <Box
                  sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    px: 0.5,
                  }}
                >
                  {/* Brand + Volume */}
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5, width: '100%' }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.95rem' }}>
                      {product.brand}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {defaultSize}
                      {sizeUnit}
                    </Typography>
                  </Box>

                  {/* Name */}
                  <Typography
                    variant="body2"
                    sx={{
                      mb: 1,
                      fontWeight: 400,
                      fontSize: '0.9rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      height: '2.8em',
                      lineHeight: '1.4em',
                    }}
                  >
                    {displayName}
                  </Typography>

                  {/* Variant Selector Mock */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      mb: 1.5,
                      color: 'text.secondary',
                      fontSize: '0.8rem',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontSize: '0.8rem' }}>
                      {t('size')} {sizeCount > 1 ? `(${sizeCount})` : ''} : {defaultSize}
                    </Typography>
                    {sizeCount > 1 && <KeyboardArrowDownIcon fontSize="small" sx={{ fontSize: 16 }} />}
                  </Box>

                  {/* Price */}
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 0.5 }}>
                    {typeof product.price === 'number' ? product.price.toLocaleString() : product.price} ֏
                  </Typography>

                  {/* Rating */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Rating
                      value={Number(product.rating) || 0}
                      precision={0.5}
                      size="small"
                      readOnly
                      sx={{ color: '#FFB400', fontSize: '1rem' }}
                    />
                    {(product.reviewCount > 0 || product.reviews > 0) && (
                      <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                        ({product.reviewCount || product.reviews})
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: { xs: 0.5, md: 1 }, width: '100%', mt: 'auto' }}>
                  <IconButton
                    size="small"
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      color: 'text.primary',
                      width: { xs: 32, md: 40 },
                      height: { xs: 32, md: 40 },
                      flexShrink: 0,
                    }}
                  >
                    <ShoppingBasketIcon size={18} />
                  </IconButton>
                  <IconButton
                    size="small"
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      width: { xs: 32, md: 40 },
                      height: { xs: 32, md: 40 },
                      flexShrink: 0,
                    }}
                  >
                    <FavoriteBorderIcon
                      fontSize="small"
                      color="inherit"
                      sx={{ fontSize: { xs: 18, md: 20 } }}
                    />
                  </IconButton>
                  <Button
                    variant="contained"
                    fullWidth
                    disableElevation
                    sx={{
                      bgcolor: '#2D3436',
                      color: 'white',
                      textTransform: 'none',
                      borderRadius: 2,
                      fontWeight: 500,
                      fontSize: { xs: '0.8rem', md: '0.9rem' },
                      height: { xs: 32, md: 40 },
                      minWidth: 0,
                      px: 1,
                      '&:hover': { bgcolor: 'black' },
                    }}
                  >
                    {t('order')}
                  </Button>
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {displayProducts.length === 0 && (
        <Box sx={{ py: 10, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No products found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters
          </Typography>
        </Box>
      )}
    </Box>
  );
}
