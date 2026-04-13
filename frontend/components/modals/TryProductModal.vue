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
          class="flex items-center justify-between gap-2 sm:gap-4 px-4 sm:px-7 py-2.5 sm:py-4 border-b shrink-0 relative"
        >
          <div class="min-w-0">
            <h2 class="text-base sm:text-xl font-bold text-gray-900 truncate">
              Thử sản phẩm
            </h2>
            <p class="text-xs sm:text-sm text-gray-500 hidden sm:block">
              Chọn màu → tải ảnh của bạn → xem kết quả.
            </p>
          </div>

          <!-- Close Button (X) -->
          <button
            type="button"
            class="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
            @click="close"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-6 h-6"
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

              <!-- Grid 2 ảnh: flex-1 min-h-0 để tự co khi viewport nhỏ -->
              <div class="grid grid-cols-2 gap-2.5 sm:gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden mb-3 sm:mb-4">
                <!-- Cột 1: Ảnh áo đã chọn -->
                <div class="flex flex-col min-h-0">
                  <label
                    class="font-semibold text-gray-900 text-xs sm:text-sm mb-1 block shrink-0"
                    >Ảnh áo đã chọn</label
                  >
                  <div
                    class="flex-1 min-h-0 w-full flex items-center justify-center bg-gray-50 rounded-xl border overflow-hidden shadow-inner"
                    style="aspect-ratio: 4/5; min-width: 0;"
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
                <div class="flex flex-col min-h-0">
                  <div class="flex items-center justify-between mb-1.5 px-0.5">
                    <label class="font-semibold text-gray-900 text-xs sm:text-sm block shrink-0">
                      Ảnh của bạn
                    </label>
                    <button
                      type="button"
                      class="text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 hover:underline decoration-dotted underline-offset-2"
                      @click="showGuideModal = true"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-3 h-3">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                      </svg>
                      Hướng dẫn chọn ảnh
                    </button>
                  </div>
                  <div
                    class="relative flex-1 min-h-0 rounded-xl sm:rounded-2xl border-2 border-dashed bg-gray-50 flex flex-col items-center justify-center shadow-inner overflow-hidden"
                    :class="personPreview && !personValid && !validatingPerson ? 'border-red-400' : 'border-dashed'"
                    style="aspect-ratio: 4/5; min-width: 0;"
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
                          :class="{ 'opacity-40': validatingPerson }"
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

                    <!-- Validation overlay: đang kiểm tra -->
                    <div
                      v-if="validatingPerson"
                      class="absolute inset-0 flex flex-col items-center justify-center bg-white/70 z-20 rounded-xl sm:rounded-2xl pointer-events-none"
                    >
                      <span class="inline-block w-7 h-7 border-[3px] border-blue-500 border-t-transparent rounded-full animate-spin mb-2" />
                      <p class="text-xs text-blue-600 font-medium">Đang kiểm tra ảnh…</p>
                    </div>

                    <!-- Invalid badge -->
                    <div
                      v-if="personPreview && !personValid && !validatingPerson"
                      class="absolute inset-0 flex flex-col items-center justify-center bg-red-50/60 z-20 rounded-xl sm:rounded-2xl pointer-events-none"
                    >
                      <span class="text-2xl">⚠️</span>
                    </div>

                    <!-- Valid badge -->
                    <div
                      v-if="personPreview && personValid && !validatingPerson"
                      class="absolute top-2 left-2 flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full shadow-lg z-30 animate-in fade-in zoom-in duration-300"
                      title="Ảnh hợp lệ"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="w-5 h-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </div>

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
              <div class="mt-1 sm:mt-2 shrink-0 min-w-0 flex flex-col items-center">
                <p
                  v-if="errorMsg"
                  class="text-sm text-red-600 mb-2 text-center"
                >
                  {{ errorMsg }}
                </p>
                <p
                  v-if="personPreview && personValid && !validatingPerson && !loading"
                  class="text-xs text-green-600 mb-2 font-medium flex items-center gap-1"
                >
                  <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Ảnh hợp lệ. Hãy bấm "Thử ngay" để bắt đầu.
                </p>

                <button
                  type="button"
                  class="px-8 py-2.5 sm:py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm sm:text-base shadow-sm active:scale-[0.98]"
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
                <div v-if="loading" class="mt-2">
                  <p class="text-xs text-blue-600 text-center animate-pulse">
                    Đang xử lý, vui lòng đợi...
                  </p>
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

                <div v-if="resultUrl" class="flex items-center gap-2">
                  <!-- Nút tải ảnh -->
                  <button
                    type="button"
                    class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 text-sm hover:bg-gray-200 transition"
                    @click="downloadResult"
                  >
                    <ArrowDownTrayIcon class="w-4 h-4" />
                    <span class="hidden sm:inline">Tải ảnh</span>
                  </button>

                  <!-- Nút chia sẻ -->
                  <div class="relative" ref="shareMenuRef">
                    <button
                      type="button"
                      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition active:scale-[0.97]"
                      @click.stop="showShareMenu = !showShareMenu"
                    >
                      <ShareIcon class="w-4 h-4" />
                      <span class="hidden sm:inline">Chia sẻ</span>
                    </button>

                    <!-- Dropdown menu -->
                    <div
                      v-if="showShareMenu"
                      class="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                    >
                      <button
                        type="button"
                        class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 transition"
                        @click="shareToPost"
                        :disabled="sharingLoading"
                      >
                        <PencilSquareIcon class="w-4 h-4 text-gray-600 shrink-0" />
                        <span>Tạo bài viết</span>
                      </button>
                      <div class="border-t border-gray-100"></div>
                      <button
                        type="button"
                        class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50 transition"
                        @click="shareToChat"
                        :disabled="sharingLoading"
                      >
                        <ChatBubbleLeftEllipsisIcon class="w-4 h-4 text-gray-600 shrink-0" />
                        <span>Gửi vào cuộc trò chuyện</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Result image area -->
              <div
                class="flex-1 min-h-[220px] xs:min-h-[280px] sm:min-h-[340px] lg:min-h-0 rounded-xl sm:rounded-2xl border bg-white overflow-hidden flex items-center justify-center shadow-md relative"
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

  <!-- Guide Modal -->
  <ImageGuideModal 
    :is-open="showGuideModal" 
    @close="showGuideModal = false" 
  />
