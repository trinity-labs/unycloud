<template>
  <div class="vue-simple-progress-wrap" :class="progressClass">
    <div
      v-if="text.length > 0 && textPosition === 'top'"
      class="vue-simple-progress-text"
    >
      {{ text }}
    </div>
    <div
      class="vue-simple-progress"
      :class="{
        'vue-simple-progress--overlay':
          textPosition === 'middle' || textPosition === 'inside',
      }"
    >
      <div
        v-if="text.length > 0 && textPosition === 'middle'"
        class="vue-simple-progress-text vue-simple-progress-text--middle"
      >
        {{ text }}
      </div>
      <progress class="vue-simple-progress-bar" :value="pct" max="100" />
      <div
        v-if="text.length > 0 && textPosition === 'inside'"
        class="vue-simple-progress-text vue-simple-progress-text--inside"
      >
        {{ text }}
      </div>
    </div>
    <div
      v-if="text.length > 0 && textPosition === 'bottom'"
      class="vue-simple-progress-text"
    >
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from "vue";
import {
  clampNumber,
  cssPx,
  getDynamicClass,
  safeCssColor,
  safeTextAlign,
  upsertRule,
} from "@/utils/cspStyle";

defineOptions({ name: "progress-bar" });

const props = withDefaults(
  defineProps<{
    val?: number | string;
    max?: number | string;
    size?: number | string;
    bgColor?: string;
    barColor?: string;
    barTransition?: string;
    barBorderRadius?: number;
    spacing?: number;
    text?: string;
    textAlign?: string;
    textPosition?: "bottom" | "top" | "middle" | "inside";
    fontSize?: number;
    textFgColor?: string;
  }>(),
  {
    val: 0,
    max: 100,
    size: 3,
    bgColor: "#eee",
    barColor: "#3e3aab",
    barTransition: "all 0.5s ease",
    barBorderRadius: 0,
    spacing: 4,
    text: "",
    textAlign: "center",
    textPosition: "bottom",
    fontSize: 13,
    textFgColor: "#222",
  }
);

const progressClass = getDynamicClass("vue-simple-progress-scope");

const pct = computed(() => {
  const max = clampNumber(props.max, 1, Number.MAX_SAFE_INTEGER);
  const val = clampNumber(props.val, 0, max);
  return Number(((val / max) * 100).toFixed(2));
});

const sizePx = computed(() => {
  switch (props.size) {
    case "tiny":
      return 2;
    case "small":
      return 4;
    case "medium":
      return 8;
    case "large":
      return 12;
    case "big":
      return 16;
    case "huge":
      return 32;
    case "massive":
      return 64;
    default:
      return clampNumber(props.size, 1, 64);
  }
});

const textPadding = computed(() => {
  if (typeof props.size === "string") {
    return Math.min(Math.max(Math.ceil(sizePx.value / 8), 3), 12);
  }
  return clampNumber(props.spacing, 0, 32);
});

const textFontSize = computed(() => {
  if (typeof props.size === "string") {
    return Math.min(Math.max(Math.ceil(sizePx.value * 1.4), 11), 32);
  }
  return clampNumber(props.fontSize, 8, 64);
});

watchEffect(() => {
  const scope = `.${progressClass}`;
  const radius =
    props.barBorderRadius > 0 ? cssPx(props.barBorderRadius, 0, 64) : "0";
  const transition =
    typeof CSS !== "undefined" &&
    CSS.supports("transition", props.barTransition)
      ? props.barTransition
      : "all 0.5s ease";

  upsertRule(`${scope} .vue-simple-progress`, {
    background: safeCssColor(props.bgColor, "#eee"),
    "min-height":
      props.textPosition === "middle" || props.textPosition === "inside"
        ? cssPx(sizePx.value, 1, 64)
        : null,
    "border-radius": radius,
  });
  upsertRule(`${scope} .vue-simple-progress-bar`, {
    height: cssPx(sizePx.value, 1, 64),
    "border-radius": radius,
  });
  upsertRule(`${scope} .vue-simple-progress-bar::-webkit-progress-value`, {
    background: safeCssColor(props.barColor, "#3e3aab"),
    transition,
    "border-radius": radius,
  });
  upsertRule(`${scope} .vue-simple-progress-bar::-moz-progress-bar`, {
    background: safeCssColor(props.barColor, "#3e3aab"),
    transition,
    "border-radius": radius,
  });
  upsertRule(`${scope} .vue-simple-progress-text`, {
    color: safeCssColor(props.textFgColor, "#222"),
    "font-size": cssPx(textFontSize.value, 8, 64),
    "text-align": safeTextAlign(props.textAlign),
    "padding-bottom":
      props.textPosition === "top" ||
      props.textPosition === "middle" ||
      props.textPosition === "inside"
        ? cssPx(textPadding.value, 0, 32)
        : null,
    "padding-top":
      props.textPosition === "bottom" ||
      props.textPosition === "middle" ||
      props.textPosition === "inside"
        ? cssPx(textPadding.value, 0, 32)
        : null,
  });
});
</script>

<style scoped>
.vue-simple-progress {
  position: relative;
}

.vue-simple-progress-bar {
  appearance: none;
  border: 0;
  width: 100%;
  display: block;
  background: transparent;
}

.vue-simple-progress-bar::-webkit-progress-bar {
  background: transparent;
}

.vue-simple-progress-text--middle,
.vue-simple-progress-text--inside {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
</style>
