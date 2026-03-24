import { db } from "../db/client.js";
import {
  categories,
  products,
  sizes,
  colors,
  productVariants,
  couponProducts,
  groupOrders,
} from "../db/schema.js";
import { sql, eq, and, ne, asc, desc, notInArray, inArray } from "drizzle-orm";
import supabase from "../../services/supbase/client.js";
import { notifyAffectedGroups } from "./groupOrders.service.js";

// Hàm upload ảnh lên bucket
async function uploadToBucket(
  fileBuffer,
  fileName,
  categoryPath,
  productId,
  isVariant = false,
) {
  const path = `categories/${categoryPath}/${productId}/${isVariant ? "variants/" : ""}${fileName}`;

  console.log(">>> Uploading to:", path);
  console.log(
    ">>> Buffer length:",
    fileBuffer?.length,
    "isBuffer:",
    Buffer.isBuffer(fileBuffer),
  );

  const { data, error } = await supabase.storage
    .from("product-images")
    .upload(path, fileBuffer, {
      upsert: true,
      contentType: "image/png",
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw error;
  }

  const { data: publicUrl } = supabase.storage
    .from("product-images")
    .getPublicUrl(path);

  return {
    path,
    url: publicUrl.publicUrl,
  };
}

// Hàm bỏ dấu tiếng Việt + bỏ khoảng trắng để tạo slug an toàn
function toSlug(str) {
  return str
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD") // tách dấu
    .replace(/[\u0300-\u036f]/g, "") // xóa dấu
    .replace(/\s+/g, "-") // thay khoảng trắng bằng "-"
    .replace(/[^a-z0-9\-]/g, "") // loại ký tự đặc biệt
    .replace(/-+/g, "-") // gộp nhiều dấu "-" liên tiếp
    .replace(/^-|-$/g, ""); // bỏ "-" ở đầu/cuối
}

// Hàm xây dựng đường dẫn category (nếu có parent)
async function buildCategoryPath(categoryId) {
  const category = await db
    .select()
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1);

  if (!category.length) {
    throw new Error("Category not found");
  }

  const current = category[0];
  const slug = await toSlug(current.name);

  if (current.parentId) {
    const parentPath = await buildCategoryPath(current.parentId);
    return `${parentPath}/${slug}`;
  }

  return slug;
}

// Hàm sinh tên sku COLOR-SIZE
export function generateSku(colorName, sizeName) {
  const colorPart = colorName ? colorName.trim().toUpperCase() : "NA";
  const sizePart = sizeName ? sizeName.trim().toUpperCase() : "NA";
  return `${colorPart}-${sizePart}`;
}

// Hàm đổi tên ảnh khi đổi tên màu của variant
export async function renameFileInBucket(oldPath, newPath) {
  // Move file trong bucket
  const { data, error } = await supabase.storage
    .from("product-images") // tên bucket
    .move(oldPath, newPath);

  if (error) {
    console.error("Error renaming file:", error.message);
    throw new Error("Failed to rename file in bucket");
  }

  // Lấy lại public URL
  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(newPath);

  return {
    path: newPath,
    url: publicUrlData.publicUrl,
  };
}

// Helper validate dữ liệu sản phẩm
function validateProductData(data) {
  // 1. Kiểm tra giá mặc định
  const priceDefault = Number(data.price_default || 0);
  if (priceDefault <= 50) {
    throw new Error("Giá của sản phẩm phải lớn hơn 50");
  }

  // 2. Kiểm tra các màu và biến thể
  if (Array.isArray(data.colors)) {
    data.colors.forEach((color) => {
      if (Array.isArray(color.sizes)) {
        color.sizes.forEach((size) => {
          // Kiểm tra giá biến thể (nếu có nhập)
          if (size.price !== undefined && size.price !== "" && size.price !== null) {
            const variantPrice = Number(size.price);
            if (variantPrice < 50) {
              throw new Error(`Giá của size "${size.sizeName}" phải lớn hơn 50`);
            }
          }
          // Kiểm tra tồn kho
          const stock = Number(size.stock || 0);
          if (stock < 0) {
            throw new Error(`Số lượng tồn kho của size "${size.sizeName}" không được âm.`);
          }
        });
      }
    });
  }
}