</template>

<script setup>
import { computed, ref, watch, onBeforeUnmount, onMounted } from "vue";
import {
  ArrowDownTrayIcon,
  PencilSquareIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/vue/24/outline";
import { Share2 as ShareIcon } from "lucide-vue-next";
import ImageGuideModal from "./ImageGuideModal.vue";

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  colors: { type: Array, default: () => [] },
  variantImages: { type: Array, default: () => [] }, // [{color,imageUrl}]
  initialColor: { type: [String, null], default: null },
  apiBase: { type: String, default: "" },
});

const emit = defineEmits(["close", "share-to-post", "share-to-chat"]);

const selectedColor = ref("");
const personFile = ref(null);
const personPreview = ref("");
const personValid = ref(false);       // true khi ảnh đã detect đúng 1 người
const validatingPerson = ref(false);  // true khi đang chạy COCO-SSD
const resultUrl = ref("");
const loading = ref(false);
const errorMsg = ref("");
const startTime = ref(null);
const processingTime = ref(null);
const elapsedTime = ref("0.0");

// Share menu
const showShareMenu = ref(false);
const sharingLoading = ref(false);
const shareMenuRef = ref(null);

const showGuideModal = ref(false);

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
  personValid.value = false;
  validatingPerson.value = false;
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
  document.removeEventListener("click", handleClickOutsideShareMenu);
});

