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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import Resizer from 'react-image-file-resizer';

import { db, storage } from '../../../../../../firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  arrayUnion,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  previousPrice: '',
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

const generateVariants = (options, existingVariants, basePrice, baseQuantity) => {
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

    if (existing) return existing;

    return {
      name: uniqueKey,
      attributes,
      price: basePrice || '',
      quantity: baseQuantity || '',
      sku: '',
    };
  });
};

export default function EditProductPage() {
  const router = useRouter();

  // Search State
  const [searchId, setSearchId] = useState('');
  const [currentProductId, setCurrentProductId] = useState(null);

  const [formData, setFormData] = useState(initialFormState);
  const [categoriesObj, setCategoriesObj] = useState({});
  const [availableSubcategories, setAvailableSubcategories] = useState({});
  const [availableTypes, setAvailableTypes] = useState([]);
  const [brands, setBrands] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [availableNotes, setAvailableNotes] = useState([]);

  const [loading, setLoading] = useState(false); // For Save action
  const [searching, setSearching] = useState(false); // For Search action
  const [imageProcessing, setImageProcessing] = useState(false); // For Image resizing/processing

  // Store original product data to preserve immutable fields (like createdAt, salesCount)
  const [originalProduct, setOriginalProduct] = useState(null);

  // 1. Fetch Global Config on Mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const catConfigRef = doc(db, 'config', 'categories');
        const catConfigSnap = await getDoc(catConfigRef);
        if (catConfigSnap.exists()) {
          setCategoriesObj(catConfigSnap.data().categories || {});
        }
      } catch (error) {
        console.error('Error fetching categories config:', error);
      }
    };
    fetchConfig();
  }, []);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchId.trim()) {
      alert('Please enter a Product ID');
      return;
    }

    setSearching(true);
    setOriginalProduct(null); // Reset UI
    setCurrentProductId(null);

    try {
      const productRef = doc(db, 'products', searchId.trim());
      const productSnap = await getDoc(productRef);

      if (productSnap.exists()) {
        const data = productSnap.data();
        setOriginalProduct(data);
        setCurrentProductId(data.id); // Or searchId.trim()

        // Populate Form State
        setFormData({
          category: data.category || '',
          subcategory: data.subcategory || '',
          type: data.type || '',
          brand: data.brand || '',
          model: data.model || '',
          size: data.size || '',
          unit: data.unit || '',
          price: data.price ? data.price.toString() : '',
          previousPrice: data.previousPrice ? data.previousPrice.toString() : '',
          quantity: data.totalStock !== undefined ? data.totalStock : data.stock || 0,

          images: data.images || [],
          mainImage: data.mainImage || '',
          smallImage: data.smallImage || '',
          descriptionAm: data.description?.am || '',
          descriptionEn: data.description?.en || '',
          descriptionRu: data.description?.ru || '',
          inStock: data.inStock ?? true,
          original: data.original ?? true,
          customFields: Object.entries(data.customFields || {}).map(([key, val]) => ({
            name: key,
            value: val,
          })),

          // Map Options
          productOptions: (data.options || []).map((opt) => ({
            name: opt.name,
            values: opt.values,
            currentValue: '',
          })),

          variants: (data.variants || []).map((v) => ({
            ...v,
            price: v.price?.toString() || '',
            quantity: v.quantity?.toString() || '',
          })),

          // Fragrance
          topNotes: data.topNotes || [],
          middleNotes: data.middleNotes || [],
          baseNotes: data.baseNotes || [],
        });

        // Set Dependencies
        if (data.category && categoriesObj[data.category]) {
          const subCats = categoriesObj[data.category].subcategories || {};
          setAvailableSubcategories(subCats);

          if (data.subcategory && subCats[data.subcategory]) {
            setAvailableTypes(subCats[data.subcategory].types || []);
          }

          // Fetch Category Specific Config
          const catSpecificRef = doc(db, 'config', data.category);
          const catSpecificSnap = await getDoc(catSpecificRef);
          if (catSpecificSnap.exists()) {
            const specData = catSpecificSnap.data();
            setBrands(specData.brands || []);
            setSizes([...new Set((specData.sizes || []).map(String))]);
            setAvailableNotes(specData.perfumeNotes || []);
          }
        }
      } else {
        alert('Product not found!');
      }
    } catch (error) {
      console.error('Error searching product:', error);
      alert('Error fetching product. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Helper to fetch category config when user changes category manually
  const fetchCategoryConfig = async (category) => {
    try {
      const docRef = doc(db, 'config', category);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBrands(data.brands || []);
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
    }
  };

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
      ...(category !== 'fragrance' ? { topNotes: [], middleNotes: [], baseNotes: [] } : {}),
    }));

    setAvailableSubcategories(categoriesObj[category]?.subcategories || {});
    setAvailableTypes([]);
    await fetchCategoryConfig(category);
  };

  const handleSubcategoryChange = (e) => {
    const subcategory = e.target.value;
    setFormData((prev) => ({
      ...prev,
      subcategory,
      type: '',
    }));
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
        width,
        height,
        'JPEG',
        quality,
        0,
        (uri) => {
          resolve(uri);
        },
        'base64',
      );
    });

  const generateSmallImage = async (imageSource) => {
    if (!imageSource) return '';
    try {
      if (imageSource.startsWith('data:')) {
        // Base64 - convert to blob then resize
        const response = await fetch(imageSource);
        const blob = await response.blob();
        return await resizeFile(blob, 300, 300, 70);
      } else if (imageSource.startsWith('http')) {
        try {
          // URL - try fetch, if CORS fails, catch block handles it
          // setting mode: 'no-cors' returns an opaque response which we can't blob(), so we must use 'cors'
          // If 'cors' fails, we just return the original image
          const response = await fetch(imageSource, {
            mode: 'cors',
            headers: { 'Access-Control-Allow-Origin': '*' },
          });
          if (!response.ok) throw new Error('Fetch failed');
          const blob = await response.blob();
          return await resizeFile(blob, 300, 300, 70);
        } catch (fetchErr) {
          // Return original image if we can't fetch/resize it (CORS, etc)
          // valid fallback
          return imageSource;
        }
      }
    } catch (e) {
      console.warn('Error generating small image:', e);
      return imageSource; // Fallback
    }
    return imageSource;
  };

  // Image Handling
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
            // Resize Normal: Target ~100KB (e.g. 1000x1000 @ 80%)
            const resizedImage = await resizeFile(file, 1000, 1000, 80);
            newImages.push(resizedImage);

            // If no main image exists, generate a small version from the FIRST uploaded file
            // Target ~20KB (e.g. 300x300 @ 60% or 70%)
            if (!formData.mainImage && i === 0 && !firstSmallImage) {
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
            // Set small image if generated
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

  const handleDeleteImage = async (index) => {
    setImageProcessing(true);
    try {
      const currentImages = [...formData.images];
      const imageToDelete = currentImages[index];
      const updatedImages = currentImages.filter((_, i) => i !== index);

      let newMainImage = formData.mainImage;
      let newSmallImage = formData.smallImage;

      if (imageToDelete === formData.mainImage) {
        // Main image deleted, pick next available
        newMainImage = updatedImages.length > 0 ? updatedImages[0] : '';
        if (newMainImage) {
          // Generate new small image from new main
          newSmallImage = await generateSmallImage(newMainImage);
        } else {
          newSmallImage = '';
        }
      }

      setFormData((prev) => ({
        ...prev,
        images: updatedImages,
        mainImage: newMainImage,
        smallImage: newSmallImage,
      }));
    } catch (e) {
      console.error('Error deleting image', e);
    } finally {
      setImageProcessing(false);
    }
  };

  const handleSetMainImage = async (image) => {
    setImageProcessing(true);
    try {
      const smallImageUri = await generateSmallImage(image);
      setFormData((prev) => ({
        ...prev,
        mainImage: image,
        smallImage: smallImageUri || image, // Ensure we have something
      }));
    } catch (e) {
      console.error('Error setting main image', e);
      // Fallback
      setFormData((prev) => ({
        ...prev,
        mainImage: image,
      }));
    } finally {
      setImageProcessing(false);
    }
  };

  // Custom Fields & Options
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
    const newVariants = generateVariants(updated, formData.variants, formData.price, formData.quantity);
    setFormData((prev) => ({ ...prev, productOptions: updated, variants: newVariants }));
  };
  const handleOptionNameChange = (index, value) => {
    const updated = [...formData.productOptions];
    updated[index].name = value;
    if (
      value.trim().toLowerCase() === 'size' &&
      formData.size &&
      !updated[index].values.includes(formData.size)
    ) {
      updated[index].values.push(formData.size);
    }
    const newVariants = generateVariants(updated, formData.variants, formData.price, formData.quantity);
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
      const newVariants = generateVariants(updated, formData.variants, formData.price, formData.quantity);
      setFormData((prev) => ({ ...prev, productOptions: updated, variants: newVariants }));
    }
  };
  const handleDeleteOptionValue = (optionIndex, valueToDelete) => {
    const updated = [...formData.productOptions];
    updated[optionIndex].values = updated[optionIndex].values.filter((v) => v !== valueToDelete);
    const newVariants = generateVariants(updated, formData.variants, formData.price, formData.quantity);
    setFormData((prev) => ({ ...prev, productOptions: updated, variants: newVariants }));
  };
  const handleVariantChange = (index, field, value) => {
    const updated = [...formData.variants];
    updated[index][field] = value;
    setFormData((prev) => ({ ...prev, variants: updated }));
  };

  const resetForm = () => {
    setFormData(initialFormState);
    setCurrentProductId(null);
    setSearchId('');
    setOriginalProduct(null);
    setBrands([]);
    setSizes([]);
    setAvailableNotes([]);
    setAvailableTypes([]);
    setAvailableSubcategories([]);
  };

  const handleDeleteProduct = async () => {
    if (!currentProductId) return;

    if (!window.confirm('Are you sure you want to DELETE this product? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      // 1. Delete Images from Storage
      if (formData.images && formData.images.length > 0) {
        await Promise.all(
          formData.images.map(async (url) => {
            // Only try to delete if it's a firebase storage url
            if (typeof url === 'string' && url.includes('firebasestorage')) {
              try {
                const imageRef = ref(storage, url);
                await deleteObject(imageRef);
              } catch (err) {
                console.warn('Could not delete image', url, err);
              }
            }
          }),
        );
      }

      // 2. Delete Product Document
      await deleteDoc(doc(db, 'products', currentProductId));

      alert('Product deleted successfully.');
      resetForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product.');
    } finally {
      setLoading(false);
    }
  };

  // --- SAVE LOGIC ---
  const handleSave = async () => {
    if (!currentProductId) {
      alert('No product selected for update.');
      return;
    }
    if (!formData.category) return alert('Please select a Category');
    if (!formData.subcategory) return alert('Please select a Subcategory');
    if (!formData.brand) return alert('Please enter a Brand');
    if (!formData.price) return alert('Please enter a Price');

    if (formData.variants.length > 0) {
      const invalidVariant = formData.variants.find((v) => !v.price || parseFloat(v.price) <= 0);
      if (invalidVariant) return alert(`Please enter a valid price for variant: ${invalidVariant.name}`);
    }

    setLoading(true);

    try {
      // 1. Prepare Variants
      let finalVariants = [];
      const cleanForSku = (str) =>
        (str || '')
          .toString()
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '-');
      const baseSkuPart = `${cleanForSku(formData.brand)}-${cleanForSku(formData.model)}`;

      if (formData.variants.length > 0) {
        finalVariants = formData.variants.map((v) => {
          const attrPart = Object.values(v.attributes).map(cleanForSku).join('-');
          const autoSku = `${baseSkuPart}-${attrPart}`;
          return {
            id: v.id || crypto.randomUUID(), // Keep existing ID if present
            sku: v.sku ? cleanForSku(v.sku) : autoSku,
            price: parseFloat(v.price) || 0,
            quantity: parseInt(v.quantity, 10) || 0,
            attributes: v.attributes,
            name: v.name,
            inStock: parseInt(v.quantity, 10) > 0,
          };
        });
      } else {
        // Fallback or "Simple Product" mode logic
        finalVariants.push({
          id: (formData.variants[0] && formData.variants[0].id) || crypto.randomUUID(),
          sku: `${baseSkuPart}-DEFAULT`,
          price: parseFloat(formData.price) || 0,
          quantity: parseInt(formData.quantity, 10) || 0,
          attributes: {},
          name: 'Default',
          inStock: parseInt(formData.quantity, 10) > 0,
        });
      }

      // 2. Search & Filters
      const cleanSlug = (str) =>
        (str || '')
          .toString()
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
      const slugBase = `${cleanSlug(formData.brand)}-${cleanSlug(formData.model)}-${cleanSlug(formData.type)}`;

      const searchName = `${formData.brand} ${formData.model} ${formData.type || ''}`.trim();

      const combinedText = [
        formData.brand,
        formData.model,
        formData.type,
        formData.category,
        formData.subcategory,
        formData.descriptionEn,
        formData.descriptionRu,
        formData.descriptionAm,
      ].join(' ');

      const uniqueKeywords = [
        ...new Set(
          combinedText
            .toLowerCase()
            .replace(/[^\p{L}0-9\s]/gu, '')
            .split(/\s+/)
            .filter((k) => k.length > 2),
        ),
      ];

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

      let allNotes = [];
      if (formData.category === 'fragrance') {
        allNotes = [
          ...(formData.topNotes || []),
          ...(formData.middleNotes || []),
          ...(formData.baseNotes || []),
        ];
        allNotes = [...new Set(allNotes)];
      }

      const prices = finalVariants.map((v) => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const totalStock = finalVariants.reduce((sum, v) => sum + v.quantity, 0);

      // 3. Image Upload (and Deletion of Removed Images)
      // A. Delete removed images from Storage first
      if (originalProduct && originalProduct.images) {
        const imagesToDelete = originalProduct.images.filter((url) => !formData.images.includes(url));
        if (imagesToDelete.length > 0) {
          await Promise.all(
            imagesToDelete.map(async (url) => {
              try {
                const imageRef = ref(storage, url);
                await deleteObject(imageRef);
              } catch (err) {
                console.warn('Failed to delete orphaned image:', url, err);
                // convert error to string to check message
                const errStr = String(err);
                if (errStr.includes('storage/object-not-found')) {
                  console.log('Image already deleted, ignoring.');
                }
              }
            }),
          );
        }
      }

      // B. Upload New Images (Preserve URLs, Upload Base64)
      const timestamp = Date.now();
      const uploadPromises = formData.images.map(async (imgOrUrl, index) => {
        if (typeof imgOrUrl === 'string' && imgOrUrl.startsWith('http')) {
          return imgOrUrl; // Already hosted
        }
        // It's a base64 string
        const imageRef = ref(storage, `products/${timestamp}-${index}`);
        await uploadString(imageRef, imgOrUrl, 'data_url');
        return await getDownloadURL(imageRef);
      });

      const imageUrls = await Promise.all(uploadPromises);
      let mainImageUrl = imageUrls.length > 0 ? imageUrls[0] : '';
      let smallImageUrl = '';

      // Determine main image URL
      if (formData.mainImage) {
        const mainIndex = formData.images.indexOf(formData.mainImage);
        if (mainIndex !== -1 && imageUrls[mainIndex]) {
          mainImageUrl = imageUrls[mainIndex];
        } else if (formData.mainImage.startsWith('http')) {
          mainImageUrl = formData.mainImage;
        }
      }

      // Handle Small Image Upload/Logic
      if (formData.smallImage) {
        if (formData.smallImage.startsWith('data:')) {
          const smallRef = ref(storage, `products/${timestamp}-small`);
          await uploadString(smallRef, formData.smallImage, 'data_url');
          smallImageUrl = await getDownloadURL(smallRef);
        } else if (formData.smallImage.startsWith('http')) {
          smallImageUrl = formData.smallImage;
        }
      }

      if (!smallImageUrl && mainImageUrl) {
        smallImageUrl = mainImageUrl; // Fallback
      }

      // Cleanup Old Small Image if changed
      // If original had a small image, and the new small image is different (e.g. regenerated or changed)
      // we should delete the old one, UNLESS it's just the main image URL being reused.
      if (
        originalProduct?.smallImage &&
        originalProduct.smallImage !== smallImageUrl &&
        originalProduct.smallImage.includes('firebasestorage')
      ) {
        // Only delete if it's not present in the current images array (safety check in case it was a big image reused)
        // Also ensure we are not deleting what we just decided is the new small image (if logic above reused it)
        if (
          !formData.images.includes(originalProduct.smallImage) &&
          originalProduct.smallImage !== mainImageUrl &&
          originalProduct.smallImage !== smallImageUrl
        ) {
          try {
            const smallRef = ref(storage, originalProduct.smallImage);
            await deleteObject(smallRef);
          } catch (err) {
            console.warn('Failed to delete old small image', err);
          }
        }
      }

      // 4. Construct DB Object
      const productDataToSave = {
        ...originalProduct, // Start with everything we fetched

        // Updates:
        category: formData.category,
        subcategory: formData.subcategory,
        type: formData.type,
        brand: formData.brand,
        model: formData.model,
        size: formData.size,
        unit: formData.unit,
        inStock: totalStock > 0,
        original: formData.original,
        images: imageUrls,
        mainImage: mainImageUrl,
        smallImage: smallImageUrl,
        description: {
          am: formData.descriptionAm,
          en: formData.descriptionEn,
          ru: formData.descriptionRu,
        },
        // Fragrance
        topNotes: formData.topNotes || [],
        middleNotes: formData.middleNotes || [],
        baseNotes: formData.baseNotes || [],
        allPerfumeNotes: allNotes,

        options: formData.productOptions.map((opt) => ({
          name: opt.name,
          values: opt.values,
        })),

        variants: finalVariants.map((v) => ({
          ...v,
          inStock: v.quantity > 0,
        })),

        price: minPrice,
        minPrice: minPrice,
        maxPrice: maxPrice,

        searchName: searchName,
        name: searchName,
        // Update Slug (Keep ID)
        slug: `${slugBase}-${currentProductId}`,
        keywords: uniqueKeywords.slice(0, 500),

        ...filterData,

        customFields: formData.customFields.reduce((acc, curr) => {
          if (curr.name) acc[curr.name] = curr.value;
          return acc;
        }, {}),

        updatedAt: serverTimestamp(),
      };

      // 5. Transaction to Update
      await runTransaction(db, async (transaction) => {
        // Config Update Logic
        if (formData.category) {
          const configRef = doc(db, 'config', formData.category);
          const updates = {};
          if (formData.brand) updates.brands = arrayUnion(formData.brand);
          if (allNotes.length > 0) updates.perfumeNotes = arrayUnion(...allNotes);

          const sizesToUpdate = new Set();
          if (formData.size) sizesToUpdate.add(String(formData.size));
          formData.productOptions.forEach((opt) => {
            if (opt.name && opt.name.trim().toLowerCase() === 'size') {
              opt.values.forEach((v) => sizesToUpdate.add(String(v)));
            }
          });
          if (sizesToUpdate.size > 0) updates.sizes = arrayUnion(...Array.from(sizesToUpdate));

          if (Object.keys(updates).length > 0) {
            transaction.set(configRef, updates, { merge: true });
          }
        }

        // Save Product
        const productRef = doc(db, 'products', currentProductId);
        transaction.set(productRef, productDataToSave);
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
      alert('Product Updated Successfully');
      resetForm();
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ pb: '200px' }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <IconButton onClick={() => router.back()}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4">Edit Product</Typography>
      </Stack>

      <Paper
        sx={{
          p: 3,
          mb: 4,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          alignItems: 'center',
        }}
      >
        <TextField
          label="Enter Product ID to Edit"
          size="small"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          sx={{ width: { xs: '100%', sm: 300 } }}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleSearch(e);
          }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={handleSearch}
          disabled={searching}
          startIcon={searching ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
        >
          {searching ? 'Fetching...' : 'Fetch Product'}
        </Button>
      </Paper>

      {/* RENDER FORM ONLY IF PRODUCT LOADED */}
      {currentProductId && (
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
                    helperText="Base count"
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
                    label="Previous Price"
                    name="previousPrice"
                    value={formData.previousPrice}
                    onChange={handleChange}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControlLabel
                    control={
                      <Checkbox checked={formData.inStock} onChange={handleCheckboxChange} name="inStock" />
                    }
                    label="In Stock"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
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
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddCustomField}
                  variant="outlined"
                  size="small"
                >
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
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => handleAddOptionValue(index)}
                          >
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
                        <TableCell width="25%">Price</TableCell>
                        <TableCell width="20%">Quantity</TableCell>
                        <TableCell width="35%">SKU</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.variants.map((variant, index) => (
                        <TableRow key={index}>
                          <TableCell>{variant.name}</TableCell>
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
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between',
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: 2,
              }}
            >
              <Button
                variant="outlined"
                color="error"
                onClick={handleDeleteProduct}
                startIcon={<DeleteIcon />}
                disabled={loading}
                size="small"
              >
                Delete Product
              </Button>

              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button variant="outlined" color="secondary" onClick={() => router.back()} size="small">
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                  size="small"
                >
                  Update Product
                </Button>
              </Box>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