// Di chuyển file trong supabase
export async function moveAllFilesRecursive(bucket, oldPrefix, newPrefix) {
  const { data: items, error } = await supabase.storage
    .from(bucket)
    .list(oldPrefix, { limit: 100 });

  if (error) throw error;
  if (!items) return;

  for (const item of items) {
    if (item.metadata === null) {
      // folder
      await moveAllFilesRecursive(
        bucket,
        `${oldPrefix}${item.name}/`,
        `${newPrefix}${item.name}/`,
      );
    } else {
      // file
      const oldPath = `${oldPrefix}${item.name}`;
      const newPath = `${newPrefix}${item.name}`;
      await supabase.storage.from(bucket).move(oldPath, newPath);
      console.log(`Moved: ${oldPath} -> ${newPath}`);
    }
  }
}

// tạo sản phẩm mới, kèm upload ảnh, tạo variant, color, size
export const createProductService = async (data) => {
  // Validate trước khi làm bất cứ việc gì (bao gồm upload ảnh)
  validateProductData(data);

  try {
    // Kiểm tra thông tin cơ bản của sản phẩm
    if (!data.name || !data.name.trim()) {
      throw new Error("Tên sản phẩm không được để trống.");
    }
    if (!data.categoryId) {
      throw new Error("Danh mục sản phẩm không được để trống.");
    }
    if (!data.price_default || isNaN(Number(data.price_default))) {
      throw new Error("Giá sản phẩm không hợp lệ hoặc đang bị bỏ trống.");
    }
    if (!Array.isArray(data.colors) || data.colors.length === 0) {
      throw new Error("Sản phẩm bắt buộc phải có ít nhất một màu.");
    }
    // Kiểm tra chi tiết từng màu
    for (const [index, c] of data.colors.entries()) {
      // 1.1 Check tên màu
      if (!c.colorName || !c.colorName.trim()) {
        throw new Error(`Màu ở vị trí thứ ${index + 1} chưa có tên.`);
      }

      // 1.2 Check danh sách size của màu đó
      if (!Array.isArray(c.sizes) || c.sizes.length === 0) {
        throw new Error(
          `Màu "${c.colorName}" bắt buộc phải có ít nhất một kích cỡ (size).`,
        );
      }

      // 1.3 Check từng size (nếu cần kỹ hơn)
      for (const s of c.sizes) {
        if (!s.sizeName || !s.sizeName.trim()) {
          throw new Error(`Trong màu "${c.colorName}", có size chưa đặt tên.`);
        }
      }
    }

    data.variants = Array.isArray(data.variants) ? data.variants : [];

    // 1) Insert product
    const [product] = await db
      .insert(products)
      .values({
        categoryId: data.categoryId,
        name: data.name,
        description: data.description,
        price_default: data.price_default,
        stock: 0,
      })
      .returning();

    // Tạo categoryPath
    const categoryPath = await buildCategoryPath(data.categoryId);

    // Upload thumbnail (nếu có)
    let thumbnailPath = null;
    let thumbnailUrl = null;
    if (data.thumbnailFile) {
      const thumb = await uploadToBucket(
        data.thumbnailFile.buffer,
        "thumbnail.png",
        categoryPath,
        product.id,
      );
      thumbnailPath = thumb.path;
      thumbnailUrl = thumb.url;
    }

    // Upload ảnh mặt sau (nếu có)
    let backThumbnailPath = null;
    let backThumbnailUrl = null;
    if (data.backThumbnailFile) {
      const back = await uploadToBucket(
        data.backThumbnailFile.buffer,
        "back-thumbnail.png",
        categoryPath,
        product.id,
      );
      backThumbnailPath = back.path;
      backThumbnailUrl = back.url;
    }

    await db
      .update(products)
      .set({ thumbnailPath, thumbnailUrl, backThumbnailPath, backThumbnailUrl })
      .where(eq(products.id, product.id));
    // 2) Duyệt variants (colors + sizes)
    let totalStock = 0;
    for (const c of data.colors) {
      if (!c.colorName) throw new Error("Color phải có tên");

      // Xử lý color
      const colorSlug = toSlug(c.colorName);
      const colorNameUpper = c.colorName.trim().toUpperCase();

      let [color] = await db
        .select()
        .from(colors)
        .where(
          and(
            eq(colors.productId, product.id),
            eq(colors.name, colorNameUpper),
          ),
        )
        .limit(1);

      if (!color) {
        let imagePath = null;
        let imageUrl = null;
        if (c.file && c.file.buffer) {
          const uploaded = await uploadToBucket(
            c.file.buffer,
            `${toSlug(c.colorName)}.png`,
            categoryPath,
            product.id,
            true,
          );
          imagePath = uploaded.path;
          imageUrl = uploaded.url;
        }

        [color] = await db
          .insert(colors)
          .values({
            productId: product.id,
            name: colorNameUpper,
            imagePath,
            imageUrl,
          })
          .returning();
      }

      const colorId = color.id;

      // Duyệt sizes trong color
      for (const s of c.sizes) {
        if (!s.sizeName) throw new Error("Size phải có tên");

        const sizeNameUpper = s.sizeName.trim().toUpperCase();
        let [size] = await db
          .select()
          .from(sizes)
          .where(
            and(eq(sizes.productId, product.id), eq(sizes.name, sizeNameUpper)),
          )
          .limit(1);

        if (!size) {
          [size] = await db
            .insert(sizes)
            .values({ productId: product.id, name: sizeNameUpper })
            .returning();
        }

        const sizeId = size.id;

        // Insert variant
        await db.insert(productVariants).values({
          productId: product.id,
          colorId,
          sizeId,
          stockKeepingUnit: generateSku(c.colorName, s.sizeName),
          stock: Number(s.stock) || 0,
          price: Number(s.price) || Number(data.price_default),
        });

        totalStock += Number(s.stock) ?? 0;
      }
    }

    // 3) Update stock tổng
    await db
      .update(products)
      .set({ stock: totalStock })
      .where(eq(products.id, product.id));

    // 4) Nếu có coupon
    if (data.couponId) {
      await db.insert(couponProducts).values({
        couponId: data.couponId,
        productId: product.id,
      });
    }

    // Query lại kết quả
    const [updatedProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, product.id));

    const variants = await db
      .select({
        id: productVariants.id,
        sku: productVariants.stockKeepingUnit,
        stock: productVariants.stock,
        price: productVariants.price,
        colorName: colors.name,
        sizeName: sizes.name,
        imageUrl: colors.imageUrl,
        imagePath: colors.imagePath,
      })
      .from(productVariants)
      .leftJoin(colors, eq(productVariants.colorId, colors.id))
      .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
      .where(eq(productVariants.productId, product.id));

    return {
      product: updatedProduct,
      variants,
    };
  } catch (error) {
    console.error("Error creating product:", error);
    throw error;
  }
};

