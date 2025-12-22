// backend/app/services/momo.service.js
import crypto from "crypto";
import axios from "axios";
import { momoConfig } from "../config/momo.js";
import moment from "moment";
import qs from "qs";
import { vnpayConfig } from "../config/vnpay.js";

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

// Hàm sắp xếp object theo thứ tự a-z (Bắt buộc của VNPay)
function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}

/**
 * Tạo URL thanh toán gửi sang VNPay
 */
export const createVnpayUrlService = ({
  orderId,
  amount,
  orderInfo,
  ipAddr,
  clientReturnUrl,
}) => {
  const date = new Date();
  const createDate = moment(date).format("YYYYMMDDHHmmss");

  const { tmnCode, hashSecret, url, returnUrl } = vnpayConfig;

  // Ưu tiên link từ Frontend gửi lên, nếu không thì dùng trong config
  const vnpReturnUrl = clientReturnUrl || returnUrl;

  let vnp_Params = {};
  vnp_Params["vnp_Version"] = "2.1.0";
  vnp_Params["vnp_Command"] = "pay";
  vnp_Params["vnp_TmnCode"] = tmnCode;
  vnp_Params["vnp_Locale"] = "vn";
  vnp_Params["vnp_CurrCode"] = "VND";
  vnp_Params["vnp_TxnRef"] = orderId;
  vnp_Params["vnp_OrderInfo"] = orderInfo || `Thanh toan cho ma GD: ${orderId}`;
  vnp_Params["vnp_OrderType"] = "other";
  vnp_Params["vnp_Amount"] = amount * 100; // VNPay tính đơn vị là đồng (nhân 100)
  vnp_Params["vnp_ReturnUrl"] = vnpReturnUrl;
  vnp_Params["vnp_IpAddr"] = ipAddr;
  vnp_Params["vnp_CreateDate"] = createDate;

  // Sắp xếp tham số
  vnp_Params = sortObject(vnp_Params);

  // Tạo chữ ký bảo mật
  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac("sha512", hashSecret);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  vnp_Params["vnp_SecureHash"] = signed;

  // Trả về link thanh toán đầy đủ
  return url + "?" + qs.stringify(vnp_Params, { encode: false });
};

/**
 * Kiểm tra chữ ký khi VNPay trả về (Verify Return)
 */
// Thay thế hàm cũ bằng hàm này
export const verifyVnpayReturnService = (vnp_Params) => {
  let secureHash = vnp_Params["vnp_SecureHash"];

  // 1. Xóa các trường hash
  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  // 2. Lọc tham số rác
  let vnp_Params_Fix = {};
  Object.keys(vnp_Params).forEach((key) => {
    if (key.startsWith("vnp_") && vnp_Params[key]) {
      vnp_Params_Fix[key] = vnp_Params[key];
    }
  });

  // 3. Sắp xếp object đã lọc
  vnp_Params_Fix = sortObject(vnp_Params_Fix);

  // 4. Ký lại
  const { hashSecret } = vnpayConfig;
  const signData = qs.stringify(vnp_Params_Fix, { encode: false });
  const hmac = crypto.createHmac("sha512", hashSecret);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  return {
    isSuccess: secureHash === signed,
    responseCode: vnp_Params["vnp_ResponseCode"],
    orderId: vnp_Params["vnp_TxnRef"],
  };
};
