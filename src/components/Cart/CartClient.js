'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  IconButton,
  Divider,
  Checkbox,
  Card,
  Container,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import { useCartCalculations } from '../../hooks/useCartCalculations';
import { useRouter } from '../../i18n/navigation';
import { validateCartItems } from '../../services/cartService';
import { useTranslations } from 'next-intl';

// Steps Indicator Component
const CartSteps = ({ activeStep = 0 }) => {
  const t = useTranslations('Cart');
  const steps = [t('steps_cart'), t('steps_details'), t('steps_complete')];
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 6, mt: 4 }}>
      {steps.map((label, index) => (
        <Box key={label} sx={{ display: 'flex', alignItems: 'center' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: index <= activeStep ? '#E65100' : '#f5f5f5',
                color: index <= activeStep ? 'white' : 'text.disabled',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                mb: 1,
              }}
            >
              {index + 1}
            </Box>
            <Typography
              variant="caption"
              color={index <= activeStep ? 'text.primary' : 'text.disabled'}
              fontWeight={index === activeStep ? 'bold' : 'normal'}
              align="center"
              sx={{ lineHeight: 1.2, mt: 0.5 }}
            >
              {label}
            </Typography>
          </Box>
          {index < steps.length - 1 && (
             // Line Connector
            <Box
              sx={{
                width: { xs: 50, sm: 100, md: 150 },
                height: 0,
                borderTop: '1px solid',
                borderColor: index < activeStep ? '#E65100' : '#eee',
                mx: 1,
                mt: -2.5, // Pull line up to align with circle center
              }}
            />
          )}
        </Box>
      ))}
    </Box>
  );
};