export const getAllProductService = async () => {
  try {
    const allProduct = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price_default,
        thumbnailUrl: products.thumbnailUrl,
        stock: products.stock,
      })
      .from(products);
    return allProduct;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw new Error("Failed to fetch products");
  }
};

// lay chi tiet san pham
export const getProductByIdService = async (productId) => {
  try {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) throw new Error("Product not found");

    const variants = await db
      .select({
        id: productVariants.id,
        sku: productVariants.stockKeepingUnit,
        stock: productVariants.stock,
        price: productVariants.price,
        imagePath: colors.imagePath,
        imageUrl: colors.imageUrl,
        color: colors.name,
        colorId: colors.id,   // ← thêm colorId để FE dùng khi edit
        size: sizes.name,
      })
      .from(productVariants)
      .leftJoin(colors, eq(productVariants.colorId, colors.id))
      .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
      .where(eq(productVariants.productId, productId));

    return {
      ...product,
      variants,
    };
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    throw new Error("Failed to fetch product");
  }
};

// xóa 1 product
// Hàm đệ quy xóa folder và subfolder
async function deleteFolderRecursively(bucket, prefix) {
  // List tất cả trong folder
  const { data: items, error } = await supabase.storage
    .from(bucket)
    .list(prefix, { limit: 100 });

  if (error) {
    console.error("Error listing folder:", error);
    return;
  }

  if (!items || items.length === 0) return;

  // Gom danh sách file cần xóa
  const filePaths = [];

  for (const item of items) {
    if (item.id) {
      // file
      filePaths.push(`${prefix}${item.name}`);
    } else if (item.name && item.metadata === null) {
      // subfolder (Supabase list subfolder kiểu { name: "variants", id: null })
      await deleteFolderRecursively(bucket, `${prefix}${item.name}/`);
    }
  }

  // Xóa file trong folder hiện tại
  if (filePaths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(filePaths);

    if (removeError) {
      console.error("Error removing files:", removeError);
    }
  }
}

