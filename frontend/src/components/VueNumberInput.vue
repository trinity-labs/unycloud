<template>
  <div
    class="vue-number-input"
    :class="{
      'vue-number-input--inline': inline,
      'vue-number-input--center': center,
      'vue-number-input--controls': controls,
      'vue-number-input--small': size === 'small',
      'vue-number-input--large': size === 'large',
    }"
  >
    <button
      v-if="controls"
      class="vue-number-input__button vue-number-input__button--minus"
      type="button"
      tabindex="-1"
      :disabled="disabled || readonly || !decreasable"
      @click="decrease"
    ></button>
    <input
      ref="input"
      class="vue-number-input__input"
      type="number"
      :name="name"
      :value="Number.isNaN(value) ? '' : value"
      :min="min"
      :max="max"
      :step="step"
      :readonly="readonly || !inputtable"
      :disabled="disabled || (!decreasable && !increasable)"
      :placeholder="placeholder"
      autocomplete="off"
      v-bind="attrs"
      @change="change"
      @keyup="$emit('keyup', $event)"
      @paste="paste"
    />
    <button
      v-if="controls"
      class="vue-number-input__button vue-number-input__button--plus"
      type="button"
      tabindex="-1"
      :disabled="disabled || readonly || !increasable"
      @click="increase"
    ></button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

defineOptions({ name: "vue-number-input" });

const props = withDefaults(
  defineProps<{
    attrs?: Record<string, unknown>;
    center?: boolean;
    controls?: boolean;
    disabled?: boolean;
    inputtable?: boolean;
    inline?: boolean;
    max?: number;
    min?: number;
    name?: string;
    placeholder?: string;
    readonly?: boolean;
    rounded?: boolean;
    size?: string;
    step?: number;
    modelValue?: number;
  }>(),
  {
    attrs: undefined,
    center: false,
    controls: false,
    disabled: false,
    inputtable: true,
    inline: false,
    max: Infinity,
    min: -Infinity,
    name: undefined,
    placeholder: undefined,
    readonly: false,
    rounded: false,
    size: undefined,
    step: 1,
    modelValue: NaN,
  }
);

const emit = defineEmits<{
  "update:modelValue": [value: number, previousValue: number];
  keyup: [event: KeyboardEvent];
}>();

const input = ref<HTMLInputElement>();
const value = ref<number>(NaN);

const increasable = computed(
  () => Number.isNaN(value.value) || value.value < props.max
);
const decreasable = computed(
  () => Number.isNaN(value.value) || value.value > props.min
);

watch(
  () => props.modelValue,
  (next, previous) => {
    if (
      !(Number.isNaN(next) && previous === undefined) &&
      next !== value.value
    ) {
      setValue(next);
    }
  },
  { immediate: true }
);

function change(event: Event) {
  setValue((event.target as HTMLInputElement).value);
}

function paste(event: ClipboardEvent) {
  const data = event.clipboardData?.getData("text");
  if (data && !/^-?(?:\d+|\d+\.\d+|\.\d+)(?:[eE][-+]?\d+)?$/.test(data)) {
    event.preventDefault();
  }
}

function decrease() {
  if (!decreasable.value) return;
  setValue((Number.isNaN(value.value) ? 0 : value.value) - props.step);
}

function increase() {
  if (!increasable.value) return;
  setValue((Number.isNaN(value.value) ? 0 : value.value) + props.step);
}

function setValue(next: number | string | undefined) {
  const previous = value.value;
  let parsed = typeof next === "number" ? next : parseFloat(next || "");

  if (!Number.isNaN(parsed)) {
    if (props.min <= props.max) {
      parsed = Math.min(props.max, Math.max(props.min, parsed));
    }
    if (props.rounded) {
      parsed = Math.round(parsed);
    }
  }

  value.value = parsed;
  if (parsed === previous && input.value) {
    input.value.value = String(parsed);
  }
  emit("update:modelValue", parsed, previous);
}
</script>
