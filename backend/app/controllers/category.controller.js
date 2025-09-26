const {
  createCategoryService,
  getAllCategoriesService,
  updateCategoryService,
  deleteCategoryService,
  getCategoryById,
} = require("../services/category.service.js");

// tạo category
exports.createCategoryController = async (req, res) => {
  try {
    const categoryData = req.body;
    const newCategory = await createCategoryService(categoryData);
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// lấy tất cả category
exports.getAllCategoriesController = async (req, res) => {
  try {
    const categories = await getAllCategoriesService();
    res.status(200).json(categories);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// lấy 1 category theo id
exports.getCategoryByIdController = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await getCategoryById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy tài nguyên" });
    }
    res.status(200).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// cập nhật category
exports.updateCategoryController = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const updateData = req.body;
    const updatedCategory = await updateCategoryService(categoryId, updateData);
    res.status(200).json(updatedCategory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// xóa category
exports.deleteCategoryController = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const result = await deleteCategoryService(categoryId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