export const deleteVariantService = async (variantId) => {
  try {
    // 1) Lấy variant + productId để biết categoryPath
    const [variant] = await db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        colorId: productVariants.colorId,
        sizeId: productVariants.sizeId,
      })
      .from(productVariants)
      .where(eq(productVariants.id, variantId))
      .limit(1);

    if (!variant) throw new Error("Variant not found");

    // 1.1) Kiểm tra xem có nhóm mua chung nào đang hoạt động cho sản phẩm của variant này không
    const activeGroups = await db
      .select({ productName: products.name })
      .from(groupOrders)
      .innerJoin(products, eq(groupOrders.productId, products.id))
      .where(
        and(
          eq(groupOrders.productId, variant.productId),
          inArray(groupOrders.status, [
            "pending",
            "locked",
            "ordering",
            "awaiting_payment",
          ]),
        ),
      );

    if (activeGroups.length > 0) {
      throw new Error(
        `Không thể xóa kích cỡ/màu sắc này vì sản phẩm "${activeGroups[0].productName}" đang có nhóm mua chung đang hoạt động.`,
      );
    }

    // 2) Lấy product để build đường dẫn storage
    const [product] = await db
      .select({ categoryId: products.categoryId })
      .from(products)
      .where(eq(products.id, variant.productId))
      .limit(1);

    if (!product) throw new Error("Parent product not found");

    // 3) Lấy tên màu (colorName) để xác định file ảnh
    let colorName = "VARIANT";
    if (variant.colorId) {
      const [colorRow] = await db
        .select({ name: colors.name })
        .from(colors)
        .where(eq(colors.id, variant.colorId))
        .limit(1);
      if (colorRow) colorName = colorRow.name;
    }

    // 4) Kiểm tra còn variant nào khác cùng màu không
    let stillHasOtherVariants = false;
    if (variant.colorId) {
      const otherVariants = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.productId, variant.productId),
            eq(productVariants.colorId, variant.colorId),
            ne(productVariants.id, variant.id), // khác variant đang xóa
          ),
        );

      stillHasOtherVariants = otherVariants.length > 0;
    }

    // 5) Nếu đây là variant cuối cùng của màu đó → xóa ảnh trong storage
    if (variant.colorId && !stillHasOtherVariants) {
      const categoryPath = await buildCategoryPath(product.categoryId);

      const filePath = `categories/${categoryPath}/${variant.productId}/variants/${colorName.toUpperCase()}.png`;

      const { error: removeError } = await supabase.storage
        .from("product-images")
        .remove([filePath]);

      if (removeError) {
        console.error("Error removing variant image:", removeError);
      }

      // clear ảnh trong bảng colors để đồng bộ
      await db
        .update(colors)
        .set({ imagePath: null, imageUrl: null })
        .where(eq(colors.id, variant.colorId));
    }

    // 6) Xóa variant trong DB
    await db.delete(productVariants).where(eq(productVariants.id, variantId));

    return { message: "Variant deleted successfully" };
  } catch (error) {
    console.error("Error deleting variant:", error);
    throw error;
  }
};

