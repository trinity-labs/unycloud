<template>
  <header>
    <router-link
      class="header-home"
      to="/files/"
      :aria-label="t('sidebar.myFiles')"
      :title="t('sidebar.myFiles')"
      @click="layoutStore.closeHovers"
    >
      <img v-if="showLogo" :src="logoURL" alt="UnyCloud" />
    </router-link>
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
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <clipPath :id="autoSunClipId">
              <path
                clip-rule="evenodd"
                d="M0 0H24V24H0Z M24 18.5a5.5 5.5 0 1 0-11 0a5.5 5.5 0 1 0 11 0Z"
              />
            </clipPath>
          </defs>
          <!-- Original Material Icons light_mode geometry, shared with Light. -->
          <path
            fill="currentColor"
            :clip-path="`url(#${autoSunClipId})`"
            d="M12,7c-2.76,0-5,2.24-5,5s2.24,5,5,5s5-2.24,5-5S14.76,7,12,7L12,7z M2,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S1.45,13,2,13z M20,13l2,0c0.55,0,1-0.45,1-1s-0.45-1-1-1l-2,0c-0.55,0-1,0.45-1,1S19.45,13,20,13z M11,2v2c0,0.55,0.45,1,1,1s1-0.45,1-1V2c0-0.55-0.45-1-1-1S11,1.45,11,2z M11,20v2c0,0.55,0.45,1,1,1s1-0.45,1-1v-2c0-0.55-0.45-1-1-1C11.45,19,11,19.45,11,20z M5.99,4.58c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0s0.39-1.03,0-1.41L5.99,4.58z M18.36,16.95c-0.39-0.39-1.03-0.39-1.41,0c-0.39,0.39-0.39,1.03,0,1.41l1.06,1.06c0.39,0.39,1.03,0.39,1.41,0c0.39-0.39,0.39-1.03,0-1.41L18.36,16.95z M19.42,5.99c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L19.42,5.99z M7.05,18.36c0.39-0.39,0.39-1.03,0-1.41c-0.39-0.39-1.03-0.39-1.41,0l-1.06,1.06c-0.39,0.39-0.39,1.03,0,1.41s1.03,0.39,1.41,0L7.05,18.36z"
          />
          <path
            fill="currentColor"
            fill-rule="evenodd"
            d="M23 18.5a4.5 4.5 0 1 1-9 0a4.5 4.5 0 1 1 9 0ZM18.5 15.2a3.3 3.3 0 0 0 0 6.6Z"
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
import { computed, ref, useId, useSlots } from "vue";
import { useI18n } from "vue-i18n";

defineProps<{
  showLogo?: boolean;
  showMenu?: boolean;
}>();

const layoutStore = useLayoutStore();
const slots = useSlots();
const autoSunClipId = useId();

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
.header-home {
  position: absolute;
  top: 0;
  left: 0;
  width: 4rem;
  height: 100%;
  border-radius: 4px;
  transition: backdrop-filter 150ms ease;
}

.header-home:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: -4px;
}

/* The logo can be supplied by private header background branding. */
@media (hover: hover) and (pointer: fine) {
  .header-home:hover {
    -webkit-backdrop-filter: brightness(0.65);
    backdrop-filter: brightness(0.65);
  }
}

@media (prefers-reduced-motion: reduce) {
  .header-home {
    transition: none;
  }
}

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
