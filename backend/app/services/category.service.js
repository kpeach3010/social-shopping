import { db } from "../db/client.js";
import { categories } from "../db/schema.js";
import { eq, ne } from "drizzle-orm";

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
    throw new Error("Failed to create category");
  }
};

export const getAllCategoriesService = async () => {
  try {
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(categories.sort);
    return allCategories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw new Error("Failed to fetch categories");
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
    throw new Error("Failed to fetch category by ID");
  }
};

export const updateCategoryService = async (id, data) => {
  try {
    // Kiem tra ton tai

    const existing = await getCategoryById(id);

    // neu co name moi thi kiem tra trung ten
    if (data.name) {
      const nameExists = await db
        .select()
        .from(categories)
        .where(eq(categories.name, data.name), ne(categories.id, id))
        // loai tru chinh no
        .limit(1);

      if (nameExists.length > 0) {
        throw new Error("category name already exists");
      }
    }

    // payload update
    const payload = {
      name: data.name ?? existing.name,
      parentId: data.parentId ?? existing.parentId,
      sort: data.sort ?? existing.sort,
    };

    // update vao db
    const updated = await db
      .update(categories)
      .set(payload)
      .where(eq(categories.id, id))
      .returning();

    return updated[0];
  } catch (error) {
    console.error("Error updating category:", error);
    throw new Error("Failed to update category");
  }
};

// xoa danh muc
export const deleteCategoryService = async (id) => {
  try {
    // Kiem tra ton tai
    await getCategoryById(id);

    // xoa danh muc
    await db.delete(categories).where(eq(categories.id, id));
    return { message: "Category deleted successfully" };
  } catch (error) {
    console.error("Error deleting category:", error);
    throw new Error("Failed to delete category");
  }
};
