import paypalConfig from "../config/paypal.js";
import config from "../config/index.js";
// Lấy tỷ giá VND -> USD realtime, fallback 25500 nếu lỗi
const getVndToUsdRate = async () => {
  try {
    const res = await axios.get("https://open.er-api.com/v6/latest/USD");
    const vndRate = res.data?.rates?.VND;
    if (vndRate && vndRate > 0) return vndRate; // VD: 25500 (1 USD = 25500 VND)
  } catch (e) {
    console.warn("Không lấy được tỷ giá realtime, dùng fallback:", e.message);
  }
  return 25500; // Fallback
};

// PAYPAL QR/APPROVAL URL SERVICE
export const createPaypalPaymentUrlService = async ({ orderId, amount }) => {
  // Lấy access token từ PayPal
  const baseUrl = paypalConfig.sandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
  try {
    // 0. Lấy tỷ giá VND -> USD realtime
    const vndPerUsd = await getVndToUsdRate();
    const amountUsd = (amount / vndPerUsd).toFixed(2);
    console.log(
      `PayPal: ${amount} VND = ${amountUsd} USD (rate: 1 USD = ${vndPerUsd} VND)`,
    );

    // 1. Get access token
    const basicAuth = Buffer.from(
      `${paypalConfig.clientId}:${paypalConfig.clientSecret}`,
    ).toString("base64");
    const tokenRes = await axios.post(
      `${baseUrl}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    const accessToken = tokenRes.data.access_token;

    // 2. Create order
    const orderRes = await axios.post(
      `${baseUrl}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: orderId,
            amount: {
              currency_code: "USD",
              value: amountUsd,
            },
            description: `Đơn hàng ${orderId} — ${new Intl.NumberFormat("vi-VN").format(amount)} VND`,
            payee: { email_address: paypalConfig.businessEmail },
          },
        ],
        application_context: {
          // return_url chỉ về backend API — quan trọng cho phone scanning QR
          // Khi user approve trên ĐT, PayPal redirect về backend → backend capture + cập nhật DB
          return_url: `${config.backendUrl}/api/payment/paypal/return`,
          cancel_url: `${config.frontendUrl}/checkout?paypal_cancel=1`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );
    const approvalUrl = orderRes.data.links.find(
      (l) => l.rel === "approve",
    )?.href;
    // 3. Tạo QR từ link approve (dùng dịch vụ bên ngoài hoặc trả về link approve cho FE tự render QR)
    // Có thể dùng https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=... để tạo QR
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(approvalUrl)}`;
    return { qrUrl, approvalUrl, orderId: orderRes.data.id };
  } catch (err) {
    return { error: err.message, detail: err.response?.data };
  }
};

// PAYPAL RETURN SERVICE — Capture payment + lấy orderId thật từ DB
export const verifyPaypalReturnService = async (params) => {
  // PayPal redirect về với token (= PayPal order ID) và PayerID
  if (!params.token || !params.PayerID) {
    return { isSuccess: false };
  }

  const paypalOrderId = params.token; // Đây là PayPal order ID, KHÔNG phải DB order ID

  const baseUrl = paypalConfig.sandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  try {
    // 1. Lấy access token
    const basicAuth = Buffer.from(
      `${paypalConfig.clientId}:${paypalConfig.clientSecret}`,
    ).toString("base64");
    const tokenRes = await axios.post(
      `${baseUrl}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    const accessToken = tokenRes.data.access_token;

    // 2. Capture payment (bắt buộc để tiền thực sự chuyển)
    const captureRes = await axios.post(
      `${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const captureData = captureRes.data;
    console.log(
      "PayPal Capture Response:",
      JSON.stringify(captureData, null, 2),
    );

    if (captureData.status === "COMPLETED") {
      // 3. Lấy reference_id = DB order ID thật
      const dbOrderId = captureData.purchase_units?.[0]?.reference_id;
      const captureId =
        captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      const amountUsd =
        captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
      return {
        isSuccess: true,
        orderId: dbOrderId,
        paypalOrderId,
        captureId,
        amountUsd,
      };
    }

    return { isSuccess: false, message: `Trạng thái: ${captureData.status}` };
  } catch (err) {
    console.error("PayPal Capture Error:", err.response?.data || err.message);
    return { isSuccess: false, message: err.message };
  }
};
// PAYPAL: Kiểm tra trạng thái order trên PayPal API, nếu APPROVED thì capture luôn
export const checkAndCapturePaypalOrder = async (paypalOrderId) => {
  const baseUrl = paypalConfig.sandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  try {
    // 1. Lấy access token
    const basicAuth = Buffer.from(
      `${paypalConfig.clientId}:${paypalConfig.clientSecret}`,
    ).toString("base64");
    const tokenRes = await axios.post(
      `${baseUrl}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    const accessToken = tokenRes.data.access_token;

    // 2. Kiểm tra trạng thái order trên PayPal
    const orderRes = await axios.get(
      `${baseUrl}/v2/checkout/orders/${paypalOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    const orderData = orderRes.data;
    console.log(`PayPal order ${paypalOrderId} status: ${orderData.status}`);

    // Nếu đã COMPLETED (đã capture trước đó)
    if (orderData.status === "COMPLETED") {
      const dbOrderId = orderData.purchase_units?.[0]?.reference_id;
      const captureId =
        orderData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
      const amountUsd =
        orderData.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
      return {
        isPaid: true,
        orderId: dbOrderId,
        paypalOrderId,
        captureId,
        amountUsd,
      };
    }

    // Nếu APPROVED (user đã approve trên ĐT nhưng chưa capture)
    if (orderData.status === "APPROVED") {
      // 3. Capture ngay
      const captureRes = await axios.post(
        `${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        },
      );

      const captureData = captureRes.data;
      console.log(
        "PayPal Auto-Capture Response:",
        JSON.stringify(captureData, null, 2),
      );

      if (captureData.status === "COMPLETED") {
        const dbOrderId = captureData.purchase_units?.[0]?.reference_id;
        const captureId =
          captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
        const amountUsd =
          captureData.purchase_units?.[0]?.payments?.captures?.[0]?.amount
            ?.value;
        return {
          isPaid: true,
          orderId: dbOrderId,
          paypalOrderId,
          captureId,
          amountUsd,
        };
      }
    }

    // Chưa approve (CREATED, SAVED, ...) hoặc lỗi
    return { isPaid: false, status: orderData.status };
  } catch (err) {
    return { isPaid: false, error: err.message };
  }
};
// HOÀN TIỀN QUA PAYPAL
export const refundPaypalPaymentService = async (captureId, amountUsd) => {
  const baseUrl = paypalConfig.sandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  try {
    // 1. Get access token
    const basicAuth = Buffer.from(
      `${paypalConfig.clientId}:${paypalConfig.clientSecret}`,
    ).toString("base64");
    const tokenRes = await axios.post(
      `${baseUrl}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    const accessToken = tokenRes.data.access_token;

    // 2. Refund call
    const refundRes = await axios.post(
      `${baseUrl}/v2/payments/captures/${captureId}/refund`,
      {
        amount: {
          value: amountUsd,
          currency_code: "USD",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    return { isSuccess: true, data: refundRes.data };
  } catch (err) {
    console.error("PayPal Refund Error:", err.response?.data || err.message);
    return { isSuccess: false, error: err.message, detail: err.response?.data };
  }
};

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
  clientRedirectUrl,
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
      `MoMo API Error: ${JSON.stringify(error.response?.data || error.message)}`,
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
