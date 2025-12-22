// backend/app/services/momo.service.js
import crypto from "crypto";
import axios from "axios";
import { momoConfig } from "../config/momo.js";

/**
 * Service tạo yêu cầu thanh toán sang MoMo
 */
export const createMomoPaymentRequest = async (
  orderId,
  amount,
  clientRedirectUrl
) => {
  const {
    partnerCode,
    accessKey,
    secretKey,
    endpoint,
    ipnUrl,
    redirectUrl: configRedirectUrl,
  } = momoConfig;

  // Ưu tiên link từ client gửi lên
  const redirectUrl = clientRedirectUrl || configRedirectUrl;

  const requestId = orderId + new Date().getTime();
  const orderInfo = "Thanh toan don hang " + orderId;
  const requestType = "captureWallet";
  const extraData = "";

  // Tạo chữ ký
  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const requestBody = {
    partnerCode,
    partnerName: "Social Shopping",
    storeId: "MomoTestStore",
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl,
    ipnUrl,
    lang: "vi",
    requestType,
    autoCapture: true,
    extraData,
    signature,
  };

  try {
    const response = await axios.post(endpoint, requestBody);
    return response.data; // Trả về data từ MoMo (bao gồm payUrl)
  } catch (error) {
    throw new Error(
      `MoMo API Error: ${JSON.stringify(error.response?.data || error.message)}`
    );
  }
};

/**
 * Service xác thực chữ ký trả về (Verify Signature)
 */
export const verifyMomoSignature = (data) => {
  const {
    partnerCode,
    orderId,
    requestId,
    amount,
    orderInfo,
    orderType,
    transId,
    resultCode,
    message,
    payType,
    responseTime,
    extraData,
    signature,
  } = data;

  const { accessKey, secretKey } = momoConfig;

  // Tạo lại chữ ký để kiểm tra
  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

  const generatedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  return generatedSignature === signature;
};
