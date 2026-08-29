<template>
  <div class="toast-host" aria-live="polite" aria-atomic="false">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :class="[`toast--${toast.kind}`, { 'toast--rtl': toast.rtl }]"
      role="status"
    >
      <span>{{ toast.message }}</span>
      <a
        v-if="toast.isReport"
        class="toast__report"
        href="https://github.com/trinity-labs/unycloud/issues/new/choose"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ toast.reportText }}
      </a>
      <button
        class="toast__close"
        type="button"
        aria-label="Close"
        @click="removeToast(toast.id)"
      >
        <i class="material-icons">close</i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { removeToast, toasts } from "@/utils/toast";
</script>

<style scoped>
.toast-host {
  position: fixed;
  left: 50%;
  bottom: 1em;
  z-index: 10000;
  width: min(32em, calc(100vw - 2em));
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.5em;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75em;
  padding: 0.75em 1em;
  color: #fff;
  background: #263238;
  border-radius: 0.25em;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.16),
    0 1px 2px rgba(0, 0, 0, 0.24);
  pointer-events: auto;
}

.toast--success {
  background: #2e7d32;
}

.toast--error {
  background: #c62828;
}

.toast--rtl {
  direction: rtl;
}

.toast span {
  flex: 1;
}

.toast__report {
  color: inherit;
  border-bottom: 1px solid currentColor;
}

.toast__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2em;
  height: 2em;
  padding: 0;
  margin: 0;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.toast__close i {
  font-size: 1.25em;
}
</style>
