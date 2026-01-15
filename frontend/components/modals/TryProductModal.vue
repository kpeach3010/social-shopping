<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-3 sm:p-6"
      @click.self="close"
    >
      <!-- Popup fixed height, no scroll -->
      <div
        class="w-full max-w-6xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col h-[92vh]"
      >
        <!-- Header -->
        <div
          class="flex items-start sm:items-center justify-between gap-4 px-5 sm:px-7 py-4 border-b shrink-0"
        >
          <div class="min-w-0">
            <h2 class="text-lg sm:text-xl font-bold text-gray-900 truncate">
              Thử sản phẩm
            </h2>
            <p class="text-sm text-gray-500">
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

        <!-- Body (NO scroll) -->
        <div class="flex-1 min-h-0">
          <div class="h-full grid grid-cols-1 lg:grid-cols-5">
            <!-- Left -->
            <div
              class="lg:col-span-2 p-5 sm:p-7 border-b lg:border-b-0 lg:border-r h-full flex flex-col min-h-0"
            >
              <!-- Colors -->
              <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                  <label class="font-semibold text-gray-900">Màu sắc</label>
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

              <!-- Upload ảnh cá nhân -->
              <div
                class="relative rounded-2xl border-2 border-dashed bg-gray-50 flex flex-col items-center justify-center min-h-[260px] max-h-[520px] h-[40vh] sm:h-[44vh] lg:h-[46vh] mb-4"
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
                        class="w-14 h-14 text-gray-400 group-hover:text-blue-500 transition"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M12 16V4m0 0l-4 4m4-4l4 4M20.25 16.25v2.25A2.25 2.25 0 0118 20.75H6a2.25 2.25 0 01-2.25-2.25v-2.25"
                        />
                      </svg>
                      <div class="mt-2 text-gray-500 text-sm text-center">
                        Nhấn để tải ảnh của bạn<br />(JPG/PNG/WebP, tối đa 10MB)
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
              <!-- Controls: FIXED area -->
              <div class="mt-2 shrink-0 w-full">
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
                  <button
                    type="button"
                    class="flex-1 py-1 rounded bg-gray-100 text-gray-800 text-xs hover:bg-gray-200 transition"
                    @click="resetAll"
                  >
                    Làm lại
                  </button>
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

            <!-- Right: result ALWAYS fits popup (no scroll) -->
            <div class="lg:col-span-3 p-5 sm:p-7 h-full flex flex-col min-h-0">
              <div class="flex items-center justify-between mb-3 shrink-0">
                <h3 class="font-semibold text-gray-900">Kết quả</h3>

                <button
                  v-if="resultUrl"
                  type="button"
                  class="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 text-sm hover:bg-gray-200 transition"
                  @click="downloadResult"
                >
                  Tải ảnh
                </button>
              </div>

              <!-- This box takes ALL remaining height -->
              <div
                class="flex-1 min-h-0 rounded-2xl border bg-gray-50 overflow-hidden flex items-center justify-center"
              >
                <div v-if="loading" class="text-center p-8">
                  <div
                    class="mx-auto w-12 h-12 border-4 border-gray-300 border-t-transparent rounded-full animate-spin"
                  />
                  <p class="text-sm text-gray-600 mt-3">Đang ghép ảnh…</p>
                </div>

                <img
                  v-else-if="resultUrl"
                  :src="resultUrl"
                  class="w-full h-full object-contain bg-white"
                  alt="Kết quả thử đồ"
                />

                <div v-else class="text-center p-8">
                  <div class="text-6xl">🖼️</div>
                  <p class="text-sm text-gray-500 mt-2">
                    Kết quả sẽ hiển thị ở đây
                  </p>
                </div>
              </div>

              <p class="text-xs text-gray-500 mt-3 shrink-0">
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
      clearPerson();
      clearResult();
    }
  }
);

onBeforeUnmount(() => {
  clearPerson();
  clearResult();
});

const currentClothImage = computed(() => {
  if (!selectedColor.value) return "";
  const found = props.variantImages?.find(
    (v) => v.color === selectedColor.value
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

async function tryOn() {
  console.log("CLICK TRYON - fired");
  if (!canRun.value || loading.value) return;

  errorMsg.value = "";
  loading.value = true;
  clearResult();

  try {
    const form = new FormData();
    form.append(
      "person",
      personFile.value,
      personFile.value.name || "person.png"
    );
    form.append("clothUrl", currentClothImage.value);
    form.append("clothType", "upper");
    form.append("fitMode", "standard"); // mặc định standard

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
    console.log("personFile", personFile.value);
    console.log("FormData keys:", [...form.keys()]);

    const res = await fetch(url, { method: "POST", body: form });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || "Lỗi API thử đồ");
    }

    const blob = await res.blob();
    resultUrl.value = URL.createObjectURL(blob);
  } catch (err) {
    console.error(err);
    errorMsg.value = "Không thể tạo ảnh thử đồ. Vui lòng thử lại.";
  } finally {
    loading.value = false;
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