export default function CartClient() {
  const router = useRouter();
  const t = useTranslations('Cart');
  const tShop = useTranslations('Shop');
  const { cart, removeFromCart, updateCartQuantity, clearCart, updateCartItems } = useShop();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState(() =>
    cart.map((item) => `${item.productId}_${item.variantId}`),
  );

  // Sync state
  useEffect(() => {
    let active = true;

    const refreshCart = async () => {
      if (cart.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const updates = await validateCartItems(cart);

      if (active) {
        if (updates.length > 0) {
          updateCartItems(updates);
        }
        setLoading(false);
        // Default select all available items using the FRESH updates combined with current cart
        // We must merge to check immediate inStock status
        const mergedCart = cart.map((item) => {
          const update = updates.find(
            (u) => u.productId === item.productId && u.variantId === item.variantId,
          );
          return update ? { ...item, ...update } : item;
        });

        setSelectedItems(
          mergedCart.filter((item) => item.inStock === true).map((i) => `${i.productId}_${i.variantId}`),
        );
      }
    };

    refreshCart();

    return () => {
      active = false;
    };
  }, [cart.length]); // Run once on mount (or when count changes drastically) - careful with loops

  // Discount Logic
  // 1. Guest: "Sign in and get 20% discount"
  // 2. User & First Shop: 20% applied
  // 3. User & Not First Shop: Standard
  // 4. User & Not Verified: "Verify email"

  const {
    subtotal,
    breakdown: {
      productMarkdown: totalProductMarkdown,
      extraDiscount: totalExtraDiscount,
      firstShopDiscount: firstShopDiscountAmount,
      shippingSavings,
    },
    shippingCost: SHIPPING_COST,
    total,
    totalSavings,
    payableBeforeShipping,
    meta: {
      isFirstShopEligible,
      remainingForExtraDiscount,
      isGuest,
      isVerified,
      thresholds: {
        targetDiscountPercent: TARGET_DISCOUNT_PERCENT,
        extraDiscount: EXTRA_DISCOUNT_THRESHOLD,
        freeShipping: FREE_SHIPPING_THRESHOLD,
      },
    },
    itemCalculations,
  } = useCartCalculations(cart, user, selectedItems);

  // Handlers
  const handleToggleSelect = (id) => {
    setSelectedItems((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleCheckout = () => {
    const selectedParams = selectedItems.join(',');
    router.push(`/checkout?items=${selectedParams}`);
  };

  if (cart.length === 0 && !loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          {t('empty_title')}
        </Typography>
        <Button variant="contained" onClick={() => router.push('/shop')} sx={{ mt: 2, bgcolor: 'black' }}>
          {t('empty_cta')}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ p: '0 10px 60px 10px' }}>
      <CartSteps activeStep={0} />

      {/* Auth / Discount Banner */}
      {isGuest && (
        <Box
          sx={{
            bgcolor: 'white',
            p: { xs: '10px', sm: '20px' },
            mb: 4,
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ color: '#E65100' }}>
              <InfoOutlinedIcon />
            </Box>
            <Typography fontWeight="medium">{t('guest_discount_text')}</Typography>
          </Box>
          <Button
            variant="contained"
            sx={{ bgcolor: '#E65100', '&:hover': { bgcolor: '#EF6C00' }, borderRadius: '20px' }}
            onClick={() => router.push('/signin?from=/cart')}
          >
            {t('guest_signin_btn')}
          </Button>
        </Box>
      )}

      {user && !isVerified && (
        <Alert severity="warning" sx={{ mb: 4 }}>
          {t('verify_email_alert')}
        </Alert>
      )}

      {/* Free Shipping Banner */}
      {SHIPPING_COST === 0 ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: '#E3F2FD',
            p: 2,
            borderRadius: 2,
            mb: 2,
            border: '1px solid #BBDEFB',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                bgcolor: 'white',
                p: '8px 10px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1976D2',
              }}
            >
              🚚
            </Box>
            <Box>
              <Typography fontWeight="bold" sx={{ color: '#0D47A1', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                {t('free_shipping_unlocked')}
              </Typography>
              <Typography variant="body2" sx={{ color: '#1565C0', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                {t('free_shipping_text')}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              bgcolor: '#E3F2FD',
              color: '#1976D2',
              fontWeight: 'bold',
              px: { xs: 1, sm: 2 },
              py: 0.5,
              borderRadius: 1,
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              border: '1px solid #1976D2',
              display: { xs: 'none', sm: 'block' },
            }}
          >
            {t('free_shipping_badge')}
          </Box>
        </Box>
      ) : null}

      {/* Discount Banner */}
      {isFirstShopEligible ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: '#E8F5E9',
            p: 2,
            borderRadius: 2,
            mb: 4,
            border: '1px solid #C8E6C9',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                bgcolor: 'white',
                p: 1,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2E7D32',
              }}
            >
              <CheckCircleOutlineIcon />
            </Box>
            <Box>
              <Typography fontWeight="bold" sx={{ color: '#1B5E20', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                {t('welcome_gift_unlocked')}
              </Typography>
              <Typography variant="body2" sx={{ color: '#2E7D32', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                {t('welcome_gift_text')}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              bgcolor: '#C8E6C9',
              color: '#1B5E20',
              fontWeight: 'bold',
              px: { xs: 1, sm: 2 },
              py: 0.5,
              borderRadius: 4,
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            20%
          </Box>
        </Box>
      ) : remainingForExtraDiscount > 0 ? (
        <Box
          sx={{
            p: 2,
            bgcolor: '#FFF3E0',
            borderRadius: 2,
            mb: 4,
            border: '1px dashed #E65100',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: '#E65100', fontSize: { xs: '0.85rem', sm: '0.95rem' } }}>
            {t.rich('add_items_hint', {
              amount: remainingForExtraDiscount.toLocaleString(),
              b: (chunks) => <b>{chunks}</b>,
            })}
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: '#E8F5E9',
            p: 2,
            borderRadius: 2,
            mb: 4,
            border: '1px solid #C8E6C9',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                bgcolor: 'white',
                p: 1,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2E7D32',
              }}
            >
              <CheckCircleOutlineIcon />
            </Box>
            <Box>
              <Typography fontWeight="bold" sx={{ color: '#1B5E20', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                {t('extra_discount_unlocked')}
              </Typography>
              <Typography variant="body2" sx={{ color: '#2E7D32', fontSize: { xs: '0.8rem', sm: '0.9rem' } }}>
                {t('extra_discount_text', { amount: EXTRA_DISCOUNT_THRESHOLD.toLocaleString() })}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              bgcolor: '#C8E6C9',
              color: '#1B5E20',
              fontWeight: 'bold',
              px: { xs: 1, sm: 2 },
              py: 0.5,
              borderRadius: 4,
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              display: { xs: 'none', sm: 'block' },
            }}
          >
            10%
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">
          {t('cart_title', { count: cart.reduce((acc, i) => acc + i.quantity, 0) })}
        </Typography>
        <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={clearCart}>
          {t('clear_cart')}
        </Button>
      </Box>

      <Grid container spacing={4}>
        {/* Left Col: Items */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {cart.map((item) => {
              const isActive = item.inStock === true;
              const key = `${item.productId}_${item.variantId}`;
              const calc = itemCalculations[key] || {};

              const originalPrice = calc.originalPrice || 0;
              const existingDiscountPercent = calc.existingDiscountPercent || 0;
              const markdownAmount = calc.markdownAmount || 0;
              const itemExtraDiscount = calc.itemExtraDiscount || 0;
              const itemFirstShopDiscount = calc.itemFirstShopDiscount || 0;
              const finalUnitPrice = calc.finalUnitPrice || 0;
              const extraPercentApplied = calc.extraPercentApplied || 0;

              return (
                <Card
                  key={key}
                  elevation={0}
                  sx={{
                    p: { xs: 1, sm: 2 }, // Decreased padding for mobile
                    position: 'relative',
                    border: '1px solid',
                    borderColor: 'divider',
                    opacity: isActive ? 1 : 0.7,
                  }}
                >
                  {/* Checkbox - Absolute Positioned Top Right */}
                  <Box sx={{ position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
                    <Checkbox
                      checked={selectedItems.includes(key)}
                      onChange={() => handleToggleSelect(key)}
                      disabled={!isActive}
                      sx={{ color: '#E65100', '&.Mui-checked': { color: '#E65100' } }}
                    />
                  </Box>

                  <Grid container spacing={2} alignItems="flex-start">
                    {/* Image & Mobile Controls Column */}
                    <Grid size="auto">
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 1,
                          ml: 0,
                          //   mt: { xs: 1, sm: 0 },
                        }}
                      >
                        <Box
                          sx={{
                            width: { xs: 80, sm: 100 },
                            height: { xs: 100, sm: 120 },
                            // bgcolor: '#f5f5f5',
                            borderRadius: 1,
                            overflow: 'hidden',
                            cursor: 'pointer',
                          }}
                          onClick={() =>
                            router.push(`/product/${item.slug || item.productId}?variant=${item.variantId}`)
                          }
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                        </Box>

                        {/* Mobile Controls: Quantity & Delete under Image */}
                        <Box
                          sx={{
                            display: { xs: 'flex', sm: 'none' },
                            alignItems: 'center',
                            gap: 1,
                            width: '100%',
                            justifyContent: 'center',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              border: '1px solid #ddd',
                              borderRadius: 1,
                            }}
                          >
                            <IconButton
                              size="small"
                              disabled={item.quantity <= 1 || !isActive}
                              onClick={() =>
                                updateCartQuantity(item.productId, item.variantId, item.quantity - 1)
                              }
                              sx={{ p: 0.5 }}
                            >
                              <RemoveIcon fontSize="small" sx={{ fontSize: 16 }} />
                            </IconButton>
                            <Typography sx={{ px: 1, fontSize: '0.9rem', minWidth: 20, textAlign: 'center' }}>
                              {item.quantity}
                            </Typography>
                            <IconButton
                              size="small"
                              disabled={!isActive}
                              onClick={() =>
                                updateCartQuantity(item.productId, item.variantId, item.quantity + 1)
                              }
                              sx={{ p: 0.5 }}
                            >
                              <AddIcon fontSize="small" sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => removeFromCart(item.productId, item.variantId)}
                            color="default"
                            sx={{ p: 0.5, border: '1px solid #ddd', borderRadius: 1 }}
                          >
                            <DeleteOutlineIcon fontSize="small" sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      </Box>
                    </Grid>

                    {/* Info Column (Right Side) */}
                    <Grid size="grow">
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          height: '100%',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ pr: 4 }}>
                          {' '}
                          {/* Padding Right for Checkbox space */}
                          <Typography
                            variant="subtitle2"
                            fontWeight="bold"
                            sx={{ fontSize: { xs: '0.95rem', sm: '1rem' }, lineHeight: 1.3, mb: 0.5 }}
                          >
                            {item.name}
                          </Typography>
                          {item.attributes &&
                            Object.entries(item.attributes).map(([k, v]) => (
                              <Typography key={k} variant="caption" color="text.secondary" display="block">
                                {tShop(k.toLowerCase())}: {v}
                              </Typography>
                            ))}
                        </Box>

                        {/* Price & Savings Display */}
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                            <Typography
                              variant="h6"
                              fontWeight="bold"
                              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
                            >
                              {finalUnitPrice.toLocaleString()} ֏
                            </Typography>
                            {(existingDiscountPercent > 0 ||
                              itemExtraDiscount > 0 ||
                              itemFirstShopDiscount > 0) && (
                              <Typography
                                variant="body2"
                                sx={{ textDecoration: 'line-through', color: 'text.disabled' }}
                              >
                                {originalPrice.toLocaleString()} ֏
                              </Typography>
                            )}
                          </Box>

                          {/* Breakdown */}
                          {markdownAmount > 0 && (
                            <Typography variant="caption" display="block" color="#E65100" fontWeight="bold">
                              {t('markdown')}: -{markdownAmount.toLocaleString()} ֏
                            </Typography>
                          )}
                          {itemFirstShopDiscount > 0 && (
                            <Typography variant="caption" display="block" color="#E65100" fontWeight="bold">
                              {t('first_shop_discount')}: -{itemFirstShopDiscount.toLocaleString()} ֏
                            </Typography>
                          )}
                          {itemExtraDiscount > 0 && (
                            <Typography variant="caption" display="block" color="#E65100" fontWeight="bold">
                              {t('extra_discount', { percent: extraPercentApplied })}: -
                              {itemExtraDiscount.toLocaleString()} ֏
                            </Typography>
                          )}
                        </Box>

                        {!isActive && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" color="error" fontWeight="bold">
                              {t('out_of_stock')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>

                    {/* Desktop Controls (Right Bottom via flex magic or grid placement) */}
                    <Grid
                      size={{ xs: 12, sm: 'auto' }}
                      sx={{
                        display: { xs: 'none', sm: 'flex' },
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        justifyContent: 'flex-end',
                        height: '100%',
                        minHeight: 120,
                      }}
                    >
                      {/* Spacer to push content down if needed, or just justify-content-end */}
                      <Box sx={{ flexGrow: 1 }} />

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 'auto' }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid #ddd',
                            borderRadius: 1,
                          }}
                        >
                          <IconButton
                            size="small"
                            disabled={item.quantity <= 1 || !isActive}
                            onClick={() =>
                              updateCartQuantity(item.productId, item.variantId, item.quantity - 1)
                            }
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography sx={{ px: 2 }}>{item.quantity}</Typography>
                          <IconButton
                            size="small"
                            disabled={!isActive}
                            onClick={() =>
                              updateCartQuantity(item.productId, item.variantId, item.quantity + 1)
                            }
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>

                        <IconButton onClick={() => removeFromCart(item.productId, item.variantId)}>
                          <DeleteOutlineIcon />
                        </IconButton>
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
              );
            })}
          </Box>
        </Grid>

        {/* Right Col: Summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ position: { md: 'sticky' }, top: 75 }}>
            {' '}
            {/* Sticky container */}
            <Card variant="outlined" sx={{ p: { xs: 1, sm: 3 }, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {t('summary_title', {
                  count: cart
                    .filter((item) => selectedItems.includes(`${item.productId}_${item.variantId}`))
                    .reduce((a, b) => a + b.quantity, 0),
                })}
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, gap: 2 }}>
                <Typography color="text.secondary" noWrap sx={{ flex: 1 }}>
                  {t('subtotal')}
                </Typography>
                <Typography fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
                  {subtotal.toLocaleString()} ֏
                </Typography>
              </Box>

              {totalProductMarkdown > 0 && (
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: '#E65100', gap: 2 }}
                >
                  <Typography noWrap sx={{ flex: 1 }}>
                    {t('product_markdown')}
                  </Typography>
                  <Typography fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
                    -{totalProductMarkdown.toLocaleString()} ֏
                  </Typography>
                </Box>
              )}

              {firstShopDiscountAmount > 0 && (
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: '#E65100', gap: 2 }}
                >
                  <Typography noWrap sx={{ flex: 1 }}>
                    {t('first_shop_discount')}
                  </Typography>
                  <Typography fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
                    -{firstShopDiscountAmount.toLocaleString()} ֏
                  </Typography>
                </Box>
              )}

              {totalExtraDiscount > 0 && (
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: '#E65100', gap: 2 }}
                >
                  <Typography noWrap sx={{ flex: 1 }}>
                    {t('extra_discount', { percent: TARGET_DISCOUNT_PERCENT })}
                  </Typography>
                  <Typography fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
                    -{totalExtraDiscount.toLocaleString()} ֏
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 1, borderStyle: 'dashed' }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, gap: 2 }}>
                <Typography color="text.secondary" noWrap sx={{ flex: 1 }}>
                  {t('shipping')}
                </Typography>
                <Typography fontWeight="medium" sx={{ whiteSpace: 'nowrap' }}>
                  {SHIPPING_COST === 0 ? t('free') : `${SHIPPING_COST.toLocaleString()} ֏`}
                </Typography>
              </Box>

              {/* Total Savings Breakdown */}
              {totalSavings > 0 && (
                <Box
                  sx={{
                    mt: 2,
                    mb: 2,
                    p: 2,
                    bgcolor: '#FFF3E0',
                    borderRadius: 2,
                    border: '1px dashed #E65100',
                  }}
                >
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, color: '#E65100', gap: 2 }}
                  >
                    <Typography fontWeight="bold" noWrap sx={{ flex: 1 }}>
                      {t('total_savings')}
                    </Typography>
                    <Typography fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>
                      {totalSavings.toLocaleString()} ֏
                    </Typography>
                  </Box>
                  {totalProductMarkdown > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        color: '#E65100',
                        opacity: 0.8,
                        gap: 2,
                      }}
                    >
                      <Typography noWrap sx={{ flex: 1 }}>
                        • {t('product_markdown')}
                      </Typography>
                      <Typography sx={{ whiteSpace: 'nowrap' }}>
                        {totalProductMarkdown.toLocaleString()} ֏
                      </Typography>
                    </Box>
                  )}
                  {firstShopDiscountAmount > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        color: '#E65100',
                        opacity: 0.8,
                        gap: 2,
                      }}
                    >
                      <Typography noWrap sx={{ flex: 1 }}>
                        • {t('first_shop_discount')}
                      </Typography>
                      <Typography sx={{ whiteSpace: 'nowrap' }}>
                        {firstShopDiscountAmount.toLocaleString()} ֏
                      </Typography>
                    </Box>
                  )}
                  {totalExtraDiscount > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        color: '#E65100',
                        opacity: 0.8,
                        gap: 2,
                      }}
                    >
                      <Typography noWrap sx={{ flex: 1 }}>
                        • {t('extra_discount', { percent: TARGET_DISCOUNT_PERCENT })}
                      </Typography>
                      <Typography sx={{ whiteSpace: 'nowrap' }}>
                        {totalExtraDiscount.toLocaleString()} ֏
                      </Typography>
                    </Box>
                  )}
                  {shippingSavings > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        color: '#E65100',
                        opacity: 0.8,
                        gap: 2,
                      }}
                    >
                      <Typography noWrap sx={{ flex: 1 }}>
                        • {t('free_shipping_badge')}
                      </Typography>
                      <Typography sx={{ whiteSpace: 'nowrap' }}>
                        {shippingSavings.toLocaleString()} ֏
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {SHIPPING_COST > 0 && (
                <Typography
                  variant="caption"
                  color="info.main"
                  display="block"
                  sx={{ mb: 2, fontWeight: 'medium' }}
                >
                  {t('shipping_hint', { amount: (FREE_SHIPPING_THRESHOLD - subtotal).toLocaleString() })}
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, gap: 2 }}>
                <Typography variant="h6" fontWeight="bold" noWrap sx={{ flex: 1 }}>
                  {t('order_total')}
                </Typography>
                <Typography variant="h6" fontWeight="bold" sx={{ whiteSpace: 'nowrap' }}>
                  {total.toLocaleString()} ֏
                </Typography>
              </Box>

              {/* Bonus Hint */}
              <Box sx={{ bgcolor: '#E3F2FD', p: 2, borderRadius: 2, mb: 3, display: 'flex', gap: 1 }}>
                <Box sx={{ color: '#1976D2', pt: 0.5 }}>🎁</Box>
                <Typography variant="body2" color="text.secondary">
                  {t.rich('bonus_hint', {
                    amount: (payableBeforeShipping * 0.03).toFixed(0),
                    bold: (chunks) => (
                      <Box component="span" fontWeight="bold">
                        {chunks}
                      </Box>
                    ),
                  })}
                </Typography>
              </Box>

              <Button
                variant="contained"
                fullWidth
                size="medium"
                sx={{ bgcolor: '#2D3436', '&:hover': { bgcolor: 'black' }, mb: 2 }}
                onClick={handleCheckout}
              >
                {t('checkout')}
              </Button>

              <Button
                variant="outlined"
                fullWidth
                size="medium"
                sx={{ borderColor: 'divider', color: 'text.primary' }}
                onClick={() => router.push('/shop')}
              >
                {t('continue_shopping_btn')}
              </Button>
            </Card>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
