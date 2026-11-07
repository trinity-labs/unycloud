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
    >
      <template v-if="activeTheme === 'auto'" #icon>
        <svg
          class="auto-theme-icon"
          viewBox="-1 -1 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            fill="currentColor"
            d="M16.25 10.7A5.75 5.75 0 1 0 10.7 16.25A6.3 6.3 0 0 1 16.25 10.7Z"
          />
          <path
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
            d="M10.5 1.2v2M5.85 2.45l1 1.73M2.45 5.85l1.73 1M1.2 10.5h2M2.45 15.15l1.73-1M5.85 18.55l1-1.73M10.5 19.8v-2M15.15 2.45l-1 1.73M18.55 5.85l-1.73 1M19.8 10.5h-2"
          />
          <path
            fill="currentColor"
            fill-rule="evenodd"
            d="M21.5 17a4.5 4.5 0 1 1-9 0a4.5 4.5 0 1 1 9 0ZM17 13.7a3.3 3.3 0 0 0 0 6.6Z"
          />
        </svg>
      </template>
    </Action>

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

<style scoped>
.theme-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 3rem;
  flex-shrink: 0;
}

.auto-theme-icon {
  display: block;
  width: 1.33rem;
  height: 1.33rem;
  flex-shrink: 0;
  opacity: 0.66;
}

.theme-button:focus-visible .auto-theme-icon {
  opacity: 1;
}
</style>
