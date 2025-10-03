import { db } from "../db/client.js";
import {
  categories,
  products,
  sizes,
  colors,
  productVariants,
  couponProducts,
  coupons,
} from "../db/schema.js";
import { sql, eq, and, ne } from "drizzle-orm";
import supabase from "../../services/supbase/client.js";

// Hàm upload ảnh lên bucket
async function uploadToBucket(
  fileBuffer,
  fileName,
  categoryPath,
  productId,
  isVariant = false
) {
  const path = `categories/${categoryPath}/${productId}/${isVariant ? "variants/" : ""}${fileName}`;

  console.log(">>> Uploading to:", path);
  console.log(
    ">>> Buffer length:",
    fileBuffer?.length,
    "isBuffer:",
    Buffer.isBuffer(fileBuffer)
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
        `${newPrefix}${item.name}/`
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
  try {
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
        product.id
      );
      thumbnailPath = thumb.path;
      thumbnailUrl = thumb.url;
    }

    await db
      .update(products)
      .set({ thumbnailPath, thumbnailUrl })
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
          and(eq(colors.productId, product.id), eq(colors.name, colorNameUpper))
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
            true
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
            and(eq(sizes.productId, product.id), eq(sizes.name, sizeNameUpper))
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

    if (!product) {
      throw new Error("Product not found");
    }

    // Lay danh sach variant
    const variants = await db
      .select({
        id: productVariants.id,
        sku: productVariants.stockKeepingUnit,
        stock: productVariants.stock,
        price: productVariants.price,
        imagePath: colors.imagePath,
        imageUrl: colors.imageUrl,
        color: colors.name,
        size: sizes.name,
      })
      .from(productVariants)
      .leftJoin(colors, eq(productVariants.colorId, colors.id))
      .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
      .where(eq(productVariants.productId, productId));

    // lay coupon (neu co)
    const couponsList = await db
      .select({
        id: coupons.id,
        code: coupons.code,
        description: coupons.description,
        value: coupons.value,
      })
      .from(couponProducts)
      .leftJoin(coupons, eq(couponProducts.couponId, coupons.id))
      .where(eq(couponProducts.productId, productId));

    // Lấy danh sách màu (unique) của sản phẩm
    const colorsList = await db
      .select({
        id: colors.id,
        name: colors.name,
        imageUrl: colors.imageUrl,
        imagePath: colors.imagePath,
      })
      .from(colors)
      .where(eq(colors.productId, productId));

    return {
      ...product,
      variants,
      coupons: couponsList.filter((c) => c.id !== null),
      colors: colorsList,
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
            ne(productVariants.id, variant.id) // khác variant đang xóa
          )
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
    throw new Error("Failed to delete variant");
  }
};

