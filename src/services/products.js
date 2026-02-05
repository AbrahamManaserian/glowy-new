import { db } from '../../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  Timestamp,
  getCountFromServer,
  doc,
  getDoc,
} from 'firebase/firestore';
import { unstable_cache } from 'next/cache';

// Helper to serialize Firestore data to plain JSON
const serializeData = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt || Date.now(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : data.updatedAt || Date.now(),
  };
};

// 1. Separate Count Fetcher (Cached separately since it changes less often than sort/page)
async function fetchProductCount(filters) {
  try {
    let q = collection(db, 'products');
    const constraints = buildConstraints(filters); // Extract build logic
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('Count Error', error);
    return 0;
  }
}

// Helper to build constraints (reused)
function buildConstraints(filters) {
  
  const constraints = [];
  // 1. Sorting (Note: Sort must be applied to query but for COUNT it typically doesn't matter unless limits,
  // but for WHERE clauses it matters. OrderBy usually strictly coupled with StartAfter.)

  // NOTE: For count, OrderBy is irrelevant unless we have complexity.
  // We include Where clauses only.

  if (filters.minPrice > 0) constraints.push(where('maxPrice', '>=', filters.minPrice)); // At least one variant is expensive enough
  if (filters.maxPrice > 0) constraints.push(where('minPrice', '<=', filters.maxPrice)); // At least one variant is cheap enough
  if (filters.originalBrand) constraints.push(where('original', '==', true)); // Changed isOriginal -> original

  // Handle Category/Subcategory (Allow array 'IN' or single '==')
  if (filters.category) {
    if (Array.isArray(filters.category) && filters.category.length > 0) {
      constraints.push(where('category', 'in', filters.category.slice(0, 10)));
    } else if (typeof filters.category === 'string') {
      constraints.push(where('category', '==', filters.category));
    }
  }

  if (filters.subcategory) {
    if (Array.isArray(filters.subcategory) && filters.subcategory.length > 0) {
      constraints.push(where('subcategory', 'in', filters.subcategory.slice(0, 10)));
    } else if (typeof filters.subcategory === 'string') {
      constraints.push(where('subcategory', '==', filters.subcategory));
    }
  }

  if (filters.onlyStock) constraints.push(where('inStock', '==', true)); // Changed stock > 0 -> inStock == true
  if (filters.discounted) constraints.push(where('discount', '>', 0));

  if (filters.types?.length > 0) {
    // Ensure we handle both string and array just in case, but usually array
    const types = Array.isArray(filters.types) ? filters.types : [filters.types];
    constraints.push(where('type', 'in', types.slice(0, 10)));
  }

  if (filters.brands?.length > 0) {
    const brands = Array.isArray(filters.brands) ? filters.brands : [filters.brands];
    constraints.push(where('brand', 'in', brands.slice(0, 10)));
  }

  // === UPDATED LOGIC: Use 'filters' array for combined attributes (Size, Notes, etc.) ===
  // The 'filters' field in Firestore contains strings like:
  // "size:100ml", "notes:Rose", "brand:Chanel", "category:Fragrance"
  // We combine all array-based attribute filters into one list to use 'array-contains-any'.

  const filterTags = [];

  // 1. Map Sizes -> "size:VALUE"
  if (filters.sizes?.length > 0) {
    const sizes = Array.isArray(filters.sizes) ? filters.sizes : [filters.sizes];
    sizes.forEach((s) => filterTags.push(`size:${s}`));
  }

  // 2. Map Notes -> "notes:VALUE"
  if (filters.notes?.length > 0) {
    const notes = Array.isArray(filters.notes) ? filters.notes : [filters.notes];
    notes.forEach((n) => filterTags.push(`notes:${n}`));
  }

  // 3. Apply the combined constraint
  if (filterTags.length > 0) {
    // Firestore Limit: max 10 items in array-contains-any

    constraints.push(where('filters', 'array-contains-any', filterTags.slice(0, 10)));
  }

  return constraints;
}

// 2. Fetch Page Data (Cursor Based)
const fetchProductsPage = async (filters, pageLimit, cursorId, direction) => {
  try {
    let q = collection(db, 'products');

    const constraints = buildConstraints(filters);

    // Sorting MUST be applied before pagination
    const sort = filters.sort || 'default';
    if (sort === 'price-asc')
      constraints.push(orderBy('minPrice', 'asc')); // Changed price -> minPrice
    else if (sort === 'price-desc')
      constraints.push(orderBy('maxPrice', 'desc')); // Changed price -> maxPrice
    else if (sort === 'newest') constraints.push(orderBy('createdAt', 'desc'));
    else if (sort === 'oldest') constraints.push(orderBy('createdAt', 'asc'));
    // Default fallback order usually needed for stable pagination if no sort
    else constraints.push(orderBy('id')); // Fallback

    // fetch cursor doc if needed
    let cursorDoc = null;
    if (cursorId && (direction === 'next' || direction === 'prev')) {
      const docRef = doc(db, 'products', cursorId);
      cursorDoc = await getDoc(docRef);
    }

    // Apply Pagination Constraints
    if (direction === 'next' && cursorDoc) {
      constraints.push(startAfter(cursorDoc));
      constraints.push(limit(pageLimit));
    } else if (direction === 'prev' && cursorDoc) {
      constraints.push(endBefore(cursorDoc));
      constraints.push(limitToLast(pageLimit)); // Important: Fetch LAST N items before the cursor
    } else if (direction === 'last') {
      constraints.push(limitToLast(pageLimit));
    } else {
      // First page or default
      constraints.push(limit(pageLimit));
    }

    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(serializeData);
  } catch (error) {
    console.error('Error fetching page:', error);
    return [];
  }
};

export const getCachedProducts = async (
  filters,
  page = 1,
  pageLimit = 4,
  cursorId = null,
  direction = null,
) => {
  const filterKey = JSON.stringify(filters);

  // 1. Get Total Count (Cached independently)
  const total = await unstable_cache(
    async () => fetchProductCount(filters),
    [`products-count-${filterKey}`],
    // { revalidate: 3600, tags: ['products'] }
    { cache: 'no-store', tags: ['products'] },
  )();

  // 2. Get Page Data (Cached by specific page/cursor params)
  // We include page number in key just to differentiate "First Page" requests,
  // but rely on cursorId for actual uniqueness for Next/Prev
  const products = await unstable_cache(
    async () => fetchProductsPage(filters, pageLimit, cursorId, direction),
    [`products-page-${filterKey}-${cursorId || 'start'}-${direction || 'first'}`],
    // { revalidate: 3600, tags: ['products'] }
    { cache: 'no-store', tags: ['products'] },
  )();

  return {
    products,
    total,
    totalPages: Math.ceil(total / pageLimit) || 1,
    currentPage: Math.max(1, page),
  };
};
