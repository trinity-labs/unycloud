<template>
  <div ref="host" class="pdf-pages" :class="layoutClass">
    <div
      v-for="number in document.numPages"
      :key="number"
      class="pdf-page"
      :class="`${layoutClass}-page-${number}`"
      :data-page="number"
      role="group"
      :aria-label="`${t('pdf.page')} ${number} / ${document.numPages}`"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { useI18n } from "vue-i18n";
import { cssPx, getDynamicClass, upsertRule } from "@/utils/cspStyle";
import { pdfCanvasSize, pdfPrefetchScreens } from "@/utils/pdf";

const props = defineProps<{
  document: PDFDocumentProxy;
  scroller: HTMLElement;
  zoom: number;
  rotation: number;
}>();
const emit = defineEmits<{
  page: [number: number];
  busy: [value: boolean];
  error: [];
}>();
const { t } = useI18n();
const host = ref<HTMLElement>();
const layoutClass = getDynamicClass("pdf-pages");
type Connection = EventTarget & {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
};
const connection = (navigator as Navigator & { connection?: Connection })
  .connection;
const nearby = new Set<number>();
const canvasLimit = window.matchMedia(
  "(min-width: 738px) and (hover: hover) and (pointer: fine)"
).matches
  ? 4
  : 2;
const rendered = new Map<number, number>();
const measuredPages = new Set<number>();
let slots: HTMLElement[] = [];
let observer: IntersectionObserver | undefined;
let resizeObserver: ResizeObserver | undefined;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
let frame = 0;
let task: RenderTask | undefined;
let revision = 0;
let running = false;
let disposed = false;
let pageRatio = 1.414;
let width = 0;
let currentPage = 1;

function findCurrent() {
  const root = props.scroller.getBoundingClientRect();
  // Find the first page crossing the upper third of the viewport.
  const position = root.top + Math.min(100, root.height / 3);
  let low = 0;
  let high = slots.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (slots[middle].getBoundingClientRect().bottom < position)
      low = middle + 1;
    else high = middle;
  }
  return low + 1;
}

function onScroll() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    currentPage = findCurrent();
    emit("page", currentPage);
    void pump();
  });
}

function goToPage(number: number) {
  currentPage = number;
  const slot = slots[number - 1];
  if (!slot) return;
  props.scroller.scrollTop +=
    slot.getBoundingClientRect().top -
    props.scroller.getBoundingClientRect().top -
    12;
  currentPage = number;
  emit("page", number);
  nearby.add(number);
  void pump();
}
defineExpose({ goToPage });

function observePages() {
  observer?.disconnect();
  nearby.clear();
  const margin = Math.round(
    props.scroller.clientHeight * pdfPrefetchScreens(connection)
  );
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const number = Number((entry.target as HTMLElement).dataset.page);
        if (entry.isIntersecting) nearby.add(number);
        else nearby.delete(number);
      }
      void pump();
    },
    { root: props.scroller, rootMargin: `${margin}px 0px` }
  );
  slots.forEach((slot) => observer!.observe(slot));
}