onMounted(() => {
  document.addEventListener("click", handleClickOutsideShareMenu);
});

function handleClickOutsideShareMenu(e) {
  if (
    shareMenuRef.value &&
    !shareMenuRef.value.contains(e.target)
  ) {
    showShareMenu.value = false;
  }
}

// Chuyển Blob URL thành File object để upload
async function convertBlobToFile() {
  if (!resultUrl.value) return null;
  try {
    const res = await fetch(resultUrl.value);
    const blob = await res.blob();
    return new File([blob], "tryon_result.jpg", { type: "image/jpeg" });
  } catch (err) {
    console.error("Lỗi chuyển Blob sang File:", err);
    return null;
  }
}

async function shareToPost() {
  showShareMenu.value = false;
  sharingLoading.value = true;
  try {
    const file = await convertBlobToFile();
    if (!file) throw new Error("Không thể xử lý ảnh");
    emit("share-to-post", { file, previewUrl: resultUrl.value });
  } catch (err) {
    console.error("Lỗi chia sẻ bài viết:", err);
  } finally {
    sharingLoading.value = false;
  }
}

async function shareToChat() {
  showShareMenu.value = false;
  sharingLoading.value = true;
  try {
    const file = await convertBlobToFile();
    if (!file) throw new Error("Không thể xử lý ảnh");
    emit("share-to-chat", { file, previewUrl: resultUrl.value });
  } catch (err) {
    console.error("Lỗi chia sẻ chat:", err);
  } finally {
    sharingLoading.value = false;
  }
}

const currentClothImage = computed(() => {
  if (!selectedColor.value) return "";
  const found = props.variantImages?.find(
    (v) => v.color === selectedColor.value,
  );
  return found?.imageUrl || "";
});

const canRun = computed(() => {
  return (
    !!selectedColor.value &&
    !!personFile.value &&
    !!currentClothImage.value &&
    personValid.value &&
    !validatingPerson.value
  );
});

async function loadCocoSsd() {
  if (window.__cocoSsdModel) return window.__cocoSsdModel;
  
  // Tải thư viện từ node_modules thay vì CDN
  const cocoSsd = await import("@tensorflow-models/coco-ssd");
  await import("@tensorflow/tfjs");
  
  window.__cocoSsdModel = await cocoSsd.load();
  return window.__cocoSsdModel;
}

async function validatePersonImage(dataUrl) {
  const model = await loadCocoSsd();
  const img = new Image();
  img.src = dataUrl;
  await new Promise((resolve) => { img.onload = resolve; });
  const predictions = await model.detect(img);
  const persons = predictions.filter((p) => p.class === "person");
  return persons.length;
}

async function onPersonFileChange(e) {
  errorMsg.value = "";
  personValid.value = false;
  const file = e.target.files?.[0];
  // Reset input để có thể chọn lại cùng file
  e.target.value = "";
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    errorMsg.value = "File không hợp lệ. Vui lòng chọn ảnh.";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    errorMsg.value = "Ảnh quá lớn. Vui lòng chọn ảnh <= 10MB.";
    return;
  }

  // Hiện preview ngay, sau đó validate
  personFile.value = file;
  clearResult();

  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result || "");
    reader.readAsDataURL(file);
  });
  personPreview.value = dataUrl;

  // Chạy COCO-SSD detect
  validatingPerson.value = true;
  try {
    const count = await validatePersonImage(dataUrl);
    if (count !== 1) {
      errorMsg.value = "Ảnh không hợp lệ, vui lòng chọn ảnh khác.";
      personValid.value = false;
    } else {
      errorMsg.value = "";
      personValid.value = true;
    }
  } catch (err) {
    // Nếu model lỗi (mất mạng...) thì cho qua, không chặn người dùng
    console.warn("[COCO-SSD] Không thể kiểm tra ảnh, bỏ qua validation:", err);
    personValid.value = true;
  } finally {
    validatingPerson.value = false;
  }
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
