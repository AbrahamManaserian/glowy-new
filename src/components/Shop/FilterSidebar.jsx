'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Slider,
  FormControlLabel,
  Checkbox,
  Switch,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Autocomplete,
  TextField,
  Paper,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { styled } from '@mui/material/styles';
import { useCategories } from '../../context/CategoriesContext';
import { useRouter } from '../../i18n/routing';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';

const IOSSwitch = styled(
  (props) => <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />,
  { shouldForwardProp: (prop) => prop !== 'checkedColor' },
)(({ theme, checkedColor }) => ({
  width: 36,
  height: 20,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: checkedColor || 'var(--active-color)',
        opacity: 1,
        border: 0,
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5,
      },
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: '#33cf4d',
      border: '6px solid #fff',
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color: theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[600],
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: theme.palette.mode === 'light' ? 0.7 : 0.3,
    },
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 16,
    height: 16,
  },
  '& .MuiSwitch-track': {
    borderRadius: 20 / 2,
    backgroundColor: theme.palette.mode === 'light' ? '#E9E9EA' : '#39393D',
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 500,
    }),
  },
}));

const CustomAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  '& .MuiAccordionSummary-expandIconWrapper.Mui-expanded': {
    transform: 'rotate(0deg)',
  },
}));

const marks = [
  { value: 0, label: '$0' },
  { value: 1000, label: '$1000' },
];

