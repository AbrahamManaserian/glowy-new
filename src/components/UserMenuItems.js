import {
  PersonOutline,
  SettingsOutlined,
  Inventory2Outlined,
  FavoriteBorderOutlined,
  CreditCardOutlined,
  ReceiptLongOutlined,
  LogoutOutlined,
  DashboardOutlined,
} from '@mui/icons-material';

export const userMenuItems = [
  {
    label: 'Profile',
    path: '/user/profile',
    icon: <PersonOutline fontSize="small" />,
    id: 'profile',
  },
  {
    label: 'Orders',
    path: '/user/orders',
    icon: <Inventory2Outlined fontSize="small" />,
    id: 'orders',
  },
  {
    label: 'Wishlist',
    path: '/user/wishlist',
    icon: <FavoriteBorderOutlined fontSize="small" />,
    id: 'wishlist',
  },
  {
    label: 'Payments',
    path: '/user/payments',
    icon: <CreditCardOutlined fontSize="small" />,
    id: 'payments',
    protected: true,
  },
  {
    label: 'Settings',
    path: '/user/settings',
    icon: <SettingsOutlined fontSize="small" />,
    id: 'settings',
    protected: true,
  },
];

export const adminMenuItems = [
  {
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: <DashboardOutlined fontSize="small" />,
    id: 'dashboard',
  },
];
