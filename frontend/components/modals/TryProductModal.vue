<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-0 sm:p-6"
      @click.self="close"
    >
      <!-- Popup fixed height, no scroll -->
      <div
        class="w-full max-w-[1800px] rounded-none sm:rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col h-[100dvh] sm:h-[96vh]"
      >
        <!-- Header -->
        <div
          class="flex items-start sm:items-center justify-between gap-2 sm:gap-4 px-4 sm:px-7 py-3 sm:py-4 border-b shrink-0"
        >
          <div class="min-w-0">
            <h2 class="text-base sm:text-xl font-bold text-gray-900 truncate">
              Thử sản phẩm
            </h2>
            <p class="text-xs sm:text-sm text-gray-500 hidden sm:block">
              Chọn màu → tải ảnh của bạn → xem kết quả.
            </p>
          </div>

          <button
            class="shrink-0 inline-flex items-center justify-center rounded-full w-10 h-10 hover:bg-gray-100 transition"
            @click="close"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        <!-- Body: scrollable on mobile, no scroll on desktop -->
        <div class="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          <div class="lg:h-full grid grid-cols-1 lg:grid-cols-5">
            <!-- Left: 2 cột nhỏ, 1 cho ảnh áo, 1 cho upload ảnh người -->
            <div
              class="lg:col-span-2 p-3 sm:p-5 lg:p-7 border-b lg:border-b-0 lg:border-r lg:h-full flex flex-col min-h-0"
            >
              <!-- Colors -->
              <div class="mb-3 sm:mb-4">
                <div class="flex items-center justify-between mb-1.5 sm:mb-2">
                  <label
                    class="font-semibold text-gray-900 text-sm sm:text-base"
                    >Màu sắc</label
                  >
                  <span v-if="selectedColor" class="text-xs text-gray-500">
                    Đã chọn: <b>{{ selectedColor }}</b>
                  </span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="c in colors"
                    :key="c"
                    type="button"
                    class="px-2.5 py-1 min-w-[40px] rounded-full border text-xs transition"
                    :class="
                      selectedColor === c
                        ? 'bg-black text-white border-black'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    "
                    @click="selectedColor = c"
                  >
                    {{ c }}
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 mb-3 sm:mb-4 lg:gap-10">
                <!-- Cột 1: Ảnh áo đã chọn -->
                <div>
                  <label
                    class="font-semibold text-gray-900 text-xs sm:text-sm mb-1 block"
                    >Ảnh áo đã chọn</label
                  >
                  <div
                    class="w-full flex items-center justify-center min-h-[260px] sm:min-h-[340px] max-h-[700px] h-[38vh] sm:h-[48vh] lg:h-[56vh] bg-gray-100 rounded-xl border overflow-hidden"
                    style="
                      aspect-ratio: 4/5;
                      min-width: 0;
                      width: 100%;
                      max-width: 540px;
                      margin-left: auto;
                      margin-right: auto;
                    "
                  >
                    <img
                      v-if="currentClothImage"
                      :src="currentClothImage"
                      alt="Ảnh áo đã chọn"
                      class="max-h-full max-w-full object-contain"
                    />
                    <span v-else class="text-xs text-gray-400 py-6"
                      >Chưa có ảnh áo</span
                    >
                  </div>
                </div>
                <!-- Cột 2: Upload ảnh cá nhân -->
                <div>
                  <label
                    class="font-semibold text-gray-900 text-xs sm:text-sm mb-1 block"
                    >Ảnh của bạn</label
                  >
                  <div
                    class="relative rounded-xl sm:rounded-2xl border-2 border-dashed bg-gray-50 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[340px] max-h-[700px] h-[38vh] sm:h-[48vh] lg:h-[56vh] mb-0"
                    style="
                      aspect-ratio: 4/5;
                      min-width: 0;
                      width: 100%;
                      max-width: 540px;
                      margin-left: auto;
                      margin-right: auto;
                    "
                  >
                    <label
                      class="w-full h-full flex flex-col items-center justify-center cursor-pointer group"
                      style="border-radius: 1rem"
                    >
                      <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="onPersonFileChange"
                      />
                      <template v-if="personPreview">
                        <img
                          :src="personPreview"
                          class="w-full h-full object-contain rounded-2xl"
                          alt="Preview"
                        />
                      </template>
                      <template v-else>
                        <div
                          class="flex flex-col items-center justify-center w-full h-full select-none"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            class="w-10 h-10 sm:w-14 sm:h-14 text-gray-400 group-hover:text-blue-500 transition"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="M12 16V4m0 0l-4 4m4-4l4 4M20.25 16.25v2.25A2.25 2.25 0 0118 20.75H6a2.25 2.25 0 01-2.25-2.25v-2.25"
                            />
                          </svg>
                          <div
                            class="mt-1.5 sm:mt-2 text-gray-500 text-xs sm:text-sm text-center"
                          >
                            Nhấn để tải ảnh của bạn<br />(JPG/PNG/WebP, tối đa
                            10MB)
                          </div>
                        </div>
                      </template>
                    </label>
                    <!-- Nút xóa ảnh, chỉ hiện khi có preview -->
                    <button
                      v-if="personPreview"
                      type="button"
                      class="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-600 hover:bg-red-500 hover:text-white hover:border-red-500 transition z-30"
                      @click.stop="clearPerson"
                      title="Xóa ảnh"
                      style="padding: 0"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              <!-- Controls: FIXED area -->
              <div class="mt-1 sm:mt-2 shrink-0 w-full">
                <p
                  v-if="errorMsg"
                  class="text-sm text-red-600 mb-2 text-center"
                >
                  {{ errorMsg }}
                </p>
                <button
                  type="button"
                  class="w-full py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2 text-sm"
                  :class="
                    canRun && !loading
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  "
                  :disabled="!canRun || loading"
                  @click="tryOn"
                >
                  <span
                    v-if="loading"
                    class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                  />
                  <span>{{ loading ? "Đang xử lý…" : "Thử ngay" }}</span>
                </button>
                <div class="flex gap-2 mt-2">
                  <!-- <button
                    type="button"
                    class="flex-1 py-1 rounded bg-gray-100 text-gray-800 text-xs hover:bg-gray-200 transition"
                    @click="resetAll"
                  >
                    Làm lại
                  </button> -->
                  <button
                    type="button"
                    class="flex-1 py-1 rounded bg-white border text-gray-800 text-xs hover:bg-gray-50 transition"
                    @click="close"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>

            <!-- Right: result -->
            <div
              class="lg:col-span-3 p-3 sm:p-5 lg:p-7 lg:h-full flex flex-col min-h-0"
            >
              <div
                class="flex items-center justify-between mb-2 sm:mb-3 shrink-0"
              >
                <div>
                  <h3 class="font-semibold text-gray-900">Kết quả</h3>
                  <!-- <p v-if="loading" class="text-xs text-blue-600 mt-0.5">
                    ⏱️ Đang xử lý {{ elapsedTime }}s
                  </p> -->
                  <p
                    v-if="processingTime"
                    class="text-xs text-green-600 mt-0.5"
                  >
                    ⏱️ Hoàn thành trong {{ processingTime }}s
                  </p>
                </div>

                <button
                  v-if="resultUrl"
                  type="button"
                  class="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 text-sm hover:bg-gray-200 transition"
                  @click="downloadResult"
                >
                  Tải ảnh
                </button>
              </div>

              <!-- Result image area -->
              <div
                class="flex-1 min-h-[200px] sm:min-h-[300px] lg:min-h-0 rounded-xl sm:rounded-2xl border bg-gray-50 overflow-hidden flex items-center justify-center"
              >
                <div v-if="loading" class="text-center p-4 sm:p-8">
                  <div
                    class="mx-auto w-12 h-12 border-4 border-gray-300 border-t-transparent rounded-full animate-spin"
                  />
                  <p class="text-sm text-gray-600 mt-3">
                    Đang ghép ảnh… ({{ elapsedTime }}s)
                  </p>
                </div>

                <img
                  v-else-if="resultUrl"
                  :src="resultUrl"
                  class="w-full h-full object-contain bg-white"
                  alt="Kết quả thử đồ"
                />

                <div v-else class="text-center p-4 sm:p-8">
                  <div class="text-4xl sm:text-6xl">🖼️</div>
                  <p class="text-sm text-gray-500 mt-2">
                    Kết quả sẽ hiển thị ở đây
                  </p>
                </div>
              </div>

              <p
                class="text-xs text-gray-500 mt-2 sm:mt-3 shrink-0 pb-2 sm:pb-0"
              >
                *Kết quả chỉ mang tính minh hoạ.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount } from "vue";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  colors: { type: Array, default: () => [] },
  variantImages: { type: Array, default: () => [] }, // [{color,imageUrl}]
  initialColor: { type: [String, null], default: null },
  apiBase: { type: String, default: "" },
});

