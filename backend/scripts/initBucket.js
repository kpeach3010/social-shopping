import { createProductImagesBucket } from "../services/supbase/bucketProduct.js";

async function main() {
  try {
    const bucket = await createProductImagesBucket();
    console.log("✅ Bucket created successfully:", bucket);
  } catch (error) {
    console.error("❌ Failed:", error.message);
  }
}

main();