async function pump() {
  if (running || disposed || !width) return;
  running = true;
  try {
    while (!disposed) {
      const root = props.scroller.getBoundingClientRect();
      const visible = new Set(
        [...nearby].filter((number) => {
          const rect = slots[number - 1]?.getBoundingClientRect();
          return rect && rect.bottom > root.top && rect.top < root.bottom;
        })
      );
      const candidates = [...nearby]
        .sort(
          (a, b) =>
            Number(visible.has(b)) - Number(visible.has(a)) ||
            Math.abs(a - currentPage) - Math.abs(b - currentPage)
        )
        .slice(0, Math.max(canvasLimit, visible.size));
      // A rebuilt observer has no entries yet; retain the last visible rasters.
      if (!candidates.length) break;
      // Keep visible pages at low zoom; bound offscreen prefetch independently of document length.
      for (const number of rendered.keys()) {
        if (!candidates.includes(number)) {
          slots[number - 1]?.replaceChildren();
          rendered.delete(number);
        }
      }
      const number = candidates.find(
        (number) => rendered.get(number) !== revision
      );
      if (number === undefined) break;
      const epoch = revision;
      emit("busy", true);
      const page = await props.document.getPage(number);
      if (disposed || epoch !== revision) continue;
      try {
        const angle = (page.rotate + props.rotation) % 360;
        const natural = page.getViewport({ scale: 1, rotation: angle });
        const viewport = page.getViewport({
          scale: width / natural.width,
          rotation: angle,
        });
        const size = pdfCanvasSize(
          viewport.width,
          viewport.height,
          window.devicePixelRatio
        );
        const canvas = window.document.createElement("canvas");
        canvas.width = size.width;
        canvas.height = size.height;
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          `${t("pdf.page")} ${number} / ${props.document.numPages}`
        );
        task = page.render({
          canvas,
          viewport,
          transform: [size.ratio, 0, 0, size.ratio, 0, 0],
        });
        await task.promise;
        if (disposed || epoch !== revision || !nearby.has(number)) continue;
        upsertRule(`.${layoutClass} .${layoutClass}-page-${number}`, {
          "aspect-ratio": `${viewport.width} / ${viewport.height}`,
        });
        measuredPages.add(number);
        slots[number - 1].replaceChildren(canvas);
        rendered.set(number, epoch);
      } catch (error) {
        if ((error as Error).name !== "RenderingCancelledException")
          throw error;
      } finally {
        task = undefined;
        // Renders are serialized: no newer render can share this page yet.
        page.cleanup();
      }
    }
  } catch {
    if (!disposed) emit("error");
  } finally {
    running = false;
    if (!disposed) emit("busy", false);
  }
}

function layout() {
  if (!slots.length || disposed) return;
  const anchor = slots[width ? findCurrent() - 1 : 0];
  const root = props.scroller.getBoundingClientRect();
  const rect = anchor.getBoundingClientRect();
  const fraction =
    width && rect.height ? (root.top - rect.top) / rect.height : 0;
  const left = props.scroller.scrollLeft;
  const previousWidth = width;
  width = Math.max(160, props.scroller.clientWidth - 24) * props.zoom;
  ++revision;
  task?.cancel();
  const ratio = props.rotation % 180 ? 1 / pageRatio : pageRatio;
  upsertRule(`.${layoutClass} .pdf-page`, {
    width: cssPx(width, 1, 30000),
    "aspect-ratio": `1 / ${ratio}`,
  });
  // Clear only geometry overrides; keep old canvases visible until replacement.
  for (const number of measuredPages)
    upsertRule(`.${layoutClass} .${layoutClass}-page-${number}`, {
      "aspect-ratio": null,
    });
  if (previousWidth) {
    props.scroller.scrollTop +=
      anchor.getBoundingClientRect().top -
      root.top +
      fraction * anchor.getBoundingClientRect().height;
  } else props.scroller.scrollTop = 0;
  if (previousWidth) props.scroller.scrollLeft = (left * width) / previousWidth;
  observePages();
}

onMounted(async () => {
  try {
    const page = await props.document.getPage(1);
    if (disposed) return;
    const viewport = page.getViewport({ scale: 1 });
    pageRatio = viewport.height / viewport.width;
    await nextTick();
    if (disposed) return;
    slots = Array.from(host.value!.querySelectorAll<HTMLElement>(".pdf-page"));
    layout();
    if (currentPage !== 1) goToPage(currentPage);
    props.scroller.addEventListener("scroll", onScroll, { passive: true });
    connection?.addEventListener("change", observePages);
    let lastWidth = props.scroller.clientWidth;
    resizeObserver = new ResizeObserver(() => {
      if (props.scroller.clientWidth === lastWidth) return;
      lastWidth = props.scroller.clientWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 100);
    });
    resizeObserver.observe(props.scroller);
  } catch {
    if (!disposed) emit("error");
  }
});
watch(() => [props.zoom, props.rotation], layout, { flush: "post" });
onBeforeUnmount(() => {
  disposed = true;
  task?.cancel();
  observer?.disconnect();
  resizeObserver?.disconnect();
  clearTimeout(resizeTimer);
  cancelAnimationFrame(frame);
  props.scroller.removeEventListener("scroll", onScroll);
  connection?.removeEventListener("change", observePages);
});
</script>

<style scoped>
.pdf-pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 12px;
  width: max-content;
  min-width: 100%;
}
.pdf-page {
  flex-shrink: 0;
  background: #fff;
  overflow: hidden;
}
.pdf-page :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
