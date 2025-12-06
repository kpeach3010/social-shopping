import {
  createProductService,
  getAllProductService,
  getProductByIdService,
  deleteProductService,
  deleteVariantService,
  updateProductService,
  deleteColorService,
  searchProductByNameService,
  getProductsByPriceService,
} from "../services/product.service.js";

export const createProductController = async (req, res) => {
  console.log("body:", req.body);
  try {
    const body = req.body || {};
    // Gán giá trị mặc định nếu undefined
    body.colors = body.colors ?? "[]";
    body.sizes = body.sizes ?? "[]";
    body.variants = body.variants ?? "[]";

    // Parse các trường nếu là chuỗi JSON
    try {
      if (typeof body.colors === "string")
        body.colors = JSON.parse(body.colors);
    } catch {}
    try {
      if (typeof body.sizes === "string") body.sizes = JSON.parse(body.sizes);
    } catch {}
    try {
      if (typeof body.variants === "string")
        body.variants = JSON.parse(body.variants);
    } catch {}

    // Gán file thumbnail
    const thumbFile = req.files.find((f) => f.fieldname === "thumbnail");
    if (thumbFile) {
      body.thumbnailFile = thumbFile; // có .buffer
    }

    // Gán file cho từng variant
    if (Array.isArray(body.colors)) {
      body.colors = body.colors.map((c, idx) => {
        const colorFile = req.files.find(
          (f) => f.fieldname === `colors[${idx}][file]`
        );
        if (colorFile) c.file = colorFile;
        return c;
      });

      body;
      const product = await createProductService(body);
      res.status(201).json({
        message: "Product created successfully",
        data: product,
      });
    }
  } catch (error) {
    console.error("Error in createProductController:", error);
    res.status(400).json({ error: error.message });
  }
};

// lấy tất cả product
export const getAllProductController = async (req, res) => {
  try {
    const product = await getAllProductService();
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// lay 1 product theo id
export const getProductByIdController = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await getProductByIdService(productId);
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy tài nguyên" });
    }
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// xoa 1 hoặc nhiều product
export const deleteProductController = async (req, res) => {
  try {
    let ids = [];
    if (req.method === "DELETE" && req.body && Array.isArray(req.body.ids)) {
      ids = req.body.ids;
    } else if (req.params.ids) {
      // Hỗ trợ /delete-many/:ids (id1,id2,id3)
      ids = req.params.ids
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    } else if (req.params.id) {
      ids = [req.params.id];
    }
    if (!ids.length)
      return res.status(400).json({ error: "No product id(s) provided" });
    const result = await deleteProductService(ids);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// xoa 1 variant
export const deleteVariantController = async (req, res) => {
  try {
    const productId = req.params.id;
    const result = await deleteVariantService(productId);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//update product
export const updateProductController = async (req, res) => {
  try {
    const productId = req.params.id;
    const data = req.body || {};

    // ép kiểu string -> object
    if (typeof data.variants == "string") {
      data.variants = JSON.parse(data.variants);
    }

    console.log("req.body:", req.body);
    console.log("req.files:", req.files);

    // Kiem tra body co file va co file thumbnail
    if (req.files && req.files.length > 0) {
      const thumbFile = req.files.find((f) => f.fieldname === "thumbnail");
      if (thumbFile) {
        data.thumbnail = thumbFile;
      }

      data.variants = data.variants?.map((v, idx) => {
        const variantFile = req.files.find(
          (f) => f.fieldname === `variants[${idx}][file]`
        );
        return {
          ...v,
          file: variantFile || null,
        };
      });
    }

    const updated = await updateProductService(productId, data);
    res.status(200).json({
      message: "Product updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(400).json({ error: error.message });
  }
};

// Xóa 1 màu (color) và toàn bộ variants liên quan
export const deleteColorController = async (req, res) => {
  try {
    const colorId = req.params.id;
    console.log("colorId nhận từ FE:", colorId);
    const result = await deleteColorService(colorId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Tìm kiếm sản phẩm theo tên
export const searchProductByNameController = async (req, res) => {
  try {
    const { name } = req.query;
    const products = await searchProductByNameService(name);
    res.status(200).json(products);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getProductsByPriceController = async (req, res) => {
  try {
    const sort = req.query.sort || "asc"; // "asc" hoặc "desc"

    const products = await getProductsByPriceService({ sort });

    return res.status(200).json({
      status: "success",
      sort,
      data: products,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Không thể lấy danh sách sản phẩm",
    });
  }
};