const emit = defineEmits(["close"]);

const selectedColor = ref("");
const personFile = ref(null);
const personPreview = ref("");
const resultUrl = ref("");
const loading = ref(false);
const errorMsg = ref("");
const startTime = ref(null);
const processingTime = ref(null);
const elapsedTime = ref("0.0");

let timerId = null;

function revoke(url) {
  if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
}

function clearResult() {
  revoke(resultUrl.value);
  resultUrl.value = "";
}

function clearPerson() {
  personFile.value = null;
  personPreview.value = "";
}

function resetAll() {
  errorMsg.value = "";
  loading.value = false;
  startTime.value = null;
  processingTime.value = null;
  elapsedTime.value = "0.0";
  stopTimer();
  clearPerson();
  clearResult();
}

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      selectedColor.value = props.initialColor || props.colors?.[0] || "";
      errorMsg.value = "";
      loading.value = false;
      startTime.value = null;
      processingTime.value = null;
      elapsedTime.value = "0.0";
      stopTimer();
      clearPerson();
      clearResult();
    }
  },
);

onBeforeUnmount(() => {
  clearPerson();
  clearResult();
  stopTimer();
});

const currentClothImage = computed(() => {
  if (!selectedColor.value) return "";
  const found = props.variantImages?.find(
    (v) => v.color === selectedColor.value,
  );
  return found?.imageUrl || "";
});

