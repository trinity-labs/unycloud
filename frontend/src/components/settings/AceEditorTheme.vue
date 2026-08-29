<template>
  <select
    name="selectAceEditorTheme"
    v-on:change="change"
    :value="aceEditorTheme"
  >
    <option v-for="theme in themes" :value="theme.theme" :key="theme.theme">
      {{ theme.name }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { type SelectHTMLAttributes } from "vue";

const themes = [
  { name: "Chrome", theme: "chrome" },
  { name: "Clouds", theme: "clouds" },
  { name: "Crimson Editor", theme: "crimson_editor" },
  { name: "Dawn", theme: "dawn" },
  { name: "Dreamweaver", theme: "dreamweaver" },
  { name: "Eclipse", theme: "eclipse" },
  { name: "GitHub", theme: "github" },
  { name: "IPlastic", theme: "iplastic" },
  { name: "Solarized Light", theme: "solarized_light" },
  { name: "TextMate", theme: "textmate" },
  { name: "Tomorrow", theme: "tomorrow" },
  { name: "Xcode", theme: "xcode" },
  { name: "Ambiance", theme: "ambiance" },
  { name: "Chaos", theme: "chaos" },
  { name: "Clouds Midnight", theme: "clouds_midnight" },
  { name: "Cobalt", theme: "cobalt" },
  { name: "Dracula", theme: "dracula" },
  { name: "Gob", theme: "gob" },
  { name: "Gruvbox", theme: "gruvbox" },
  { name: "Merbivore", theme: "merbivore" },
  { name: "Mono Industrial", theme: "mono_industrial" },
  { name: "Monokai", theme: "monokai" },
  { name: "Pastel On Dark", theme: "pastel_on_dark" },
  { name: "Solarized Dark", theme: "solarized_dark" },
  { name: "Terminal", theme: "terminal" },
  { name: "Tomorrow Night", theme: "tomorrow_night" },
  { name: "Twilight", theme: "twilight" },
];

defineProps<{
  aceEditorTheme: string;
}>();

const emit = defineEmits<{
  (e: "update:aceEditorTheme", val: string | null): void;
}>();

const change = (event: Event) => {
  emit("update:aceEditorTheme", (event.target as SelectHTMLAttributes)?.value);
};
</script>