export const deleteProductService = async (productIds) => {
  try {
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    if (ids.length === 0) return { message: "No products to delete" };

    // 1) Kiểm tra xem có nhóm mua chung nào đang hoạt động cho các sản phẩm này không
    const activeGroups = await db
      .select({
        productId: groupOrders.productId,
        productName: products.name,
      })
      .from(groupOrders)
      .innerJoin(products, eq(groupOrders.productId, products.id))
      .where(
        and(
          inArray(groupOrders.productId, ids),
          inArray(groupOrders.status, [
            "pending",
            "locked",
            "ordering",
            "awaiting_payment",
          ]),
        ),
      );

    if (activeGroups.length > 0) {
      const problematicProducts = [
        ...new Set(activeGroups.map((g) => g.productName)),
      ];
      throw new Error(
        `Không thể xóa sản phẩm: "${problematicProducts.join(", ")}" vì đang có nhóm mua chung đang hoạt động.`,
      );
    }

    for (const productId of ids) {
      // 1) Lấy sản phẩm để biết categoryPath
      const [product] = await db
        .select({
          id: products.id,
          categoryId: products.categoryId,
        })
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) continue;

      // 2) Tính path folder
      const categoryPath = await buildCategoryPath(product.categoryId);
      const folderPrefix = `categories/${categoryPath}/${product.id}/`;

      // 3) Xóa toàn bộ file trong folder productId (đệ quy)
      await deleteFolderRecursively("product-images", folderPrefix);

      // 4) Xóa bản ghi DB
      await db.delete(products).where(eq(products.id, productId));
    }
    return {
      message: `Deleted ${ids.length} product(s) and all their files successfully`,
    };
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error; // Ném nguyên error để controller xử lý message
  }
};