export default function FilterSidebar({
  currentFilters,
  onFilterChange,
  showDetailedFilters,
  onApplyFilters,
  onResetFilters,
}) {
  const { categories, loading } = useCategories();
  const router = useRouter();

  // Local state for sidebar inputs before applying
  const [localFilters, setLocalFilters] = useState(currentFilters);

  // Sync local state with props when they change (e.g. from URL)
  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  const handlePriceChange = (event, newValue) => {
    setLocalFilters({ ...localFilters, priceRange: newValue });
  };

  // Helper to update local filters
  const updateFilter = (key, value) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleToggleChange = (field) => {
    updateFilter(field, !localFilters[field]);
  };

  const handleAutocompleteChange = (field, newValue) => {
    updateFilter(field, newValue);
  };

  const handleCategoryClick = (key) => {
    // Single select: Replace entire array. Reset subcats and types.
    const isSelected = localFilters.categories?.includes(key);
    if (isSelected) {
      // Allow deselecting to go back to "No Category" state?
      // User said "We dont nead go back categories button remove it".
      // But if I uncheck the checkbox, it should probably clear.
      setLocalFilters((prev) => ({
        ...prev,
        categories: [], // Clear categories
        subcategories: [],
        types: [],
        brands: [],
        sizes: [],
        notes: [],
      }));
    } else {
      setLocalFilters((prev) => ({
        ...prev,
        categories: [key],
        subcategories: [], // Reset deeper levels on cat change
        types: [],
        brands: [],
        sizes: [],
        notes: [],
      }));
    }
  };

  const handleSubCategoryClick = (key) => {
    // Single select: Replace array. Reset types.
    const isSelected = localFilters.subcategories?.includes(key);
    if (isSelected) {
      // Allow deselect
      setLocalFilters((prev) => ({
        ...prev,
        subcategories: [],
        types: [],
      }));
    } else {
      setLocalFilters((prev) => ({
        ...prev,
        subcategories: [key],
        types: [],
      }));
    }
  };

  const handleTypeToggle = (type) => {
    const currentTypes = localFilters.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];

    updateFilter('types', newTypes);
  };

  // Logic to determine what to show
  const activeCategoryKey = localFilters.categories?.[0];
  const activeSubCategoryKey = localFilters.subcategories?.[0];

  // Data lookup
  const activeCategoryData = activeCategoryKey ? categories[activeCategoryKey] : null;
  const subCategoriesList = activeCategoryData?.subcategories || {};

  const activeSubCategoryData =
    activeCategoryKey && activeSubCategoryKey && subCategoriesList
      ? subCategoriesList[activeSubCategoryKey]
      : null;

  const availableTypes = activeSubCategoryData?.types || [];

  const [brandOptions, setBrandOptions] = useState([]);
  const [sizeOptions, setSizeOptions] = useState([]);
  const [perfumeNotes, setPerfumeNotes] = useState([]);

  useEffect(() => {
    const fetchCategoryConfig = async () => {
      if (activeCategoryKey) {
        try {
          const docRef = doc(db, 'config', activeCategoryKey);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setBrandOptions(data.brands || []);
            const uniqueSizes = [...new Set((data.sizes || []).map(String))];
            setSizeOptions(uniqueSizes);
            setPerfumeNotes(data.perfumeNotes || []);
          } else {
            setBrandOptions([]);
            setSizeOptions([]);
            setPerfumeNotes([]);
          }
        } catch (err) {
          console.error('Error fetching config', err);
        }
      } else {
        setBrandOptions([]);
        setSizeOptions([]);
        setPerfumeNotes([]);
      }
    };
    fetchCategoryConfig();
  }, [activeCategoryKey]);

  if (loading) return <Box>Loading filters...</Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* Filters Area */}
      <Box sx={{ p: 2 }}>
        {/* Price Filter */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography gutterBottom variant="subtitle2" fontWeight="bold">
              Price
            </Typography>
            <Button
              size="small"
              onClick={() => handlePriceChange(null, [0, 1000])}
              sx={{
                color: 'var(--active-color)',
                textTransform: 'none',
                minWidth: 'auto',
                p: 0,
                '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
              }}
            >
              Reset
            </Button>
          </Box>
          <Box sx={{ px: 1 }}>
            <Slider
              value={localFilters.priceRange || [0, 1000]}
              onChange={handlePriceChange}
              valueLabelDisplay="auto"
              min={0}
              max={1000}
              disableSwap
              sx={{
                color: 'var(--active-color)',
                '& .MuiSlider-thumb': {
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: '0px 0px 0px 8px rgba(244, 67, 54, 0.16)', // active color alpha
                  },
                },
              }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Min: ${localFilters.priceRange?.[0]}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Max: ${localFilters.priceRange?.[1]}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Discounted Toggle */}
        <FormControlLabel
          control={
            <IOSSwitch
              checked={localFilters.discounted || false}
              onChange={() => handleToggleChange('discounted')}
            />
          }
          label={<Typography variant="body2">Discounted Products</Typography>}
          sx={{
            mb: 2,
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            ml: 0,
            flexDirection: 'row-reverse',
          }}
        />

        <Divider sx={{ mb: 2 }} />

        {/* Categories / Subcategories Accordion */}
        <Accordion defaultExpanded elevation={0} disableGutters sx={{ '&:before': { display: 'none' } }}>
          <CustomAccordionSummary
            expandIcon={
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                }}
              >
                <AddIcon sx={{ display: 'block', '.Mui-expanded &': { display: 'none' } }} />
                <RemoveIcon sx={{ display: 'none', '.Mui-expanded &': { display: 'block' } }} />
              </Box>
            }
          >
            <Typography variant="subtitle2" fontWeight="bold">
              {activeCategoryData ? activeCategoryData.label || activeCategoryKey : 'Categories'}
            </Typography>
          </CustomAccordionSummary>
          <AccordionDetails>
            {activeCategoryKey ? (
              <>
                {/* Subcategories View */}
                {Object.entries(subCategoriesList).map(([key, val]) => (
                  <FormControlLabel
                    key={key}
                    control={
                      <Checkbox
                        checked={localFilters.subcategories?.includes(key) || false}
                        onChange={() => handleSubCategoryClick(key)}
                        size="small"
                        sx={{
                          color: 'text.secondary',
                          '&.Mui-checked': { color: 'var(--active-color)' },
                        }}
                      />
                    }
                    label={val.label || key}
                    sx={{ display: 'flex', width: '100%' }}
                  />
                ))}
                <Button
                  size="small"
                  onClick={() =>
                    setLocalFilters({ ...localFilters, categories: [], subcategories: [], types: [] })
                  }
                  sx={{ mt: 1, textTransform: 'none', color: 'var(--active-color)' }}
                >
                  Back to Categories
                </Button>
              </>
            ) : (
              // Main Categories View
              Object.entries(categories).map(([key, val]) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={localFilters.categories?.includes(key) || false}
                      onChange={() => handleCategoryClick(key)}
                      size="small"
                      sx={{
                        color: 'text.secondary',
                        '&.Mui-checked': { color: 'var(--active-color)' },
                      }}
                    />
                  }
                  label={val.label || key}
                  sx={{ display: 'flex', width: '100%' }}
                />
              ))
            )}
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 1 }} />

        {/* Type Filter - Only if types available */}
        {availableTypes.length > 0 && (
          <>
            <Accordion defaultExpanded elevation={0} disableGutters sx={{ '&:before': { display: 'none' } }}>
              <CustomAccordionSummary
                expandIcon={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 24,
                      height: 24,
                    }}
                  >
                    <AddIcon sx={{ display: 'block', '.Mui-expanded &': { display: 'none' } }} />
                    <RemoveIcon sx={{ display: 'none', '.Mui-expanded &': { display: 'block' } }} />
                  </Box>
                }
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  Type
                </Typography>
              </CustomAccordionSummary>
              <AccordionDetails>
                {availableTypes.map((type) => (
                  <FormControlLabel
                    key={type}
                    control={
                      <Checkbox
                        checked={localFilters.types?.includes(type) || false}
                        size="small"
                        onChange={() => handleTypeToggle(type)}
                        sx={{
                          color: 'text.secondary',
                          '&.Mui-checked': { color: 'var(--active-color)' },
                        }}
                      />
                    }
                    label={type}
                    sx={{ display: 'flex', width: '100%' }}
                  />
                ))}
              </AccordionDetails>
            </Accordion>
            <Divider sx={{ my: 1 }} />
          </>
        )}

        {/* Brands Autocomplete */}
        <Box sx={{ mb: 2, mt: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Brands
          </Typography>
          <Autocomplete
            multiple
            options={brandOptions}
            value={localFilters.brands || []}
            onChange={(e, val) => handleAutocompleteChange('brands', val)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                placeholder="Select brands"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--active-color)',
                    },
                  },
                }}
              />
            )}
            ChipProps={{
              sx: {
                bgcolor: 'rgba(244, 67, 54, 0.08)',
                color: 'var(--active-color)',
                '& .MuiChip-deleteIcon': {
                  color: 'var(--active-color)',
                  '&:hover': {
                    color: 'var(--active-color)',
                    opacity: 0.7,
                  },
                },
              },
            }}
          />
        </Box>

        {/* Size Autocomplete */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Size
          </Typography>
          <Autocomplete
            multiple
            options={sizeOptions}
            value={localFilters.sizes || []}
            onChange={(e, val) => handleAutocompleteChange('sizes', val)}
            renderInput={(params) => (
              <TextField
                {...params}
                variant="outlined"
                size="small"
                placeholder="Select size"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&.Mui-focused fieldset': {
                      borderColor: 'var(--active-color)',
                    },
                  },
                }}
              />
            )}
            ChipProps={{
              sx: {
                bgcolor: 'rgba(244, 67, 54, 0.08)',
                color: 'var(--active-color)',
                '& .MuiChip-deleteIcon': {
                  color: 'var(--active-color)',
                  '&:hover': {
                    color: 'var(--active-color)',
                    opacity: 0.7,
                  },
                },
              },
            }}
          />
        </Box>

        {activeCategoryKey === 'fragrance' && perfumeNotes.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Notes
            </Typography>
            <Autocomplete
              multiple
              options={perfumeNotes}
              value={localFilters.notes || []}
              onChange={(e, val) => handleAutocompleteChange('notes', val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  size="small"
                  placeholder="Select notes"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&.Mui-focused fieldset': {
                        borderColor: 'var(--active-color)',
                      },
                    },
                  }}
                />
              )}
              ChipProps={{
                sx: {
                  bgcolor: 'rgba(244, 67, 54, 0.08)',
                  color: 'var(--active-color)',
                  '& .MuiChip-deleteIcon': {
                    color: 'var(--active-color)',
                    '&:hover': { color: 'var(--active-color)', opacity: 0.7 },
                  },
                },
              }}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => {
                  const { key, ...tagProps } = getTagProps({ index });
                  return <Chip key={key} size="small" label={option} {...tagProps} />;
                })
              }
            />
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* Other toggles */}
        <FormControlLabel
          control={
            <IOSSwitch
              checked={localFilters.originalBrand || false}
              onChange={() => handleToggleChange('originalBrand')}
              checkedColor="#2196F3"
            />
          }
          label={<Typography variant="body2">Original Brand</Typography>}
          sx={{
            mb: 1,
            display: 'flex',
            justifyContent: 'space-between',
            ml: 0,
            flexDirection: 'row-reverse',
          }}
        />
        <FormControlLabel
          control={
            <IOSSwitch
              checked={localFilters.onlyStock || false}
              onChange={() => handleToggleChange('onlyStock')}
              checkedColor="#4CAF50"
            />
          }
          label={<Typography variant="body2">Only in Stock</Typography>}
          sx={{
            mb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            ml: 0,
            flexDirection: 'row-reverse',
          }}
        />
      </Box>

      {/* Sticky Apply Button */}
      <Box sx={{ position: 'sticky', bottom: 0, p: '10px' }}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          onClick={() => onApplyFilters(localFilters)}
          sx={{
            // bgcolor: 'var(--active-color)',

            // mb: '10px',
            zIndex: 10,
            borderRadius: '15px',
            // mb: '10px',
            // py: 2,
            // '&:hover': { bgcolor: 'var(--active-color)', opacity: 0.9 },
          }}
        >
          Apply Filters
        </Button>
      </Box>
    </Box>
  );
}
