<template>
  <section
    class="pdf-viewer"
    @wheel.stop
    @touchmove.stop
    @keydown.stop
    @keydown.esc="emit('close')"
  >
    <div class="pdf-toolbar" :aria-label="t('pdf.controls')">
      <button
        type="button"
        :disabled="!documentReady || pageNumber <= 1"
        :title="t('buttons.previous')"
        :aria-label="t('buttons.previous')"
        @click="pageNumber--"
      >
        <i class="material-icons" aria-hidden="true">chevron_left</i>
      </button>
      <input
        class="pdf-page-input"
        type="number"
        min="1"
        :max="pageCount || 1"
        :value="pageNumber"
        :disabled="!documentReady"
        :aria-label="t('pdf.page')"
        @change="changePage"
      />
      <span class="pdf-page-total">/ {{ pageCount || "-" }}</span>
      <button
        type="button"
        :disabled="!documentReady || pageNumber >= pageCount"
        :title="t('buttons.next')"
        :aria-label="t('buttons.next')"
        @click="pageNumber++"
      >
        <i class="material-icons" aria-hidden="true">chevron_right</i>
      </button>
      <button
        type="button"
        :disabled="!documentReady || zoom <= 0.5"
        :title="t('pdf.zoomOut')"
        :aria-label="t('pdf.zoomOut')"
        @click="zoom = Math.max(0.5, zoom - 0.25)"
      >
        <i class="material-icons" aria-hidden="true">zoom_out</i>
      </button>
      <button
        type="button"
        :disabled="!documentReady || zoom >= 3"
        :title="t('pdf.zoomIn')"
        :aria-label="t('pdf.zoomIn')"
        @click="zoom = Math.min(3, zoom + 0.25)"
      >
        <i class="material-icons" aria-hidden="true">zoom_in</i>
      </button>
      <button
        type="button"
        :disabled="!documentReady"
        :title="t('pdf.fitWidth')"
        :aria-label="t('pdf.fitWidth')"
        @click="zoom = 1"
      >
        <i class="material-icons" aria-hidden="true">fit_screen</i>
      </button>
      <button
        type="button"
        :disabled="!documentReady"
        :title="t('pdf.rotate')"
        :aria-label="t('pdf.rotate')"
        @click="rotation = (rotation + 90) % 360"
      >
        <i class="material-icons" aria-hidden="true">rotate_right</i>
      </button>
    </div>
    <div v-if="passwordNeeded" class="pdf-state">
      <form @submit.prevent="submitPassword">
        <label :for="passwordID">{{
          t(passwordWrong ? "pdf.wrongPassword" : "pdf.password")
        }}</label>
        <input
          :id="passwordID"
          v-model="password"
          type="password"
          autocomplete="off"
          required
        />
        <button class="button" type="submit">
          {{ t("buttons.continue") }}
        </button>
      </form>
    </div>
    <div v-else-if="error" class="pdf-state" role="alert">
      <p>{{ t("pdf.error") }}</p>
      <button type="button" class="button" @click="loadDocument">
        {{ t("pdf.retry") }}
      </button>
      <a
        v-if="canDownload"
        class="button"
        :href="downloadUrl"
        target="_blank"
        rel="noopener noreferrer"
        >{{ t("buttons.download") }}</a
      >
    </div>
    <div v-else ref="scroller" class="pdf-scroll" :aria-busy="busy">
      <p v-if="busy" class="pdf-loading" role="status">
        {{ t("pdf.loading") }}
      </p>
      <div ref="canvasHost" class="pdf-canvas-host"></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  getDocument,
  GlobalWorkerOptions,
  PasswordResponses,
  version,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from "pdfjs-dist";
import workerURL from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { staticURL } from "@/utils/constants";
import { cssPx, getDynamicClass, upsertRule } from "@/utils/cspStyle";
import { pdfCanvasSize } from "@/utils/pdf";

