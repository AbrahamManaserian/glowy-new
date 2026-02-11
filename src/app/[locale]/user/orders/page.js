'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Chip,
  CircularProgress,
  useTheme,
  Button,
  Collapse,
  Grid,
  Divider,
} from '@mui/material';
import {
  MoreVert,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../../context/AuthContext';
import { db } from '../../../../../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useRouter } from '../../../../i18n/navigation';

function OrderRow({ order, t }) {
  const [open, setOpen] = useState(false);
  const orderItems = order.itemsSnapshot || order.items || [];

  const dateDisplay = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '-';

  // Breakdown Calculation Logic
  const breakdown = orderItems.reduce(
    (acc, item) => {
      const qty = item.quantity || 0;
      acc.productMarkdown += (item.markdownPerUnit || 0) * qty;
      acc.firstShopDiscount += (item.itemFirstShopDiscount || 0) * qty;
      acc.extraDiscount += (item.itemExtraDiscount || 0) * qty;
      const originalPrice = item.initialPrice || item.price || 0;
      acc.grossSubtotal += originalPrice * qty;
      return acc;
    },
    { productMarkdown: 0, firstShopDiscount: 0, extraDiscount: 0, grossSubtotal: 0 },
  );

  const { productMarkdown, firstShopDiscount, extraDiscount, grossSubtotal } = breakdown;
  const dbTotalSavings = order.totalSavings || 0;
  const itemSavings = productMarkdown + firstShopDiscount + extraDiscount;
  const shippingSavings = Math.max(0, dbTotalSavings - itemSavings);
  const totalSavings = dbTotalSavings;

  const totalPrice = order.amount !== undefined ? order.amount : order.total !== undefined ? order.total : 0;

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'pending') return 'warning';
    if (s === 'processing') return 'info';
    if (s === 'shipped' || s === 'shipping') return 'primary';
    if (s === 'delivered' || s === 'completed') return 'success';
    if (s === 'cancelled' || s === 'rejected') return 'error';
    return 'default';
  };

  const getStatusKey = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'shipped') return 'shipping';
    if (s === 'completed') return 'delivered';
    if (s === 'cancelled') return 'rejected';
    return s;
  };

  return (
    <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          p: { xs: 1.5, md: 2 },
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          bgcolor: open ? '#f8f9fa' : 'white',
          transition: 'background-color 0.2s',
        }}
      >
        <Box>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
            {t('order_number')} {order.orderId || order.id.slice(0, 8)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('placed_on')} {dateDisplay}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', mr: 1 }}>
            <Chip
              label={t(`tabs.${getStatusKey(order.status)}`)}
              size="small"
              sx={{
                fontWeight: 600,
                textTransform: 'capitalize',
                fontSize: '0.75rem',
                height: 24,
                bgcolor: () => {
                  const color = getStatusColor(order.status);
                  if (color === 'success') return '#E8F5E9';
                  if (color === 'warning') return '#FFF3E0';
                  if (color === 'primary') return '#E3F2FD';
                  if (color === 'info') return '#E1F5FE';
                  if (color === 'error') return '#FFEBEE';
                  return '#F5F5F5';
                },
                color: () => {
                  const color = getStatusColor(order.status);
                  if (color === 'success') return '#2E7D32';
                  if (color === 'warning') return '#E65100'; // Dark Orange
                  if (color === 'primary') return '#1565C0'; // Blue
                  if (color === 'info') return '#0277BD'; // Light Blue
                  if (color === 'error') return '#C62828';
                  return 'text.primary';
                },
              }}
            />
            <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
              {Number(totalPrice).toLocaleString()} ֏
            </Typography>
          </Box>
          <IconButton size="small">{open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}</IconButton>
        </Box>
      </Box>

      <Collapse in={open} timeout="auto" unmountOnExit>
        <Divider />
        <Box sx={{ p: { xs: 1.5, md: 2 } }}>
          <Grid container spacing={{ xs: 2, md: 3 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mb: 1.5 }}>
                {t('items_header')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {orderItems.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        bgcolor: '#f5f5f5',
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #eee',
                        flexShrink: 0,
                      }}
                    >
                      <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: '#e0e0e0' }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      {item.variant && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mb: 0.25 }}
                        >
                          {item.variant}
                        </Typography>
                      )}

                      <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.25, fontSize: '0.85rem' }}>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" fontWeight="medium" sx={{ fontSize: '0.8rem' }}>
                        {item.quantity} × {item.price?.toLocaleString()} ֏
                      </Typography>
                      <Button
                        size="small"
                        sx={{
                          mt: 0.5,
                          p: 0,
                          minWidth: 'auto',
                          textTransform: 'none',
                          fontSize: '0.75rem',
                          color: 'primary.main',
                          '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                        }}
                      >
                        {t('leave_review')}
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ p: 0 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mb: 1.5 }}>
                  {t('summary')}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    {t('subtotal')}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                    {grossSubtotal.toLocaleString()} ֏
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                    {t('shipping')}
                  </Typography>
                  <Typography variant="body2" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                    {order.shippingCost > 0 ? `${order.shippingCost} ֏` : t('free_shipping')}
                  </Typography>
                </Box>

                {totalSavings > 0 && (
                  <Box
                    sx={{
                      my: 1.5,
                      p: 1.5,
                      bgcolor: '#FFF3E0',
                      borderRadius: 2,
                      border: '1px dashed #FF9800',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        sx={{ color: '#E65100', fontSize: '0.8rem' }}
                      >
                        {t('total_savings')}
                      </Typography>
                      <Typography
                        variant="subtitle2"
                        fontWeight="bold"
                        sx={{ color: '#E65100', fontSize: '0.8rem' }}
                      >
                        {totalSavings.toLocaleString()} ֏
                      </Typography>
                    </Box>
                    {firstShopDiscount > 0 && (
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ color: '#E65100', fontSize: '0.7rem' }}
                      >
                        • {t('first_shop_discount')}
                      </Typography>
                    )}
                    {extraDiscount > 0 && (
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ color: '#E65100', fontSize: '0.7rem' }}
                      >
                        • {t('extra_discount')}
                      </Typography>
                    )}
                    {productMarkdown > 0 && (
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ color: '#E65100', fontSize: '0.7rem' }}
                      >
                        • {t('product_markdown')}
                      </Typography>
                    )}
                    {shippingSavings > 0 && (
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ color: '#E65100', fontSize: '0.7rem' }}
                      >
                        • {t('free_shipping')}
                      </Typography>
                    )}
                  </Box>
                )}

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {t('total_paid')}
                  </Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {Number(totalPrice).toLocaleString()} ֏
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Paper>
  );
}

