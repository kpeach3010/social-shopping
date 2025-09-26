const {
  createProductService,
  getAllProductService,
  getProductByIdService,
  deleteProductService,
  deleteVariantService,
  updateProductService,
} = require("../services/product.service");

exports.createProductController = async (req, res) => {
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
    if (Array.isArray(body.variants)) {
      body.variants = body.variants.map((v, idx) => {
        const variantFile = req.files.find(
          (f) => f.fieldname === `variants[${idx}][file]`
        );
        if (variantFile) {
          v.file = variantFile; // có .buffer
        }
        return v;
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
exports.getAllProductController = async (req, res) => {
  try {
    const product = await getAllProductService();
    res.status(200).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// lay 1 product theo id
exports.getProductByIdController = async (req, res) => {
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

// xoa 1 product
exports.deleteProductController = async (req, res) => {
  try {
    const productId = req.params.id;
    const result = await deleteProductService(productId);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// xoa 1 variant
exports.deleteVariantController = async (req, res) => {
  try {
    const productId = req.params.id;
    const result = await deleteVariantService(productId);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

//update product
exports.updateProductController = async (req, res) => {
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
