'use client';

import React from 'react';
import { Box, Card, CardMedia, CardContent, Typography, Button, Rating, Chip } from '@mui/material';
import Grid from '@mui/material/Grid';
import { useRouter } from '../../i18n/routing';

const dummyProducts = [
  {
    id: 1,
    name: 'Glorious Perfume',
    price: 120,
    rating: 4.5,
    reviews: 12,
    brand: 'Gucci',
    image: 'https://placehold.co/200',
  },
  {
    id: 2,
    name: 'Shiny Lipstick',
    price: 45,
    rating: 4.8,
    reviews: 34,
    brand: 'Chanel',
    image: 'https://placehold.co/200',
  },
  {
    id: 3,
    name: 'Night Cream',
    price: 80,
    rating: 4.2,
    reviews: 8,
    brand: 'Dior',
    image: 'https://placehold.co/200',
  },
  {
    id: 4,
    name: 'Summer Breeze',
    price: 95,
    rating: 4.0,
    reviews: 5,
    brand: 'Versace',
    image: 'https://placehold.co/200',
  },
  {
    id: 5,
    name: 'Luxury Serum',
    price: 200,
    rating: 4.9,
    reviews: 50,
    brand: 'YSL',
    image: 'https://placehold.co/200',
  },
  {
    id: 6,
    name: 'Red Nail Polish',
    price: 25,
    rating: 3.8,
    reviews: 2,
    brand: 'Chanel',
    image: 'https://placehold.co/200',
  },
];

export default function ProductGrid({ filters, sortBy }) {
  const router = useRouter();

  // In a real app, we would fetch/filter data here based on props

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      {/* Product Count & Sort (Usually passed down, but assuming grid handles display) */}

      <Grid container spacing={3}>
        {dummyProducts.map((product) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={product.id}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s',
                '&:hover': { boxShadow: 4, transform: 'translateY(-4px)' },
              }}
            >
              <Box sx={{ position: 'relative', pt: '100%' }}>
                <CardMedia
                  component="img"
                  image={product.image}
                  alt={product.name}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* Quick Action Overlay could go here */}
              </Box>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {product.brand}
                </Typography>
                <Typography variant="subtitle1" component="div" fontWeight="bold" gutterBottom>
                  {product.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Rating value={product.rating} precision={0.5} size="small" readOnly />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ({product.reviews})
                  </Typography>
                </Box>
                <Typography variant="h6" color="primary">
                  ${product.price}
                </Typography>
              </CardContent>
              <Box sx={{ p: 2, pt: 0 }}>
                <Button variant="outlined" fullWidth onClick={() => {}}>
                  Add to Cart
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {dummyProducts.length === 0 && (
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