export default function OrdersPage() {
  const t = useTranslations('Orders');

  const { user } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState('all');

  // Load Orders
  useEffect(() => {
    async function fetchOrders() {
      if (!user) return;
      try {
        const q = query(collection(db, 'orders'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const loadedOrders = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate
            ? doc.data().createdAt.toDate()
            : new Date(doc.data().createdAt || Date.now()),
        }));
        loadedOrders.sort((a, b) => b.createdAt - a.createdAt);
        setOrders(loadedOrders);
      } catch (err) {
        console.error('Failed to load orders', err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Tabs logic
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getFilteredOrders = () => {
    if (tabValue === 'all') return orders;

    return orders.filter((order) => {
      const status = (order.status || 'pending').toLowerCase();
      if (tabValue === 'pending') return status === 'pending';
      if (tabValue === 'processing') return status === 'processing';
      if (tabValue === 'shipping') return status === 'shipped' || status === 'shipping';
      if (tabValue === 'delivered') return status === 'delivered' || status === 'completed';
      if (tabValue === 'rejected') return status === 'cancelled' || status === 'rejected';
      return true;
    });
  };

  const filteredOrders = getFilteredOrders();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        {t('title')}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          textColor="primary"
          indicatorColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 40,
            '& .MuiTab-root': {
              textTransform: 'capitalize',
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '6px 16px',
              minHeight: 40,
            },
          }}
        >
          <Tab label={t('tabs.all')} value="all" />
          <Tab
            label={t('tabs.pending')}
            value="pending"
            style={{ color: tabValue === 'pending' ? '#E65100' : undefined }}
          />
          <Tab
            label={t('tabs.processing')}
            value="processing"
            style={{ color: tabValue === 'processing' ? '#0277BD' : undefined }}
          />
          <Tab
            label={t('tabs.shipping')}
            value="shipping"
            style={{ color: tabValue === 'shipping' ? '#1565C0' : undefined }}
          />
          <Tab
            label={t('tabs.delivered')}
            value="delivered"
            style={{ color: tabValue === 'delivered' ? '#2E7D32' : undefined }}
          />
          <Tab
            label={t('tabs.rejected')}
            value="rejected"
            style={{ color: tabValue === 'rejected' ? '#C62828' : undefined }}
          />
        </Tabs>
      </Box>

      {/* Content */}
      {filteredOrders.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            {t('no_orders')}
          </Typography>
          <Button variant="contained" sx={{ mt: 2, bgcolor: 'black' }} onClick={() => router.push('/shop')}>
            {t('go_to_shop')}
          </Button>
        </Box>
      ) : (
        <Box>
          {filteredOrders.map((order) => (
            <OrderRow key={order.id} order={order} t={t} />
          ))}
        </Box>
      )}
    </Box>
  );
}