// Cập nhật sản phẩm
// ==========================
// UPDATE PRODUCT (đồng bộ với CREATE)
// ==========================
// update sản phẩm
export const updateProductService = async (productId, data) => {
  // Validate trước khi xử lý (rename file, upload...)
  validateProductData(data);

  try {
    return await db.transaction(async (tx) => {
      // 1) Lấy product cũ
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (!product) throw new Error("Product not found");

      const oldCategoryId = product.categoryId;
      const currentCategoryId = data.categoryId || oldCategoryId; // ID category cuối cùng

      // 2) Payload update thông tin cơ bản
      const payload = {
        name: data.name ?? product.name,
        description: data.description ?? product.description,
        price_default: data.price_default ?? product.price_default,
        updatedAt: new Date(),
      };

      // 3) Xử lý đổi danh mục (Category) -> Move toàn bộ folder ảnh
      // Bước này chạy TRƯỚC khi xử lý từng màu để đảm bảo file nằm đúng chỗ
      if (data.categoryId && data.categoryId !== oldCategoryId) {
        const oldCategoryPath = await buildCategoryPath(oldCategoryId);
        const newCategoryPath = await buildCategoryPath(data.categoryId);

        console.log(
          `>>> Moving Category: ${oldCategoryPath} -> ${newCategoryPath}`,
        );

        // 3.a Move folder vật lý
        await moveAllFilesRecursive(
          "product-images",
          `categories/${oldCategoryPath}/${productId}/`,
          `categories/${newCategoryPath}/${productId}/`,
        );

        // 3.b Cập nhật DB cho tất cả các màu (để lát nữa query lấy được path đúng)
        const allColors = await tx
          .select()
          .from(colors)
          .where(eq(colors.productId, productId));

        for (const clr of allColors) {
          if (!clr.imagePath) continue;

          // Lấy tên file gốc (giữ nguyên tên file, chỉ đổi folder cha)
          const fileName = clr.imagePath.split("/").pop();
          const newPath = `categories/${newCategoryPath}/${productId}/variants/${fileName}`;

          const { data: urlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(newPath);

          await tx
            .update(colors)
            .set({ imagePath: newPath, imageUrl: urlData?.publicUrl })
            .where(eq(colors.id, clr.id));
        }

        // 3.c Update Thumbnail Path
        if (product.thumbnailPath) {
          const fileName = product.thumbnailPath.split("/").pop();
          const newPath = `categories/${newCategoryPath}/${productId}/${fileName}`;
          const { data: publicUrl } = supabase.storage
            .from("product-images")
            .getPublicUrl(newPath);
          payload.thumbnailPath = newPath;
          payload.thumbnailUrl = publicUrl.publicUrl;
        }

        // 3.d Update Back Thumbnail Path
        if (product.backThumbnailPath) {
          const fileName = product.backThumbnailPath.split("/").pop();
          const newPath = `categories/${newCategoryPath}/${productId}/${fileName}`;
          const { data: publicUrl } = supabase.storage
            .from("product-images")
            .getPublicUrl(newPath);
          payload.backThumbnailPath = newPath;
          payload.backThumbnailUrl = publicUrl.publicUrl;
        }

        payload.categoryId = data.categoryId;
      }

      // 4) Upload thumbnail mới (nếu có)
      if (data.thumbnailFile) {
        const catPath = await buildCategoryPath(currentCategoryId);
        const fileName = `thumbnail.png`;

        const uploaded = await uploadToBucket(
          data.thumbnailFile.buffer,
          fileName,
          catPath,
          productId,
        );

        payload.thumbnailPath = uploaded.path;
        payload.thumbnailUrl = uploaded.url;
      }

      // 4b) Upload ảnh mặt sau mới (nếu có)
      if (data.backThumbnailFile) {
        const catPath = await buildCategoryPath(currentCategoryId);
        const uploaded = await uploadToBucket(
          data.backThumbnailFile.buffer,
          "back-thumbnail.png",
          catPath,
          productId,
        );
        payload.backThumbnailPath = uploaded.path;
        payload.backThumbnailUrl = uploaded.url;
      }

      // 4c) Xóa ảnh mặt sau (nếu FE gửi flag removeBackThumbnail)
      if (
        data.removeBackThumbnail === "true" ||
        data.removeBackThumbnail === true
      ) {
        if (product.backThumbnailPath) {
          await supabase.storage
            .from("product-images")
            .remove([product.backThumbnailPath]);
        }
        payload.backThumbnailPath = null;
        payload.backThumbnailUrl = null;
      }

      // 4d) Xóa thumbnail (nếu FE gửi flag removeThumbnail)
      if (
        data.removeThumbnail === "true" ||
        data.removeThumbnail === true
      ) {
        if (product.thumbnailPath) {
          await supabase.storage
            .from("product-images")
            .remove([product.thumbnailPath]);
        }
        payload.thumbnailPath = null;
        payload.thumbnailUrl = null;
      }

      // 5) Update Product info
      await tx.update(products).set(payload).where(eq(products.id, productId));

      // 6) Xử lý COLORS
      if (Array.isArray(data.colors)) {
        // === OPTIMIZATION: Tính catPath 1 lần, không tính lại trong loop ===
        const catPath = await buildCategoryPath(currentCategoryId);

        // === OPTIMIZATION: Pre-fetch tất cả sizes của product 1 lần ===
        const existingSizes = await tx
          .select()
          .from(sizes)
          .where(eq(sizes.productId, productId));
        const sizeMap = new Map(existingSizes.map((s) => [s.name, s]));

        // Hàm xử lý 1 màu (để có thể gọi song song)
        const processColor = async (c) => {
          const colorId = c.id || c.colorId;
          const colorNameUpper = c.colorName?.trim().toUpperCase();

          let savedColorId;

          if (colorId) {
            // ============================================
            // UPDATE EXISTING COLOR
            // ============================================
            const [oldColor] = await tx
              .select()
              .from(colors)
              .where(eq(colors.id, colorId))
              .limit(1);
            if (!oldColor) return;

            const updateData = { name: colorNameUpper };

            const isNameChanged = oldColor.name !== colorNameUpper;
            const hasNewFile = c.file && c.file.buffer;

            if (isNameChanged && !hasNewFile && oldColor.imagePath) {
              console.log(
                `>>> Renaming color image: ${oldColor.name} -> ${colorNameUpper}`,
              );
              const ext = oldColor.imagePath.split(".").pop();
              const newFileName = `${toSlug(c.colorName)}.${ext}`;
              const newPath = `categories/${catPath}/${productId}/variants/${newFileName}`;
              try {
                if (oldColor.imagePath !== newPath) {
                  const renamed = await renameFileInBucket(
                    oldColor.imagePath,
                    newPath,
                  );
                  updateData.imagePath = renamed.path;
                  updateData.imageUrl = renamed.url;
                }
              } catch (err) {
                console.error("Rename failed, keeping old filename:", err.message);
              }
            }

            if (hasNewFile) {
              const fileName = `${toSlug(c.colorName)}.png`;
              const uploaded = await uploadToBucket(
                c.file.buffer,
                fileName,
                catPath,
                productId,
                true,
              );
              updateData.imagePath = uploaded.path;
              updateData.imageUrl = uploaded.url;
            } else if (
              (c.removeColorImage === "true" || c.removeColorImage === true) &&
              oldColor.imagePath
            ) {
              await supabase.storage
                .from("product-images")
                .remove([oldColor.imagePath]);
              updateData.imagePath = null;
              updateData.imageUrl = null;
            }

            await tx.update(colors).set(updateData).where(eq(colors.id, colorId));
            savedColorId = colorId;
          } else {
            // ============================================
            // CREATE NEW COLOR
            // ============================================
            let imagePath = null;
            let imageUrl = null;

            if (c.file && c.file.buffer) {
              const fileName = `${toSlug(c.colorName)}.png`;
              const uploaded = await uploadToBucket(
                c.file.buffer,
                fileName,
                catPath,
                productId,
                true,
              );
              imagePath = uploaded.path;
              imageUrl = uploaded.url;
            }

            const [newColor] = await tx
              .insert(colors)
              .values({ productId, name: colorNameUpper, imagePath, imageUrl })
              .returning({ id: colors.id });

            savedColorId = newColor.id;
          }

          // ============================================
          // VARIANTS / SIZES (Upsert Logic)
          // ============================================
          if (Array.isArray(c.sizes)) {
            for (const s of c.sizes) {
              const sizeNameUpper = s.sizeName?.trim().toUpperCase();

              // === OPTIMIZATION: Lookup từ Map thay vì query DB mỗi size ===
              let sizeMaster = sizeMap.get(sizeNameUpper);
              if (!sizeMaster) {
                [sizeMaster] = await tx
                  .insert(sizes)
                  .values({ productId, name: sizeNameUpper })
                  .returning();
                sizeMap.set(sizeNameUpper, sizeMaster); // cache lại để size sau dùng
              }

              const sku = generateSku(c.colorName, s.sizeName);
              const variantId = s.id;

              if (variantId) {
                await tx
                  .update(productVariants)
                  .set({
                    price: Number(s.price),
                    stock: Number(s.stock),
                    sizeId: sizeMaster.id,
                    colorId: savedColorId,
                    stockKeepingUnit: sku,
                  })
                  .where(eq(productVariants.id, variantId));
              } else {
                await tx.insert(productVariants).values({
                  productId,
                  colorId: savedColorId,
                  sizeId: sizeMaster.id,
                  price: Number(s.price) || Number(data.price_default),
                  stock: Number(s.stock),
                  stockKeepingUnit: sku,
                });
              }
            }
          }
        };

        // === OPTIMIZATION: Chạy song song các màu đã tồn tại (UPDATE),
        //     các màu mới (INSERT) vẫn tuần tự để tránh xung đột ===
        const existingColors = data.colors.filter((c) => c.id || c.colorId);
        const newColors = data.colors.filter((c) => !c.id && !c.colorId);

        await Promise.all(existingColors.map(processColor));
        for (const c of newColors) {
          await processColor(c);
        }
      }

      // 7) Tính lại tổng stock
      const [stockResult] = await tx
        .select({ total: sql`sum(${productVariants.stock})` })
        .from(productVariants)
        .where(eq(productVariants.productId, productId));

      const realTotalStock = Number(stockResult?.total || 0);

      await tx
        .update(products)
        .set({ stock: realTotalStock })
        .where(eq(products.id, productId));

      // Plan V11: Trigger thông báo cho các nhóm bị ảnh hưởng (Hàng về)
      // Không await để không làm chậm response trả về cho staff
      notifyAffectedGroups(productId, true).catch(err => 
        console.error("Error in notifyAffectedGroups trigger (Staff Update):", err)
      );

      return { success: true, productId };
    });
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

// Xóa 1 màu (color) và toàn bộ variants liên quan
export const deleteColorService = async (colorId) => {
  try {
    // 1) Lấy thông tin color
    const [color] = await db
      .select()
      .from(colors)
      .where(eq(colors.id, colorId))
      .limit(1);
    if (!color) throw new Error("Color not found");

    // 1.1) Kiểm tra nhóm mua chung đang hoạt động cho sản phẩm này
    const activeGroups = await db
      .select({ productName: products.name })
      .from(groupOrders)
      .innerJoin(products, eq(groupOrders.productId, products.id))
      .where(
        and(
          eq(groupOrders.productId, color.productId),
          inArray(groupOrders.status, [
            "pending",
            "locked",
            "ordering",
            "awaiting_payment",
          ]),
        ),
      );

    if (activeGroups.length > 0) {
      throw new Error(
        `Không thể xóa màu sắc này vì sản phẩm "${activeGroups[0].productName}" đang có nhóm mua chung đang hoạt động.`,
      );
    }
    // 2) Lấy danh sách variants thuộc màu này
    const variants = await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.colorId, colorId));
    // 3) Xóa từng variant
    for (const v of variants) {
      await db.delete(productVariants).where(eq(productVariants.id, v.id));
    }
    // 4) Xóa ảnh màu trong storage nếu có
    if (color.imagePath) {
      await supabase.storage.from("product-images").remove([color.imagePath]);
    }
    // 5) Xóa bản ghi color khỏi DB
    await db.delete(colors).where(eq(colors.id, colorId));
    return { message: `Deleted color ${colorId} and all related variants.` };
  } catch (error) {
    console.error("Error deleting color:", error);
    throw error;
  }
};

// Tìm kiếm sản phẩm theo tên (không phân biệt hoa thường, có dấu hoặc không)
export const searchProductByNameService = async (keyword) => {
  if (!keyword || typeof keyword !== "string" || !keyword.trim()) return [];
  const search = `%${keyword.trim().toLowerCase()}%`;
  try {
    const results = await db
      .select({
        id: products.id,
        name: products.name,
        price: products.price_default,
        thumbnailUrl: products.thumbnailUrl,
        stock: products.stock,
      })
      .from(products)
      .where(sql`lower(${products.name}) LIKE ${search}`);
    return results;
  } catch (error) {
    console.error("Error searching products:", error);
    throw new Error("Failed to search products");
  }
};

export const getProductsByPriceService = async ({ sort = "asc" }) => {
  try {
    const orderBy =
      sort === "desc"
        ? desc(products.price_default)
        : asc(products.price_default);

    const data = await db.select().from(products).orderBy(orderBy);

    return data;
  } catch (error) {
    console.error("getProductsByPriceService error:", error);
    throw error;
  }
};
