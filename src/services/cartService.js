import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

// Helper to get fresh data for multiple cart items
export async function validateCartItems(cartItems) {
  if (!cartItems || cartItems.length === 0) return [];

  // Group by product ID to minimize fetches
  const productIds = [...new Set(cartItems.map((item) => item.productId))];
  const updates = [];

  try {
    // Fetch all relevant products
    // Note: For large carts, we might need chunks, but for standard usage Promise.all is fine
    const productDocs = await Promise.all(productIds.map((id) => getDoc(doc(db, 'products', id))));

    const productMap = {};
    productDocs.forEach((d) => {
      if (d.exists()) {
        productMap[d.id] = { id: d.id, ...d.data() };
      }
    });

    // Iterate cart items and validate against fresh data
    for (const item of cartItems) {
      const product = productMap[item.productId];

      if (!product) {
        // Product deleted or not found
        updates.push({
          productId: item.productId,
          variantId: item.variantId,
          isAvailable: false,
          stock: 0,
          inStock: false,
          error: 'Product no longer exists',
        });
        continue;
      }

      // Resolve Variant
      let variant = null;
      if (product.variants && product.variants.length > 0) {
        variant = product.variants.find((v) => v.id === item.variantId);
        // If variant not found (maybe deleted?), try default or mark unavailable
        if (!variant && item.variantId !== 'default') {
          // Variant specifically requested but gone
          updates.push({
            productId: item.productId,
            variantId: item.variantId,
            isAvailable: false,
            stock: 0,
            inStock: false,
            error: 'Variant unavailable',
          });
          continue;
        } else if (!variant && item.variantId === 'default') {
          // Fallback to first variant if default requested
          variant = product.variants[0];
        }
      }

      // Determine fresh values
      // If no variants, use product root fields
      const source = variant || product;

      const freshPrice = source.price || product.price || 0;
      const freshDiscount = source.discount || product.discount || 0;
      const freshInStock = source.inStock !== undefined ? source.inStock : product.inStock || false;
      const freshStock = source.stock !== undefined ? source.stock : product.stock || 0; // fallback if needed, but we rely on inStock

      // Updates needed?
      updates.push({
        productId: item.productId,
        variantId: item.variantId,
        price: freshPrice,
        discount: freshDiscount,
        stock: freshStock,
        inStock: freshInStock,
        // Simple logic: Available if inStock is true
        isAvailable: freshInStock === true,
        // Also refresh metadata just in case
        name: product.name,
        image: source.image || product.mainImage || '',
        slug: product.slug || product.id,
      });
    }

    return updates;
  } catch (error) {
    console.error('Error validating cart:', error);
    return [];
  }
}
