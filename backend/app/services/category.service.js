import { db } from "../db/client.js";
import { categories, products } from "../db/schema.js";
import { eq, ne, inArray, count, sql } from "drizzle-orm";

export const createCategoryService = async (data) => {
  try {
    // Kiem tra trung ten danh muc
    const exists = await db
      .select()
      .from(categories)
      .where(eq(categories.name, data.name))
      .limit(1);

    if (exists.length > 0) {
      throw new Error("category name already exists");
    }

    const payload = {
      name: data.name,
      parentId: data.parentId ?? null,
      sort: data.sort ?? 0,
    };

    // ghi vao db
    const inserted = await db.insert(categories).values(payload).returning();

    // tra ve ket qua
    return inserted[0];
  } catch (error) {
    console.error("Error creating category:", error);
    throw error;
  }
};

export const getAllCategoriesService = async () => {
  try {
    const allCategories = await db
      .select({
        // Lấy tất cả các cột của bảng categories
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
        sort: categories.sort,
        // Đếm số lượng sản phẩm (map sang số nguyên)
        productCount: count(products.id).mapWith(Number),
      })
      .from(categories)
      // Join với bảng products để đếm
      .leftJoin(products, eq(categories.id, products.categoryId))
      // Group by ID danh mục để hàm count hoạt động đúng cho từng dòng
      .groupBy(categories.id)
      .orderBy(categories.sort);

    return allCategories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};
// lay 1 danh muc theo id
export const getCategoryById = async (id) => {
  try {
    console.log("Truy vấn id:", id);
    const category = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);
    console.log("Kết quả truy vấn:", category);
    if (category.length === 0) {
      throw new Error("category not found");
    }
    return category[0];
  } catch (error) {
    console.error("Error fetching category by ID:", error);
    throw error;
  }
};

export const updateCategoryService = async (id, data) => {
  try {
    const existing = await getCategoryById(id);

    // FIX 1: Chỉ kiểm tra trùng tên NẾU tên có thay đổi
    // (Nếu chỉ đổi danh mục cha mà tên giữ nguyên thì bỏ qua bước này)
    if (data.name && data.name !== existing.name) {
      const nameExists = await db
        .select()
        .from(categories)
        .where(
          // FIX 2: Dùng and() để gộp 2 điều kiện
          and(
            eq(categories.name, data.name),
            ne(categories.id, id) // Loại trừ chính nó
          )
        )
        .limit(1);

      if (nameExists.length > 0) {
        throw new Error("category name already exists");
      }
    }

    // FIX 3: Logic xử lý cập nhật cha
    const payload = {
      name: data.name !== undefined ? data.name : existing.name,
      // Cho phép set về null nếu gửi lên là null
      parentId: data.parentId !== undefined ? data.parentId : existing.parentId,
      sort: data.sort !== undefined ? data.sort : existing.sort,
    };

    const updated = await db
      .update(categories)
      .set(payload)
      .where(eq(categories.id, id))
      .returning();

    return updated[0];
  } catch (error) {
    console.error("Error updating category:", error);
    throw error;
  }
};

// Hàm đệ quy để tìm tất cả ID danh mục con của một danh mục (bao gồm cả ID danh mục gốc)
const findNestedCategoryIds = async (parentId) => {
  // Bắt đầu với ID của danh mục gốc
  let allIds = [parentId];

  // 1. Tìm tất cả danh mục con trực tiếp của parentId
  const directChildren = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, parentId));

  // 2. Lặp qua các danh mục con và gọi đệ quy
  for (const child of directChildren) {
    // Gọi đệ quy cho từng danh mục con
    const nestedChildrenIds = await findNestedCategoryIds(child.id);
    // Thêm các ID tìm được vào mảng chính
    allIds = allIds.concat(nestedChildrenIds);
  }

  return allIds;
};

// Xóa một danh mục sau khi kiểm tra không có sản phẩm nào thuộc danh mục đó hoặc danh mục con của nó
export const deleteCategoryService = async (id) => {
  try {
    return await db.transaction(async (tx) => {
      // 1. Lấy tất cả ID liên quan (Cha + Con + Cháu...)
      // Kết quả vd: [ID_Cha, ID_Con_1, ID_Con_2]
      const nestedIds = await findNestedCategoryIds(id);

      // 2. Đếm tổng sản phẩm nằm trong BẤT KỲ danh mục nào thuộc cây này
      const productCountResult = await tx
        .select({ count: count(products.id) })
        .from(products)
        .where(inArray(products.categoryId, nestedIds));

      const countProducts = Number(productCountResult[0]?.count || 0);

      // 3. Logic kiểm tra điều kiện
      if (countProducts > 0) {
        // Nếu có dù chỉ 1 sản phẩm trong bất kỳ danh mục con nào -> CHẶN
        throw new Error(
          `Không thể xóa! Tìm thấy ${countProducts} sản phẩm thuộc danh mục này hoặc các danh mục con.`
        );
      }

      // Xóa tất cả các danh mục có ID nằm trong danh sách nestedIds
      // Việc này giải quyết lỗi Foreign Key vì cả cha và con đều bị xóa cùng lệnh
      await tx.delete(categories).where(inArray(categories.id, nestedIds));

      return { message: "Đã xóa danh mục và toàn bộ danh mục con thành công." };
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    throw error;
  }
};
export const getProductsByCategoryService = async (categoryId) => {
  // lấy tất cả sub-category ids
  const subCategories = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, categoryId));

  const subCategoryIds = subCategories.map((c) => c.id);

  // thêm luôn category hiện tại
  const categoryIds = [categoryId, ...subCategoryIds];

  // query products thuộc các category đó
  const productsData = await db
    .select({
      id: products.id,
      name: products.name,
      price: products.price_default,
      thumbnailUrl: products.thumbnailUrl,
    })
    .from(products)
    .where(inArray(products.categoryId, categoryIds));

  return productsData;
};
