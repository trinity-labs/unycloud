<template>
  <div class="context-menu" :class="menuClass" ref="contextMenu" v-if="show">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onUnmounted, nextTick } from "vue";
import { cssPx, getDynamicClass, upsertRule } from "@/utils/cspStyle";

const emit = defineEmits(["hide"]);
const props = defineProps<{ show: boolean; pos: { x: number; y: number } }>();
const contextMenu = ref<HTMLElement | null>(null);
const menuClass = getDynamicClass("context-menu-position");

const left = computed(() => {
  return Math.min(
    props.pos.x,
    window.innerWidth - (contextMenu.value?.clientWidth ?? 0)
  );
});

const hideContextMenu = () => {
  emit("hide");
};

const updatePosition = () => {
  upsertRule(`.${menuClass}`, {
    top: cssPx(props.pos.y),
    left: cssPx(left.value),
  });
};

watch(
  () => props.show,
  (val) => {
    if (val) {
      nextTick(updatePosition);
      document.addEventListener("click", hideContextMenu);
    } else {
      document.removeEventListener("click", hideContextMenu);
    }
  }
);

watch(
  () => [props.pos.x, props.pos.y, left.value],
  () => {
    if (props.show) {
      nextTick(updatePosition);
    }
  }
);

onUnmounted(() => {
  document.removeEventListener("click", hideContextMenu);
});
</script>