export const deleteProductService = async (productIds) => {
  try {
    // Hỗ trợ truyền 1 id hoặc mảng id
    const ids = Array.isArray(productIds) ? productIds : [productIds];
    for (const productId of ids) {
      // 1) Lấy product để biết categoryPath
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
    throw new Error("Failed to delete product(s)");
  }
};

// Cập nhật sản phẩm
export const updateProductService = async (productId, data) => {
  try {
    // 1) Lấy product (chỉ định fields rõ ràng)
    const [product] = await db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        name: products.name,
        description: products.description,
        price_default: products.price_default,
        stock: products.stock,
        thumbnailPath: products.thumbnailPath,
        thumbnailUrl: products.thumbnailUrl,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (!product) throw new Error("Product not found");

    // 2) Update product base fields
    const payload = {
      name: data.name ?? product.name,
      description: data.description ?? product.description,
      price_default: data.price_default ?? product.price_default,
    };

    if (data.categoryId && data.categoryId != product.categoryId) {
      const oldCategoryPath = await buildCategoryPath(product.categoryId);
      const newCategoryPath = await buildCategoryPath(data.categoryId);

      await moveAllFilesRecursive(
        "product-images",
        `categories/${oldCategoryPath}/${product.id}/`,
        `categories/${newCategoryPath}/${product.id}/`
      );
      payload.categoryId = data.categoryId;
      if (product.thumbnailPath) {
        const fileName = product.thumbnailPath.split("/").pop(); // lấy "thumbnail.png"
        const newPath = `categories/${newCategoryPath}/${product.id}/${fileName}`;

        payload.thumbnailPath = newPath;

        const { data: publicUrl } = supabase.storage
          .from("product-images")
          .getPublicUrl(newPath);

        payload.thumbnailUrl = publicUrl.publicUrl;
      }
    }
    if (data.thumbnail) {
      // Thumbnail (nếu có)
      const categoryPath = await buildCategoryPath(product.categoryId);
      const uploaded = await uploadToBucket(
        data.thumbnail.buffer,
        "thumbnail.png",
        categoryPath,
        productId
      );
      payload.thumbnailPath = uploaded.path;
      payload.thumbnailUrl = uploaded.url;
    }

    await db.update(products).set(payload).where(eq(products.id, productId));

    // 3) Variants
    if (Array.isArray(data.variants)) {
      for (const v of data.variants) {
        if (!v) continue;

        // ----- Color -----
        let colorId = null;
        let colorNameUpper = null;
        if (v.colorName) {
          colorNameUpper = v.colorName.trim().toUpperCase();
          const [existingColor] = await db
            .select({ id: colors.id, name: colors.name })
            .from(colors)
            .where(
              and(
                eq(colors.productId, productId),
                eq(colors.name, colorNameUpper)
              )
            )
            .limit(1);

          if (existingColor) {
            colorId = existingColor.id;
          } else {
            const [newColor] = await db
              .insert(colors)
              .values({ productId, name: colorNameUpper })
              .returning({ id: colors.id, name: colors.name });
            colorId = newColor.id;
          }
        }

        // ----- Size -----
        let sizeId = null;
        let sizeNameUpper = null;
        if (v.sizeName) {
          sizeNameUpper = v.sizeName.trim().toUpperCase();
          const [existingSize] = await db
            .select({ id: sizes.id, name: sizes.name })
            .from(sizes)
            .where(
              and(eq(sizes.productId, productId), eq(sizes.name, sizeNameUpper))
            )
            .limit(1);

          if (existingSize) {
            sizeId = existingSize.id;
          } else {
            const [newSize] = await db
              .insert(sizes)
              .values({ productId, name: sizeNameUpper })
              .returning({ id: sizes.id, name: sizes.name });
            sizeId = newSize.id;
          }
        }

        // ================== UPDATE ==================
        if (v.id && v.id.trim() !== "") {
          // Lấy variant cũ (chỉ định fields)
          const [oldVariant] = await db
            .select({
              id: productVariants.id,
              stock: productVariants.stock,
              price: productVariants.price,
              colorId: productVariants.colorId,
              sizeId: productVariants.sizeId,
            })
            .from(productVariants)
            .where(eq(productVariants.id, v.id))
            .limit(1);

          if (!oldVariant) throw new Error("Variant not found");

          console.log("oldVariant:", oldVariant);

          const finalColorId = colorId ?? oldVariant.colorId;
          const finalSizeId = sizeId ?? oldVariant.sizeId;

          // Lấy thông tin màu (cả name và image)
          let finalColorName = null;
          let newImagePath = null;
          let newImageUrl = null;

          if (finalColorId) {
            const [colorRow] = await db
              .select({
                name: colors.name,
                imagePath: colors.imagePath,
                imageUrl: colors.imageUrl,
              })
              .from(colors)
              .where(eq(colors.id, finalColorId))
              .limit(1);

            finalColorName = colorRow?.name || "VARIANT";
            newImagePath = colorRow?.imagePath;
            newImageUrl = colorRow?.imageUrl;

            // Nếu có file upload mới → update bảng colors
            if (v.file && v.file.buffer) {
              const categoryPath = await buildCategoryPath(product.categoryId);
              const uploaded = await uploadToBucket(
                v.file.buffer,
                `${toSlug(finalColorName)}.png`,
                categoryPath,
                productId,
                true
              );

              newImagePath = uploaded.path;
              newImageUrl = uploaded.url;

              // Cập nhật bảng colors
              await db
                .update(colors)
                .set({
                  imagePath: newImagePath,
                  imageUrl: newImageUrl,
                })
                .where(eq(colors.id, finalColorId));
            }
          }

          // Lấy tên size
          let finalSizeName = null;
          if (finalSizeId) {
            const [sizeRow] = await db
              .select({ name: sizes.name })
              .from(sizes)
              .where(eq(sizes.id, finalSizeId))
              .limit(1);

            finalSizeName = sizeRow?.name;
          }

          await db
            .update(productVariants)
            .set({
              stock: v.stock ?? oldVariant.stock,
              price: v.price ?? oldVariant.price,
              colorId: finalColorId,
              sizeId: finalSizeId,
              stockKeepingUnit: generateSku(finalColorName, finalSizeName),
            })
            .where(eq(productVariants.id, v.id));
        }

        // ================== INSERT / UPSERT ==================
        else {
          // Để insert/upsert, bắt buộc phải có colorName + sizeName
          if (!colorNameUpper || !sizeNameUpper) {
            throw new Error(
              "Khi tạo variant mới bắt buộc phải có cả colorName và sizeName"
            );
          }

          // Kiểm tra tồn tại (productId + colorId + sizeId)
          const [existingVariant] = await db
            .select({
              id: productVariants.id,
              stock: productVariants.stock,
              price: productVariants.price,
              colorId: productVariants.colorId,
              sizeId: productVariants.sizeId,
            })
            .from(productVariants)
            .where(
              and(
                eq(productVariants.productId, productId),
                eq(productVariants.colorId, colorId),
                eq(productVariants.sizeId, sizeId)
              )
            )
            .limit(1);

          if (existingVariant) {
            // Nếu client không truyền thì dùng lại colorId/sizeId cũ
            const finalColorId = colorId ?? existingVariant.colorId;
            const finalSizeId = sizeId ?? existingVariant.sizeId;

            // Lấy tên từ DB để sinh SKU
            const [colorRow] = await db
              .select({ name: colors.name })
              .from(colors)
              .where(eq(colors.id, finalColorId))
              .limit(1);

            const [sizeRow] = await db
              .select({ name: sizes.name })
              .from(sizes)
              .where(eq(sizes.id, finalSizeId))
              .limit(1);

            const finalColorName = colorRow?.name;
            const finalSizeName = sizeRow?.name;

            // Nếu có file upload → update ảnh trong bảng colors
            if (v.file && v.file.buffer) {
              const categoryPath = await buildCategoryPath(product.categoryId);
              const uploaded = await uploadToBucket(
                v.file.buffer,
                `${finalColorName}.png`,
                categoryPath,
                productId,
                true
              );

              await db
                .update(colors)
                .set({
                  imagePath: uploaded.path,
                  imageUrl: uploaded.url,
                })
                .where(eq(colors.id, finalColorId));
            }

            await db
              .update(productVariants)
              .set({
                stock: v.stock ?? existingVariant.stock,
                price: v.price ?? existingVariant.price,
                stockKeepingUnit: generateSku(finalColorName, finalSizeName),
              })
              .where(eq(productVariants.id, existingVariant.id));
          } else {
            // Nếu có file upload → update ảnh trong bảng colors
            if (v.file && v.file.buffer) {
              const categoryPath = await buildCategoryPath(product.categoryId);
              const uploaded = await uploadToBucket(
                v.file.buffer,
                `${toSlug(colorNameUpper)}.png`,
                categoryPath,
                productId,
                true
              );

              await db
                .update(colors)
                .set({
                  imagePath: uploaded.path,
                  imageUrl: uploaded.url,
                })
                .where(eq(colors.id, colorId));
            }
            await db.insert(productVariants).values({
              productId,
              colorId,
              sizeId,
              stock: v.stock ?? 0,
              price: v.price ?? product.price_default,
              stockKeepingUnit: generateSku(colorNameUpper, sizeNameUpper),
            });
          }
        }
      }

      // 4) Recalculate tổng stock
      const [{ totalStock }] = await db
        .select({ totalStock: sql`SUM(${productVariants.stock})` })
        .from(productVariants)
        .where(eq(productVariants.productId, productId));

      await db
        .update(products)
        .set({ stock: totalStock ?? 0 })
        .where(eq(products.id, productId));
    }

    // 5) Coupon
    if (data.couponId) {
      const exists = await db
        .select({ productId: couponProducts.productId })
        .from(couponProducts)
        .where(
          and(
            eq(couponProducts.productId, product.id),
            eq(couponProducts.couponId, data.couponId)
          )
        );

      if (exists.length === 0) {
        await db.insert(couponProducts).values({
          couponId: data.couponId,
          productId: product.id,
        });
      }
    }

    // 6) Trả về kết quả (chỉ định fields)
    const [updatedProduct] = await db
      .select({
        id: products.id,
        categoryId: products.categoryId,
        name: products.name,
        description: products.description,
        price_default: products.price_default,
        stock: products.stock,
        thumbnailPath: products.thumbnailPath,
        thumbnailUrl: products.thumbnailUrl,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    const updateCoupons = await db
      .select()
      .from(couponProducts)
      .where(eq(couponProducts.productId, productId));

    const variants = await db
      .select({
        id: productVariants.id,
        sku: productVariants.stockKeepingUnit,
        stock: productVariants.stock,
        price: productVariants.price,
        color: colors.name,
        size: sizes.name,
        imageUrl: colors.imageUrl,
        imagePath: colors.imagePath,
      })
      .from(productVariants)
      .leftJoin(colors, eq(productVariants.colorId, colors.id))
      .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
      .where(eq(productVariants.productId, productId));

    return { updatedProduct, variants, updateCoupons };
  } catch (error) {
    console.error("Error in updateProductService:", error);
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
    throw new Error("Failed to delete color");
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
