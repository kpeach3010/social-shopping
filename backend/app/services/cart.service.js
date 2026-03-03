import { db } from "../db/client.js";
import {
  carts,
  cartItems,
  products,
  sizes,
  colors,
  productVariants,
} from "../db/schema.js";
import { sql, eq, and, ne, inArray } from "drizzle-orm";
import supabase from "../../services/supbase/client.js";

// Thêm variant vào giỏ
export const addToCartService = async (userId, variantId, quantity) => {
  // Tìm cart của user
  let [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (!cart) {
    [cart] = await db.insert(carts).values({ userId }).returning();
  }

  // Kiểm tra tồn tại của variant trong cart
  const [existingItem] = await db
    .select()
    .from(cartItems)
    .where(
      and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)),
    )
    .limit(1);

  if (existingItem) {
    const newQuantity = (existingItem.quantity ?? 0) + quantity;
    await db
      .update(cartItems)
      .set({ quantity: newQuantity })
      .where(eq(cartItems.id, existingItem.id))
      .returning();
  } else {
    await db.insert(cartItems).values({
      cartId: cart.id,
      variantId,
      quantity,
    });
  }

  const items = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      variantId: productVariants.id,
      sku: productVariants.stockKeepingUnit,
      price: productVariants.price,
      stock: productVariants.stock, // Thêm trường stock
      productName: products.name,
      color: colors.name,
      size: sizes.name,
    })
    .from(cartItems)
    .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .leftJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(colors, eq(productVariants.colorId, colors.id))
    .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
    .where(eq(cartItems.cartId, cart.id));

  return { cartId: cart.id, items };
};

// Xóa variant khỏi giỏ hàng
export const removeFromCartService = async (userId, variantId) => {
  // Tìm cart của user
  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (!cart) throw new Error("Cart not found");

  // Xóa variant trong cart
  const deleted = await db
    .delete(cartItems)
    .where(
      and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)),
    )
    .returning();

  if (deleted.length === 0) {
    throw new Error("Variant not found in cart");
  }

  return { message: "Variant removed successfully", deleted };
};

// Xóa nhiều variants khỏi giỏ hàng
export const removeMultipleFromCartService = async (userId, variantIds) => {
  // Tìm cart của user
  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (!cart) throw new Error("Cart not found");

  // Xóa nhiều variants trong cart
  const deleted = await db
    .delete(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cart.id),
        inArray(cartItems.variantId, variantIds),
      ),
    )
    .returning();

  return {
    message: `${deleted.length} variants removed successfully`,
    deleted,
    removedCount: deleted.length,
  };
};

// Tăng hoặc giảm variant trong cart
export const updateCartItemQuantityService = async (
  userId,
  variantId,
  action,
  targetQuantity = null, // Support direct quantity setting for optimistic updates
) => {
  // Lấy cart của user
  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (!cart) throw new Error("Cart not found");

  // Lấy item cần update
  const [item] = await db
    .select()
    .from(cartItems)
    .where(
      and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)),
    )
    .limit(1);

  if (!item) throw new Error("Item not found in cart");

  let newQuantity = item.quantity;

  // If targetQuantity is provided, use it directly (for optimistic updates)
  if (targetQuantity !== null && targetQuantity >= 0) {
    newQuantity = targetQuantity;

    // If target quantity is 0, remove the item
    if (newQuantity === 0) {
      return await removeFromCartService(userId, variantId);
    }
  } else {
    // Traditional increment/decrement logic
    if (action === "increase") {
      newQuantity = item.quantity + 1;
    } else if (action === "decrease") {
      newQuantity = item.quantity - 1;
      if (newQuantity <= 0) {
        // Nếu số lượng <= 0 thì xóa khỏi cart
        return await removeFromCartService(userId, variantId);
      }
    } else {
      throw new Error("Action must be 'increase' or 'decrease'");
    }
  }

  const [updated] = await db
    .update(cartItems)
    .set({ quantity: newQuantity })
    .where(eq(cartItems.id, item.id))
    .returning();

  return updated;
};

export const getCartItemsService = async (userId) => {
  // Lấy cart của user
  const [cart] = await db
    .select()
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  if (!cart) {
    return { cartId: null, items: [] };
  }

  // Lấy danh sách items trong cart
  const items = await db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
      variantId: productVariants.id,
      productId: products.id, // Thêm productId để navigate
      sku: productVariants.stockKeepingUnit,
      price: productVariants.price,
      stock: productVariants.stock, // Thêm trường stock
      productName: products.name,
      colorName: colors.name,
      sizeName: sizes.name,
      imagePath: colors.imagePath,
      imageUrl: colors.imageUrl,
    })
    .from(cartItems)
    .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .leftJoin(products, eq(productVariants.productId, products.id))
    .leftJoin(colors, eq(productVariants.colorId, colors.id))
    .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
    .where(eq(cartItems.cartId, cart.id));

  return { cartId: cart.id, items };
};