const props = defineProps<{
  src: string;
  downloadUrl: string;
  canDownload: boolean;
}>();
const emit = defineEmits<{ close: [] }>();
const { t } = useI18n();
GlobalWorkerOptions.workerSrc = workerURL;
const canvasClass = getDynamicClass("pdf-canvas");
const passwordID = getDynamicClass("pdf-password");
const scroller = ref<HTMLElement>();
const canvasHost = ref<HTMLElement>();
const pageNumber = ref(1);
const pageCount = ref(0);
const zoom = ref(1);
const rotation = ref(0);
const documentReady = ref(false);
const busy = ref(true);
const error = ref(false);
const passwordNeeded = ref(false);
const passwordWrong = ref(false);
const password = ref("");
let passwordCallback: ((value: string) => void) | undefined;
let loadingTask: PDFDocumentLoadingTask | undefined;
let pdf: PDFDocumentProxy | undefined;
let rendering: RenderTask | undefined;
let generation = 0;
let renderGeneration = 0;
let observer: ResizeObserver | undefined;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
let disposed = false;
let displayedPage = 0;

function changePage(event: Event) {
  const input = event.target as HTMLInputElement;
  const value = Number(input.value);
  if (Number.isInteger(value))
    pageNumber.value = Math.max(1, Math.min(pageCount.value, value));
  input.value = String(pageNumber.value);
}

function submitPassword() {
  passwordNeeded.value = false;
  busy.value = true;
  passwordCallback?.(password.value);
  password.value = "";
}

async function renderPage() {
  const document = pdf;
  if (!document || !canvasHost.value || !scroller.value || disposed) return;
  const current = ++renderGeneration;
  const requestedPage = pageNumber.value;
  rendering?.cancel();
  busy.value = true;
  let page;
  try {
    page = await document.getPage(requestedPage);
    if (current !== renderGeneration || disposed) return;
    const angle = (page.rotate + rotation.value) % 360;
    const original = page.getViewport({ scale: 1, rotation: angle });
    const width = Math.max(160, scroller.value.clientWidth - 24);
    const viewport = page.getViewport({
      scale: (width / original.width) * zoom.value,
      rotation: angle,
    });
    const size = pdfCanvasSize(
      viewport.width,
      viewport.height,
      window.devicePixelRatio
    );
    const canvas = window.document.createElement("canvas");
    canvas.className = canvasClass;
    canvas.width = size.width;
    canvas.height = size.height;
    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      `${t("pdf.page")} ${requestedPage} / ${pageCount.value}`
    );
    const task = page.render({
      canvas,
      viewport,
      transform: [size.ratio, 0, 0, size.ratio, 0, 0],
    });
    rendering = task;
    await task.promise;
    if (current === renderGeneration && !disposed && canvasHost.value) {
      // Keep the completed page visible while rendering the next zoom offscreen.
      const previousCanvas = canvasHost.value.querySelector("canvas");
      const scale = previousCanvas
        ? viewport.width / previousCanvas.getBoundingClientRect().width
        : 1;
      const left = scroller.value.scrollLeft * scale;
      const top = scroller.value.scrollTop * scale;
      upsertRule(`.${canvasClass}`, {
        width: cssPx(viewport.width, 1, 30000),
        height: cssPx(viewport.height, 1, 30000),
      });
      canvasHost.value.replaceChildren(canvas);
      scroller.value.scrollTo(
        displayedPage === requestedPage ? left : 0,
        displayedPage === requestedPage ? top : 0
      );
      displayedPage = requestedPage;
      error.value = false;
    }
  } catch (cause) {
    if (
      current === renderGeneration &&
      !disposed &&
      (cause as Error).name !== "RenderingCancelledException"
    )
      error.value = true;
  } finally {
    if (current === renderGeneration) busy.value = false;
  }
}