const canRun = computed(() => {
  return (
    !!selectedColor.value && !!personFile.value && !!currentClothImage.value
  );
});

function onPersonFileChange(e) {
  errorMsg.value = "";
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    errorMsg.value = "File không hợp lệ. Vui lòng chọn ảnh.";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    errorMsg.value = "Ảnh quá lớn. Vui lòng chọn ảnh <= 10MB.";
    return;
  }

  personFile.value = file;
  clearResult();

  const reader = new FileReader();
  reader.onload = (ev) => (personPreview.value = ev.target?.result || "");
  reader.readAsDataURL(file);
}

function startTimer() {
  stopTimer();
  elapsedTime.value = "0.0";
  timerId = setInterval(() => {
    if (startTime.value) {
      elapsedTime.value = ((Date.now() - startTime.value) / 1000).toFixed(1);
    }
  }, 100);
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

async function tryOn() {
  console.log("CLICK TRYON - fired");
  if (!canRun.value || loading.value) return;

  errorMsg.value = "";
  loading.value = true;
  startTime.value = Date.now();
  processingTime.value = null;
  elapsedTime.value = "0.0";
  clearResult();
  startTimer();

  try {
    const form = new FormData();
    form.append(
      "person",
      personFile.value,
      personFile.value.name || "person.png",
    );
    form.append("clothUrl", currentClothImage.value);

    // Đã dọn dẹp các biến dư thừa clothType và fitMode để sạch code
    console.log("form.get(person):", form.get("person"));
    console.log("FormData keys:", [...form.keys()]);

    let base = props.apiBase || "";
    base = base.replace(/\/$/, "");
    let url = "";
    if (base.endsWith("/api")) {
      url = `${base}/try-on/run`;
    } else if (base) {
      url = `${base}/api/try-on/run`;
    } else {
      url = "/api/try-on/run";
    }

    const res = await fetch(url, { method: "POST", body: form });

    if (!res.ok) {
      // Xử lý thông minh: Cố gắng đọc lỗi từ JSON do Node.js trả về
      let errorMessage = "Lỗi API thử đồ";
      try {
        const errData = await res.json();
        errorMessage = errData.message || errorMessage;
      } catch (e) {
        // Fallback: nếu không phải JSON thì lấy text thuần
        const txt = await res.text().catch(() => "");
        if (txt) errorMessage = txt;
      }
      throw new Error(errorMessage);
    }

    // Nhận blob nguyên thủy
    const rawBlob = await res.blob();
    if (!rawBlob || rawBlob.size === 0) {
      throw new Error("Không nhận được dữ liệu ảnh");
    }

    const imageBlob = new Blob([rawBlob], { type: "image/jpeg" });
    resultUrl.value = URL.createObjectURL(imageBlob);

    // Tính thời gian xử lý
    if (startTime.value) {
      processingTime.value = ((Date.now() - startTime.value) / 1000).toFixed(1);
    }
  } catch (err) {
    console.error(err);
    errorMsg.value =
      err.message || "Không thể tạo ảnh thử đồ. Vui lòng thử lại.";
  } finally {
    loading.value = false;
    stopTimer();
  }
}

function downloadResult() {
  if (!resultUrl.value) return;
  const a = document.createElement("a");
  a.href = resultUrl.value;
  a.download = "tryon_result.png";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function close() {
  emit("close");
}
</script>
