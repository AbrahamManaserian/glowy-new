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

  if (filters.minPrice > 0) constraints.push(where('price', '>=', filters.minPrice));
  if (filters.maxPrice > 0) constraints.push(where('price', '<=', filters.maxPrice));
  if (filters.originalBrand) constraints.push(where('isOriginal', '==', true));
  if (filters.onlyStock) constraints.push(where('stock', '>', 0));
  if (filters.discounted) constraints.push(where('discount', '>', 0));

  if (filters.categories?.length > 0)
    constraints.push(where('category', 'in', filters.categories.slice(0, 10)));
  else if (filters.subcategories?.length > 0)
    constraints.push(where('subcategory', 'in', filters.subcategories.slice(0, 10))); // 'in' mutually exclusive usually
  else if (filters.types?.length > 0) constraints.push(where('type', 'in', filters.types.slice(0, 10)));
  else if (filters.brands?.length > 0) constraints.push(where('brand', 'in', filters.brands.slice(0, 10)));

  // Multiple arrays
  if (filters.sizes?.length > 0)
    constraints.push(where('sizes', 'array-contains-any', filters.sizes.slice(0, 10)));
  if (filters.notes?.length > 0)
    constraints.push(where('perfumeNotes', 'array-contains-any', filters.notes.slice(0, 10)));

  return constraints;
}

// 2. Fetch Page Data (Cursor Based)
const fetchProductsPage = async (filters, pageLimit, cursorId, direction) => {
  try {
    let q = collection(db, 'products');
    const constraints = buildConstraints(filters);

    // Sorting MUST be applied before pagination
    const sort = filters.sort || 'default';
    if (sort === 'price-asc') constraints.push(orderBy('minPrice', 'asc'));
    else if (sort === 'price-desc') constraints.push(orderBy('maxPrice', 'desc'));
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
    // { revalidate: 1, tags: ['products'] },
    { revalidate: 1, tags: ['products'] },
  )();

  // 2. Get Page Data (Cached by specific page/cursor params)
  // We include page number in key just to differentiate "First Page" requests,
  // but rely on cursorId for actual uniqueness for Next/Prev
  const products = await unstable_cache(
    async () => fetchProductsPage(filters, pageLimit, cursorId, direction),
    [`products-page-${filterKey}-${cursorId || 'start'}-${direction || 'first'}`],
    // { revalidate: 1, tags: ['products'] },
    { revalidate: 3601, tags: ['products'] },
  )();

  return {
    products,
    total,
    totalPages: Math.ceil(total / pageLimit) || 1,
    currentPage: Math.max(1, page),
  };
};