async function loadDocument() {
  const current = ++generation;
  ++renderGeneration;
  rendering?.cancel();
  const previous = loadingTask;
  loadingTask = undefined;
  pdf = undefined;
  displayedPage = 0;
  documentReady.value = false;
  pageCount.value = 0;
  pageNumber.value = 1;
  zoom.value = 1;
  rotation.value = 0;
  error.value = false;
  busy.value = true;
  passwordNeeded.value = false;
  passwordCallback = undefined;
  password.value = "";
  canvasHost.value?.replaceChildren();
  try {
    await previous?.destroy();
    if (current !== generation || disposed) return;
    const url = new URL(props.src, window.location.href);
    if (url.origin !== window.location.origin)
      throw new Error("PDF origin mismatch");
    const assets = `${staticURL}/pdfjs/${version}/`;
    const task: PDFDocumentLoadingTask = getDocument({
      url: url.href,
      cMapUrl: `${assets}cmaps/`,
      standardFontDataUrl: `${assets}standard_fonts/`,
      wasmUrl: `${assets}wasm/`,
      iccUrl: `${assets}iccs/`,
      useWasm: false,
      disableFontFace: true,
      enableXfa: false,
      isOffscreenCanvasSupported: false,
      isImageDecoderSupported: false,
      canvasMaxAreaInBytes: 16_000_000,
      maxImageSize: 16_000_000,
      disableAutoFetch: true,
      disableStream: true,
    });
    loadingTask = task;
    task.onPassword = (callback: (value: string) => void, reason: number) => {
      if (current !== generation || disposed) return;
      passwordCallback = callback;
      passwordWrong.value = reason === PasswordResponses.INCORRECT_PASSWORD;
      passwordNeeded.value = true;
      busy.value = false;
    };
    const result = await task.promise;
    if (current !== generation || disposed) return;
    pdf = result;
    pageCount.value = result.numPages;
    documentReady.value = true;
    await nextTick();
    await renderPage();
  } catch {
    if (current === generation && !disposed) {
      passwordNeeded.value = false;
      error.value = true;
      busy.value = false;
    }
  }
}

watch([pageNumber, zoom, rotation], renderPage, { flush: "post" });
watch(() => props.src, loadDocument);
watch(scroller, (element) => {
  observer?.disconnect();
  if (element) observer?.observe(element);
});
onMounted(() => {
  let lastWidth = 0;
  observer = new ResizeObserver(([entry]) => {
    if (entry.contentRect.width === lastWidth) return;
    lastWidth = entry.contentRect.width;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderPage, 100);
  });
  if (scroller.value) observer.observe(scroller.value);
  void loadDocument();
});
onBeforeUnmount(() => {
  disposed = true;
  ++generation;
  ++renderGeneration;
  clearTimeout(resizeTimer);
  observer?.disconnect();
  rendering?.cancel();
  void loadingTask?.destroy().catch(() => {});
  passwordCallback = undefined;
});
</script>

<style scoped>
.pdf-viewer {
  width: 100%;
  height: calc(100% - var(--pdf-header-height, 4rem));
  margin-top: var(--pdf-header-height, 4rem);
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--background);
  color: var(--textPrimary);
}
.pdf-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 4px;
  flex-shrink: 0;
  background: var(--surfacePrimary);
  border-bottom: 1px solid var(--divider);
}
.pdf-toolbar button {
  width: 36px;
  height: 40px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.pdf-toolbar button:hover {
  background: var(--surfaceSecondary);
}
.pdf-toolbar button:disabled {
  opacity: 0.35;
  cursor: default;
}
.pdf-toolbar button:focus-visible,
.pdf-page-input:focus-visible {
  outline: 2px solid var(--brandPrimary);
  outline-offset: -2px;
}
.pdf-toolbar i {
  font-size: 20px;
}
.pdf-page-input {
  width: 48px;
  height: 32px;
  padding: 2px;
  text-align: center;
  border: 1px solid var(--divider);
  border-radius: 4px;
  background: var(--background);
  color: inherit;
  font-size: 0.875rem;
}
.pdf-page-total {
  font-size: 0.875rem;
  min-width: 32px;
}
.pdf-scroll {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
  overscroll-behavior: contain;
  touch-action: pan-x pan-y pinch-zoom;
}
.pdf-canvas-host {
  padding: 12px;
  min-width: 100%;
  width: max-content;
}
.pdf-canvas-host :deep(canvas) {
  display: block;
  margin: 0 auto;
  background: #fff;
}
.pdf-loading {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  background: var(--surfacePrimary);
  padding: 0.5rem;
  border-radius: 4px;
  z-index: 1;
}
.pdf-state {
  padding: 1rem;
  margin: auto;
  max-width: 100%;
}
.pdf-state form {
  display: grid;
  gap: 0.75rem;
  max-width: 22rem;
}
.pdf-state input {
  width: 100%;
  min-width: 0;
  padding: 0.5rem;
}
</style>
