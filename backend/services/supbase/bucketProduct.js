import supabase from "./client.js";

export const createProductImagesBucket = async () => {
  try {
    const { data, error } = await supabase.storage.createBucket(
      "product-images",
      {
        public: true,
        fileSizeLimit: 1024 * 1024 * 5,
        allowedMimeTypes: ["image/png", "image/jpeg"],
      }
    );

    if (error) {
      throw error;
    }

    return data; // phải return data thì initBucket.js mới nhận được
  } catch (error) {
    console.error("Error creating bucket:", error.message);
    throw new Error("Failed to create bucket product-images");
  }
};
