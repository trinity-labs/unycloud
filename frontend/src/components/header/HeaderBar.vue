<template>
  <header>
    <img v-if="showLogo" :src="logoURL" alt="UnyCloud" />
    <Action
      v-if="showMenu"
      class="menu-button"
      icon="menu"
      :label="t('buttons.toggleSidebar')"
      @action="layoutStore.showHover('sidebar')"
    />

    <slot />

    <Action
      class="theme-button"
      :icon="themeIcon"
      :label="themeLabel"
      @action="toggleHeaderTheme"
    />

    <div
      id="dropdown"
      :class="{ active: layoutStore.currentPromptName === 'more' }"
    >
      <slot name="actions" />
    </div>

    <Action
      v-if="ifActionsSlot"
      id="more"
      icon="more_vert"
      :label="t('buttons.more')"
      @action="layoutStore.showHover('more')"
    />

    <div
      class="overlay"
      v-if="layoutStore.currentPromptName == 'more'"
      @click="layoutStore.closeHovers"
    />
  </header>
</template>

<script setup lang="ts">
import { useLayoutStore } from "@/stores/layout";

import { logoURL } from "@/utils/constants";
import { getThemePreference, toggleTheme } from "@/utils/theme";

import Action from "@/components/header/Action.vue";
import { computed, ref, useSlots } from "vue";
import { useI18n } from "vue-i18n";

defineProps<{
  showLogo?: boolean;
  showMenu?: boolean;
}>();

const layoutStore = useLayoutStore();
const slots = useSlots();

const { t } = useI18n();

const ifActionsSlot = computed(() => (slots.actions ? true : false));
const activeTheme = ref(getThemePreference() || "light");
const themeIcon = computed(() =>
  activeTheme.value === "auto"
    ? "brightness_4"
    : activeTheme.value === "dark"
      ? "dark_mode"
      : "light_mode"
);
const themeLabel = computed(() =>
  activeTheme.value === "auto"
    ? `${t("settings.themes.title")}: Auto (08:00 / 20:00)`
    : activeTheme.value === "light"
      ? `${t("settings.themes.title")}: ${t("settings.themes.light")}`
      : `${t("settings.themes.title")}: ${t("settings.themes.dark")}`
);
const toggleHeaderTheme = () => {
  toggleTheme();
  activeTheme.value = getThemePreference() || "light";
};
</script>

<style></style>
