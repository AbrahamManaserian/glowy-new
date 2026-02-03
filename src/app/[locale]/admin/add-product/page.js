'use client';

import {
  Box,
  Paper,
  Grid,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Button,
  Stack,
  Divider,
  Autocomplete,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Backdrop,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import Resizer from 'react-image-file-resizer';

import { db, storage } from '../../../../../firebase';
import {
  doc,
  getDoc,
  collection,
  setDoc,
  updateDoc,
  arrayUnion,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useState, useEffect } from 'react';

// const categoriesObj = { ... } // Removed hardcoded object replaced by state
const units = ['ml', 'g', 'kg', 'l', 'pcs'];

const initialFormState = {
  category: '',
  subcategory: '',
  type: '',
  brand: '',
  model: '',
  size: '',
  unit: '',
  price: '',
  discount: '',
  quantity: 1,
  images: [],
  mainImage: '',
  smallImage: '',
  descriptionAm: '',
  descriptionEn: '',
  descriptionRu: '',
  inStock: true,
  original: true,
  customFields: [],
  productOptions: [],
  variants: [],
  // Fragrance specific
  topNotes: [],
  middleNotes: [],
  baseNotes: [],
};

const generateVariants = (options, existingVariants, basePrice, baseQuantity, baseDiscount) => {
  const validOptions = options.filter((o) => o.values.length > 0);
  if (validOptions.length === 0) return [];

  const cartesian = (sets) => {
    return sets.reduce(
      (acc, curr) => {
        return acc.flatMap((x) => curr.map((y) => [...x, y]));
      },
      [[]],
    );
  };

  const optionValues = validOptions.map((o) => o.values);
  const combinations = cartesian(optionValues);

  return combinations.map((combination) => {
    const attributes = {};
    const nameParts = [];

    validOptions.forEach((option, index) => {
      attributes[option.name] = combination[index];
      nameParts.push(combination[index]);
    });

    const uniqueKey = nameParts.join(' / ');

    const existing = existingVariants.find((v) => v.name === uniqueKey);

    if (existing) {
      // preserving existing overrides if they exist, but maybe we want to sync global discount if needed?
      // For now, simple return existing.
      return existing;
    }

    return {
      name: uniqueKey,
      attributes,
      price: basePrice || '',
      quantity: baseQuantity || '',
      discount: baseDiscount || '0',
      image: null, // Specific image for this variant (null = use main product image)
      sku: '',
    };
  });
};

export default function AddProductPage() {
  const [formData, setFormData] = useState(initialFormState);
  const [categoriesObj, setCategoriesObj] = useState({});
  const [availableSubcategories, setAvailableSubcategories] = useState({});
  const [availableTypes, setAvailableTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [availableNotes, setAvailableNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);

  // Fetch Categories on Mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const docRef = doc(db, 'config', 'categories');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCategoriesObj(docSnap.data().categories || {});
        } else {
          console.error('No categories config found!');
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleCategoryChange = async (e) => {
    const category = e.target.value;

    // Reset dependent fields
    setFormData((prev) => ({
      ...prev,
      category,
      subcategory: '',
      type: '',
      // Reset fragrance notes if changing away from fragrance, assuming fragrance is the logic trigger
      ...(category !== 'fragrance' ? { topNotes: [], middleNotes: [], baseNotes: [] } : {}),
    }));

    // Update subcategories from the local categoriesObj state
    setAvailableSubcategories(categoriesObj[category]?.subcategories || {});
    setAvailableTypes([]);

    // Fetch Category Specific Config (Brands, Sizes, Notes)
    try {
      const docRef = doc(db, 'config', category);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setBrands(data.brands || []);
        // Ensure sizes are unique strings to prevent Autocomplete key errors
        const uniqueSizes = [...new Set((data.sizes || []).map(String))];
        setSizes(uniqueSizes);
        setAvailableNotes(data.perfumeNotes || []);
      } else {
        setBrands([]);
        setSizes([]);
        setAvailableNotes([]);
      }
    } catch (err) {
      console.error('Error fetching category details:', err);
      setBrands([]);
      setSizes([]);
    }
  };

  const handleSubcategoryChange = (e) => {
    const subcategory = e.target.value;
    setFormData((prev) => ({
      ...prev,
      subcategory,
      type: '',
    }));

    // Access subcategories from state, safer
    const subCatObj = availableSubcategories[subcategory];
    if (subCatObj) {
      setAvailableTypes(subCatObj.types || []);
    } else {
      setAvailableTypes([]);
    }
  };

  const handleAutocompleteChange = (event, newValue) => {
    setFormData((prev) => ({
      ...prev,
      brand: newValue || '',
    }));
  };

  const resizeFile = (file, width, height, quality) =>
    new Promise((resolve) => {
      Resizer.imageFileResizer(
        file,
        width, // max width
        height, // max height
        'JPEG',
        quality,
        0,
        (uri) => {
          resolve(uri);
        },
        'base64',
      );
    });

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (formData.images.length + files.length > 6) {
        alert('You can only upload a maximum of 6 images.');
        return;
      }

      setImageProcessing(true);
      const newImages = [];
      let firstSmallImage = null;

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            // Resize for "Normal" Usage (~100KB target)
            const resizedImage = await resizeFile(file, 1200, 1200, 80);
            newImages.push(resizedImage);

            // If we have no main image yet, generate a small version from the FIRST new file
            if (!formData.mainImage && i === 0 && !firstSmallImage) {
              // Resize for "Small" Usage (~20KB target)
              firstSmallImage = await resizeFile(file, 300, 300, 70);
            }
          } catch (err) {
            console.error('Error resizing image', err);
          }
        }

        setFormData((prev) => {
          const updatedImages = [...prev.images, ...newImages];
          const updateState = { images: updatedImages };

          if (!prev.mainImage && newImages.length > 0) {
            updateState.mainImage = newImages[0];
            if (firstSmallImage) {
              updateState.smallImage = firstSmallImage;
            }
          }

          return {
            ...prev,
            ...updateState,
          };
        });
      } finally {
        setImageProcessing(false);
      }
    }
  };

  const handleDeleteImage = (index) => {
    setFormData((prev) => {
      const imageToDelete = prev.images[index];
      const updatedImages = prev.images.filter((_, i) => i !== index);
      let newMainImage = prev.mainImage;
      let newSmallImage = prev.smallImage;

      // If we deleted the main image, set a new main image (first available)
      if (imageToDelete === prev.mainImage) {
        newMainImage = updatedImages.length > 0 ? updatedImages[0] : '';
        // If we switched to a new main image, ideally we update the smallImage too.
        // However, if the new image is a base64 string, we might want to regenerate it.
        // But since we don't have the original FILE here easily, allow the user to re-select main image
        // to trigger generation, OR we accept that auto-switch might keep old small image if we don't clear it.
        // Better: Clear small image if we switch main image automatically, OR try to regenerat (hard without file).
        // Let's just keep the old one for now or clear it?
        // If main image is gone, small image should probably go unless we have a new main.
        // If we pick a new main automatically, we can't easily make a small version from the big base64 string
        // without some async work. For simplicity, let's just leave it or clear it.
        // CLEARING it forces user to pick a main image or upload?
        // Let's leave it as is for "auto-pick", but `handleSetMainImage` handles manual pick.
        // Actually, if updateImages is base64, we CAN resize it.
      }

      return {
        ...prev,
        images: updatedImages,
        mainImage: newMainImage,
        smallImage: newSmallImage, // Keep or update if you impl async delete
      };
    });
  };

  const handleSetMainImage = async (image) => {
    // This needs to be async to generate the small image
    let smallImageUri = '';

    try {
      if (image.startsWith('data:')) {
        // It is base64
        const blob = await (await fetch(image)).blob();
        smallImageUri = await resizeFile(blob, 300, 300, 70);
      } else if (image.startsWith('http')) {
        // It is a URL
        try {
          const response = await fetch(image, { mode: 'cors' });
          const blob = await response.blob();
          smallImageUri = await resizeFile(blob, 300, 300, 70);
        } catch (e) {
          console.warn('Could not generate small image from URL (CORS?)', e);
          // Fallback: Use the original URL or keep previous?
          // If we can't resize, we might set smallImage to the big image URL (not ideal)
          // or leave it blank.
          smallImageUri = image;
        }
      }
    } catch (e) {
      console.error('Error in handleSetMainImage', e);
    }

    setFormData((prev) => ({
      ...prev,
      mainImage: image,
      smallImage: smallImageUri || prev.smallImage,
    }));
  };

  const handleAddCustomField = () => {
    setFormData((prev) => ({
      ...prev,
      customFields: [...prev.customFields, { name: '', value: '' }],
    }));
  };

  const handleCustomFieldChange = (index, field, value) => {
    const updated = [...formData.customFields];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, customFields: updated }));
  };

  const handleDeleteCustomField = (index) => {
    const updated = formData.customFields.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, customFields: updated }));
  };

  const handleAddOption = () => {
    setFormData((prev) => ({
      ...prev,
      productOptions: [...prev.productOptions, { name: '', values: [], currentValue: '' }],
    }));
  };

  const handleDeleteOption = (index) => {
    const updated = formData.productOptions.filter((_, i) => i !== index);
    const newVariants = generateVariants(
      updated,
      formData.variants,
      formData.price,
      formData.quantity,
      formData.discount,
    );
    setFormData((prev) => ({ ...prev, productOptions: updated, variants: newVariants }));
  };

  const handleOptionNameChange = (index, value) => {
    const updated = [...formData.productOptions];
    updated[index].name = value;

    // Smart helper: If user types "Size" and has basic details Size filled, auto-add it
    if (
      value.trim().toLowerCase() === 'size' &&
      formData.size &&
      !updated[index].values.includes(formData.size)
    ) {
      updated[index].values.push(formData.size);
    }

    // For simplicity, we regenerate.
    const newVariants = generateVariants(
      updated,
      formData.variants,
      formData.price,
      formData.quantity,
      formData.discount,
    );
    setFormData((prev) => ({ ...prev, productOptions: updated, variants: newVariants }));
  };

  const handleOptionValueInputChange = (index, value) => {
    const updated = [...formData.productOptions];
    updated[index].currentValue = value;
    setFormData((prev) => ({ ...prev, productOptions: updated }));
  };

  const handleAddOptionValue = (index) => {
    const updated = [...formData.productOptions];
    const val = updated[index].currentValue.trim();
    if (val && !updated[index].values.includes(val)) {
      updated[index].values.push(val);
      updated[index].currentValue = '';

      const newVariants = generateVariants(
        updated,
        formData.variants,
        formData.price,
        formData.quantity,
        formData.discount,
      );
      setFormData((prev) => ({ ...prev, productOptions: updated, variants: newVariants }));
    }
  };

  const handleDeleteOptionValue = (optionIndex, valueToDelete) => {
    const updated = [...formData.productOptions];
    updated[optionIndex].values = updated[optionIndex].values.filter((v) => v !== valueToDelete);

    const newVariants = generateVariants(
      updated,
      formData.variants,
      formData.price,
      formData.quantity,
      formData.discount,
    );
    setFormData((prev) => ({ ...prev, productOptions: updated, variants: newVariants }));
  };

  const handleVariantChange = (index, field, value) => {
    const updated = [...formData.variants];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, variants: updated }));
  };

  const handleSave = async () => {
    // Marked as async
    // 1. Basic Validation
    if (!formData.category) {
      alert('Please select a Category');
      return;
    }
    if (!formData.subcategory) {
      alert('Please select a Subcategory');
      return;
    }
    if (availableTypes.length > 0 && !formData.type) {
      alert('Please select a Type');
      return;
    }
    if (!formData.brand) {
      alert('Please enter a Brand');
      return;
    }
    if (!formData.price) {
      alert('Please enter a Price');
      return;
    }

    // Validate Variants Prices
    if (formData.variants.length > 0) {
      const invalidVariant = formData.variants.find((v) => !v.price || parseFloat(v.price) <= 0);
      if (invalidVariant) {
        alert(`Please enter a valid price for variant: ${invalidVariant.name}`);
        return;
      }
    }

    setLoading(true);

    try {
      // 2. Prepare Variants with Unique IDs & Smart SKUs
      let finalVariants = [];

      const cleanForSku = (str) =>
        (str || '')
          .toString()
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-');
      const baseSkuPart = `${cleanForSku(formData.brand)}-${cleanForSku(formData.model)}`;

      if (formData.variants.length > 0) {
        finalVariants = formData.variants.map((v, index) => {
          const attrPart = Object.values(v.attributes).map(cleanForSku).join('-');
          const autoSku = `${baseSkuPart}-${attrPart}`;
          return {
            id: crypto.randomUUID(),
            sku: v.sku ? cleanForSku(v.sku) : autoSku,
            price: parseFloat(v.price) || 0,
            discount: parseFloat(v.discount) || 0,
            quantity: parseInt(v.quantity, 10) || 0,
            attributes: v.attributes,
            name: v.name,
            image: v.image || null, // Pass through the raw image selection
            inStock: parseInt(v.quantity, 10) > 0,
            // Initialize stats
            salesCount: 0,
            rating: 0,
            reviewCount: 0,
            views: 0,
          };
        });
      } else {
        finalVariants.push({
          id: crypto.randomUUID(),
          sku: `${baseSkuPart}-DEFAULT`,
          price: parseFloat(formData.price) || 0,
          discount: parseFloat(formData.discount) || 0,
          quantity: parseInt(formData.quantity, 10) || 0,
          attributes: {},
          name: 'Default',
          inStock: parseInt(formData.quantity, 10) > 0,
          salesCount: 0,
          rating: 0,
          reviewCount: 0,
          views: 0,
        });
      }

      // 3. Logic for Search & Filters

      // A. Slug Base (We will append ID later for 100% uniqueness)
      const cleanSlug = (str) =>
        (str || '')
          .toString()
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      const slugBase = `${cleanSlug(formData.brand)}-${cleanSlug(formData.model)}-${cleanSlug(formData.type)}`;

      // B. Full Search Name (for UI display)
      const searchName = `${formData.brand} ${formData.model} ${formData.type || ''}`.trim();
      const name = `${formData.brand} ${formData.model}`.trim();

      // C. Generate Keywords (Multi-Language + Transliteration logic can go here later)
      // We combine Brand, Model, Type, Categories AND Description text from all languages
      const combinedText = [
        formData.brand,
        formData.model,
        formData.type,
        formData.category,
        formData.subcategory,
        formData.descriptionEn, // Index English
        formData.descriptionRu, // Index Russian
        formData.descriptionAm, // Index Armenian
      ].join(' ');

      // Normalize: lowercase, split by space, remove short words
      const uniqueKeywords = [
        ...new Set(
          combinedText
            .toLowerCase()
            .replace(/[^\p{L}0-9\s]/gu, '') // Keep Unicode letters & numbers
            .split(/\s+/)
            .filter((k) => k.length > 2), // Filter out "in", "at", "ev"
        ),
      ];

      // D. Filter Aggregation (Save available colors/sizes as top-level arrays)
      const aggregatedAttributes = {};
      finalVariants.forEach((v) => {
        Object.entries(v.attributes).forEach(([key, val]) => {
          const filterKey = `filter_${key}`;
          if (!aggregatedAttributes[filterKey]) aggregatedAttributes[filterKey] = new Set();
          aggregatedAttributes[filterKey].add(val);
        });
      });
      const filterData = {};
      Object.keys(aggregatedAttributes).forEach((k) => {
        filterData[k] = Array.from(aggregatedAttributes[k]);
      });

      // E. Combine Perfume Notes
      let allNotes = [];
      if (formData.category === 'fragrance') {
        allNotes = [
          ...(formData.topNotes || []),
          ...(formData.middleNotes || []),
          ...(formData.baseNotes || []),
        ];
        allNotes = [...new Set(allNotes)];
      }

      // 4. Calculate Stats & Prices
      const prices = finalVariants.map((v) => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const totalStock = finalVariants.reduce((sum, v) => sum + v.quantity, 0);

      // 5. Upload Images to Firebase Storage
      const timestamp = Date.now();
      const uploadPromises = formData.images.map(async (imgBase64, index) => {
        if (typeof imgBase64 === 'string' && imgBase64.startsWith('http')) {
          return imgBase64;
        }
        const imageRef = ref(storage, `products/${timestamp}-${index}`);
        await uploadString(imageRef, imgBase64, 'data_url');
        return await getDownloadURL(imageRef);
      });

      const imageUrls = await Promise.all(uploadPromises);
      let mainImageUrl = imageUrls.length > 0 ? imageUrls[0] : '';
      let smallImageUrl = '';

      // Determine proper MAIN IMAGE URL
      if (formData.mainImage) {
        // If the main image was one of the uploaded images, find its new URL
        const mainIndex = formData.images.indexOf(formData.mainImage);
        if (mainIndex !== -1 && imageUrls[mainIndex]) {
          mainImageUrl = imageUrls[mainIndex];
        } else if (formData.mainImage.startsWith('http')) {
          // If it was already a URL (rare in Add Page but possible if we had URL input logic)
          mainImageUrl = formData.mainImage;
        }
      }

      // Determine proper SMALL IMAGE URL
      if (formData.smallImage) {
        if (formData.smallImage.startsWith('data:')) {
          // Upload the small image blob
          const smallRef = ref(storage, `products/${timestamp}-small`);
          await uploadString(smallRef, formData.smallImage, 'data_url');
          smallImageUrl = await getDownloadURL(smallRef);
        } else if (formData.smallImage.startsWith('http')) {
          smallImageUrl = formData.smallImage;
        }
      }
      // Fallback: if no small image was generated (e.g. logic missed), use mainImageUrl?
      // Better to have it. logic should have caught it.
      if (!smallImageUrl && mainImageUrl) {
        // Should we try to generate it now? Maybe too late/complex.
        // Just use main image or leave empty.
        smallImageUrl = mainImageUrl;
      }

      // 6. Construct the Database Object
      const productDataToSave = {
        // Classification
        category: formData.category,
        subcategory: formData.subcategory,
        type: formData.type,

        // Basic Info
        brand: formData.brand,
        model: formData.model,
        size: formData.size,
        unit: formData.unit,
        discount: parseFloat(formData.discount) || 0,

        // Flags
        inStock: totalStock > 0,
        original: formData.original,

        // Media
        images: imageUrls,
        mainImage: mainImageUrl,
        smallImage: smallImageUrl,

        // Content
        description: {
          am: formData.descriptionAm,
          en: formData.descriptionEn,
          ru: formData.descriptionRu,
        },

        // Fragrance Specifics
        ...(formData.topNotes && formData.topNotes.length > 0 && { topNotes: formData.topNotes }),
        ...(formData.middleNotes && formData.middleNotes.length > 0 && { middleNotes: formData.middleNotes }),
        ...(formData.baseNotes && formData.baseNotes.length > 0 && { baseNotes: formData.baseNotes }),
        ...(allNotes.length > 0 && { allPerfumeNotes: allNotes }),

        // Metadata for UI
        options: formData.productOptions.map((opt) => ({
          name: opt.name,
          values: opt.values,
        })),

        // The Variants
        variants: finalVariants.map((v) => {
          let variantImageUrl = null;
          if (v.image) {
            const imgIndex = formData.images.indexOf(v.image);
            if (imgIndex !== -1 && imageUrls[imgIndex]) {
              variantImageUrl = imageUrls[imgIndex];
            }
          }
          return {
            ...v,
            image: variantImageUrl,
            inStock: v.quantity > 0,
          };
        }),

        // CRITICAL FOR SORTING:
        price: minPrice, // Default sort price (cheapest option)
        minPrice: minPrice, // For filtering "Price > X"
        maxPrice: maxPrice, // For display "$50 - $100"

        // --- SEARCH & SEO ---
        searchName: searchName,
        name: name,
        slug: slugBase, // Base slug for now (will append ID in transaction)
        keywords: uniqueKeywords.slice(0, 500), // Safety limit for Firestore array
        ...filterData,

        // --- STATS ---
        salesCount: 0,
        rating: 0,
        reviewCount: 0,
        views: 0,

        // Additional
        customFields: formData.customFields.reduce((acc, curr) => {
          if (curr.name) acc[curr.name] = curr.value;
          return acc;
        }, {}),

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log('FINAL DB OBJECT:', productDataToSave);

      // 7. Save to Firestore with Sequential ID and Config Update
      await runTransaction(db, async (transaction) => {
        // READS MUST COME FIRST
        const counterRef = doc(db, 'counters', 'products');
        const counterDoc = await transaction.get(counterRef);

        // --- LOGIC & WRITES ---

        // A. Calculate New ID
        let newCount = 1;
        if (counterDoc.exists()) {
          newCount = counterDoc.data().count + 1;
        }
        const newId = String(newCount).padStart(7, '0'); // "0000001"

        // B. Config Updates (Brands/Sizes/Notes)
        if (formData.category) {
          const configRef = doc(db, 'config', formData.category);
          const updates = {};

          if (formData.brand) {
            updates.brands = arrayUnion(formData.brand);
          }

          if (allNotes.length > 0) {
            updates.perfumeNotes = arrayUnion(...allNotes);
          }

          const sizesToUpdate = new Set();
          if (formData.size) sizesToUpdate.add(String(formData.size));

          formData.productOptions.forEach((opt) => {
            if (opt.name && opt.name.trim().toLowerCase() === 'size') {
              opt.values.forEach((v) => sizesToUpdate.add(String(v)));
            }
          });

          if (sizesToUpdate.size > 0) {
            updates.sizes = arrayUnion(...Array.from(sizesToUpdate));
          }

          if (Object.keys(updates).length > 0) {
            transaction.set(configRef, updates, { merge: true });
          }
        }

        // C. Save Product & Update Counter
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { count: newCount });
        } else {
          transaction.update(counterRef, { count: newCount });
        }

        // --- FINAL SLUG GENERATION ---
        const finalSlug = `${slugBase}-${newId}`;

        const productRef = doc(db, 'products', newId);
        const finalProductData = {
          ...productDataToSave,
          id: newId,
          slug: finalSlug, // Overwrite with unique ID slug
        };

        transaction.set(productRef, finalProductData);
        console.log('Transaction success. Product ID:', newId);
      });

      // Update Local States for immediate feedback without refresh
      if (formData.brand && !brands.includes(formData.brand)) {
        setBrands((prev) => [...prev, formData.brand]);
      }

      const sizesToUpdate = [];
      if (formData.size && !sizes.includes(String(formData.size))) {
        sizesToUpdate.push(String(formData.size));
      }
      formData.productOptions.forEach((opt) => {
        if (opt.name && opt.name.trim().toLowerCase() === 'size') {
          opt.values.forEach((v) => {
            if (!sizes.includes(String(v))) sizesToUpdate.push(String(v));
          });
        }
      });

      if (sizesToUpdate.length > 0) {
        setSizes((prev) => [...new Set([...prev, ...sizesToUpdate])]);
      }

      // alert('Product Saved Successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Reset Form but keep Category context
      setFormData((prev) => ({
        ...initialFormState,
        category: prev.category,
      }));
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ pb: '200px' }}>
      <Typography variant="h4" gutterBottom>
        Add New Product
      </Typography>

      <Grid container spacing={3}>
        {/* Classification Section */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" gutterBottom>
              Classification
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    label="Category"
                    value={formData.category}
                    onChange={handleCategoryChange}
                  >
                    {Object.keys(categoriesObj).map((key) => (
                      <MenuItem key={key} value={key}>
                        {categoriesObj[key].label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small" disabled={!formData.category}>
                  <InputLabel>Subcategory</InputLabel>
                  <Select
                    name="subcategory"
                    label="Subcategory"
                    value={formData.subcategory}
                    onChange={handleSubcategoryChange}
                  >
                    {Object.keys(availableSubcategories).map((key) => (
                      <MenuItem key={key} value={key}>
                        {availableSubcategories[key].label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl
                  fullWidth
                  size="small"
                  disabled={!formData.subcategory || availableTypes.length === 0}
                >
                  <InputLabel>Type</InputLabel>
                  <Select name="type" label="Type" value={formData.type} onChange={handleChange}>
                    {availableTypes.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Basic Details Section */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" gutterBottom>
              Basic Details
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 5 }}>
                <Autocomplete
                  freeSolo
                  options={brands}
                  size="small"
                  value={formData.brand}
                  onChange={handleAutocompleteChange}
                  onInputChange={(event, newInputValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      brand: newInputValue,
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Brand" size="small" fullWidth name="brand" />
                  )}
                />
              </Grid>

              <Grid size={{ xs: 12, md: 5 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Model"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Autocomplete
                  freeSolo
                  options={sizes}
                  size="small"
                  value={formData.size}
                  onInputChange={(event, newInputValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      size: newInputValue,
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField {...params} label="Size" size="small" fullWidth name="size" type="text" />
                  )}
                  onChange={handleChange}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Unit</InputLabel>
                  <Select name="unit" label="Unit" value={formData.unit} onChange={handleChange}>
                    {units.map((u) => (
                      <MenuItem key={u} value={u}>
                        {u}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Quantity"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Price"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Discount (%)"
                  name="discount"
                  value={formData.discount}
                  onChange={(e) => {
                    // When global discount changes, update new variants if any, but `handleChange` does that automatically via setFormData.
                    // Wait, we need to decide if changing global discount retroactively updates variants.
                    // The user requirement: "inherit by default". This usually implies "at creation time".
                    // But if I change global discount, should I update variants? Probably safer not to overwrite user overrides unless specific action.
                    // However, passing it to `handleChange` updates state. The variants generation happens when OPTIONS change.
                    handleChange(e);
                  }}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControlLabel
                  control={
                    <Checkbox checked={formData.inStock} onChange={handleCheckboxChange} name="inStock" />
                  }
                  label="In Stock"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControlLabel
                  control={
                    <Checkbox checked={formData.original} onChange={handleCheckboxChange} name="original" />
                  }
                  label="Original Product"
                />
              </Grid>
              {/* Fragrance Specific Notes */}
              {availableNotes.length > 0 && (
                <>
                  <Grid size={{ xs: 12 }}>
                    <Divider sx={{ my: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        Fragrance Notes
                      </Typography>
                    </Divider>
                  </Grid>
                  {['topNotes', 'middleNotes', 'baseNotes'].map((noteField) => (
                    <Grid size={{ xs: 12, md: 4 }} key={noteField}>
                      <Autocomplete
                        multiple
                        freeSolo
                        options={availableNotes}
                        size="small"
                        value={formData[noteField]}
                        onChange={(event, newValue) => {
                          setFormData((prev) => ({ ...prev, [noteField]: newValue }));
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={noteField
                              .replace(/([A-Z])/g, ' $1')
                              .replace(/^./, (str) => str.toUpperCase())}
                            size="small"
                            fullWidth
                          />
                        )}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => {
                            const { key, ...tagProps } = getTagProps({ index });
                            return <Chip key={key} size="small" label={option} {...tagProps} />;
                          })
                        }
                      />
                    </Grid>
                  ))}
                </>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Custom Fields Section */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Custom Fields</Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddCustomField} variant="outlined" size="small">
                Add Field
              </Button>
            </Box>
            <Stack spacing={2}>
              {formData.customFields.map((field, index) => (
                <Grid container spacing={2} key={index} alignItems="center">
                  <Grid size={{ xs: 5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Field Name"
                      value={field.name}
                      onChange={(e) => handleCustomFieldChange(index, 'name', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 5 }}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Value"
                      value={field.value}
                      onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                    />
                  </Grid>
                  <Grid size={{ xs: 2 }}>
                    <IconButton onClick={() => handleDeleteCustomField(index)} color="error" size="small">
                      <DeleteIcon />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
              {formData.customFields.length === 0 && (
                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                  No custom fields added.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Available Options Section */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Available Options</Typography>
              <Button startIcon={<AddIcon />} onClick={handleAddOption} variant="outlined" size="small">
                Add Option Group
              </Button>
            </Box>
            <Stack spacing={3}>
              {formData.productOptions.map((option, index) => (
                <Box key={index} sx={{ border: '1px solid #eee', p: 2, borderRadius: 1 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid size={{ xs: 10, md: 4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Option Name (e.g., Color)"
                        value={option.name}
                        onChange={(e) => handleOptionNameChange(index, e.target.value)}
                      />
                    </Grid>
                    <Grid size={{ xs: 2, md: 1 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <IconButton onClick={() => handleDeleteOption(index)} color="error" size="small">
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                    <Grid size={{ xs: 12, md: 7 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        {option.name && option.name.trim().toLowerCase() === 'size' ? (
                          <Autocomplete
                            freeSolo
                            options={[...new Set(sizes.map(String))]}
                            size="small"
                            sx={{ flexGrow: 1 }}
                            inputValue={option.currentValue || ''}
                            onInputChange={(event, newInputValue) => {
                              handleOptionValueInputChange(index, newInputValue);
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label="Add Value"
                                size="small"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddOptionValue(index);
                                  }
                                }}
                              />
                            )}
                          />
                        ) : (
                          <TextField
                            size="small"
                            label="Add Value"
                            value={option.currentValue || ''}
                            onChange={(e) => handleOptionValueInputChange(index, e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddOptionValue(index);
                              }
                            }}
                            sx={{ flexGrow: 1 }}
                          />
                        )}
                        <Button variant="contained" size="small" onClick={() => handleAddOptionValue(index)}>
                          Add
                        </Button>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                        {option.values.map((val, vIndex) => (
                          <Chip
                            key={vIndex}
                            label={val}
                            onDelete={() => handleDeleteOptionValue(index, val)}
                            size="small"
                          />
                        ))}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              ))}
              {formData.productOptions.length === 0 && (
                <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                  No options created.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Product Variants Table (Generated) */}
        {formData.variants && formData.variants.length > 0 && (
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" gutterBottom>
                Product Variants
              </Typography>
              <TableContainer sx={{ overflowX: 'auto' }}>
                <Table size="small" sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Variant</TableCell>
                      <TableCell width="15%">Image</TableCell>
                      <TableCell width="15%">Price</TableCell>
                      <TableCell width="15%">Quantity</TableCell>
                      <TableCell width="15%">Discount (%)</TableCell>
                      <TableCell width="25%">SKU</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {formData.variants.map((variant, index) => (
                      <TableRow key={index}>
                        <TableCell>{variant.name}</TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select
                              value={formData.images.includes(variant.image) ? variant.image : ''}
                              displayEmpty
                              onChange={(e) => handleVariantChange(index, 'image', e.target.value)}
                              renderValue={(selected) => {
                                if (!selected) return <Typography variant="caption">Default</Typography>;
                                return (
                                  <Box
                                    component="img"
                                    src={selected}
                                    sx={{ width: 30, height: 30, objectFit: 'contain' }}
                                  />
                                );
                              }}
                            >
                              <MenuItem value="">
                                <em>Default</em>
                              </MenuItem>
                              {formData.images.map((img, i) => (
                                <MenuItem key={i} value={img}>
                                  <Box
                                    component="img"
                                    src={img}
                                    sx={{ width: 40, height: 40, objectFit: 'contain', mr: 1 }}
                                  />
                                  Image {i + 1}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            value={variant.price}
                            onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            value={variant.quantity}
                            onChange={(e) => handleVariantChange(index, 'quantity', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            fullWidth
                            value={variant.discount}
                            onChange={(e) => handleVariantChange(index, 'discount', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            fullWidth
                            value={variant.sku}
                            onChange={(e) => handleVariantChange(index, 'sku', e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}

        {/* Descriptions Section */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant="h6" gutterBottom>
              Description
            </Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="Description (Armenian)"
                name="descriptionAm"
                value={formData.descriptionAm}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="Description (English)"
                name="descriptionEn"
                value={formData.descriptionEn}
                onChange={handleChange}
              />
              <TextField
                fullWidth
                size="small"
                multiline
                rows={3}
                label="Description (Russian)"
                name="descriptionRu"
                value={formData.descriptionRu}
                onChange={handleChange}
              />
            </Stack>
          </Paper>
        </Grid>

        {/* Images Placeholder */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: { xs: 2, md: 3 }, position: 'relative' }}>
            <Backdrop
              sx={{
                position: 'absolute',
                zIndex: 10,
                borderRadius: 1,
                backgroundColor: 'rgba(255,255,255,0.7)',
              }}
              open={imageProcessing}
            >
              <CircularProgress color="primary" />
            </Backdrop>
            <Typography variant="h6" gutterBottom>
              Images
            </Typography>
            <Box
              component="label"
              sx={{
                border: '2px dashed #ccc',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                bgcolor: '#fafafa',
                display: 'block',
              }}
            >
              <input type="file" hidden multiple accept="image/*" onChange={handleImageUpload} />
              <CloudUploadIcon sx={{ fontSize: 48, color: '#ccc' }} />
              <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
                Click to upload product images
              </Typography>
            </Box>

            {/* Image Preview Grid */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {formData.images.map((image, index) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
                  <Box
                    sx={{
                      position: 'relative',
                      border: formData.mainImage === image ? '2px solid #1976d2' : '1px solid #eee',
                      borderRadius: 1,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      component="img"
                      src={image}
                      alt={`Product ${index}`}
                      sx={{ width: '100%', display: 'block' }}
                      onClick={() => handleSetMainImage(image)}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 2,
                        right: 2,
                        bgcolor: 'rgba(255,255,255,0.7)',
                        borderRadius: '50%',
                      }}
                    >
                      <IconButton size="small" onClick={() => handleDeleteImage(index)}>
                        <DeleteIcon fontSize="small" color="error" />
                      </IconButton>
                    </Box>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 2,
                        left: 2,
                        cursor: 'pointer',
                      }}
                      onClick={() => handleSetMainImage(image)}
                    >
                      {formData.mainImage === image ? (
                        <StarIcon color="primary" />
                      ) : (
                        <StarBorderIcon color="action" />
                      )}
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Action Buttons */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button size="small" variant="outlined" color="secondary" disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              size="small"
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
            >
              {loading ? 'Saving...' : 'Save Product'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
