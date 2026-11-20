<template>
  <div class="toast-host" aria-live="polite" aria-atomic="false">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="toast"
      :class="[`toast--${toast.kind}`, { 'toast--rtl': toast.rtl }]"
      role="status"
    >
      <span class="toast__icon" aria-hidden="true">
        <i class="material-icons">{{
          toast.kind === "success" ? "check" : "priority_high"
        }}</i>
      </span>
      <span class="toast__message">{{ toast.message }}</span>
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
  top: max(1em, env(safe-area-inset-top));
  z-index: 10000;
  width: min(34em, calc(100vw - 2em));
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.625em;
  pointer-events: none;
}

.toast {
  --toast-accent: #5d5fef;
  --toast-accent-soft: rgba(93, 95, 239, 0.14);
  display: flex;
  align-items: center;
  gap: 0.875em;
  min-height: 4em;
  padding: 0.75em 0.75em 0.75em 0.875em;
  color: #242338;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(36, 35, 56, 0.1);
  border-left: 0.25em solid var(--toast-accent);
  border-radius: 0.75em;
  box-shadow:
    0 1em 2.5em rgba(26, 25, 56, 0.18),
    0 0.125em 0.5em rgba(26, 25, 56, 0.08);
  backdrop-filter: blur(1em);
  animation: toast-enter 180ms ease-out both;
  pointer-events: auto;
}

.toast--success {
  --toast-accent: #16845b;
  --toast-accent-soft: rgba(22, 132, 91, 0.13);
}

.toast--error {
  --toast-accent: #d04444;
  --toast-accent-soft: rgba(208, 68, 68, 0.13);
}

.toast--rtl {
  direction: rtl;
}

.toast__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 2.25em;
  height: 2.25em;
  color: var(--toast-accent);
  background: var(--toast-accent-soft);
  border-radius: 50%;
}

.toast__icon i {
  font-size: 1.25em;
}

.toast__message {
  flex: 1;
  min-width: 0;
  font-size: 0.95em;
  font-weight: 500;
  line-height: 1.4;
}

.toast__report {
  flex: 0 0 auto;
  color: var(--toast-accent);
  font-size: 0.875em;
  font-weight: 600;
  text-decoration: none;
}

.toast__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2em;
  height: 2em;
  padding: 0;
  margin: 0;
  color: #6c6a7d;
  background: rgba(36, 35, 56, 0.06);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  transition:
    color 120ms ease,
    background-color 120ms ease,
    transform 120ms ease;
}

.toast__close:hover,
.toast__close:focus-visible {
  color: #242338;
  background: rgba(36, 35, 56, 0.12);
}

.toast__close:active {
  transform: scale(0.92);
}

.toast__close:focus-visible {
  outline: 2px solid var(--toast-accent);
  outline-offset: 2px;
}

.toast__close i {
  font-size: 1.25em;
}

:global(:root.dark) .toast {
  color: #f5f4ff;
  background: rgba(28, 28, 42, 0.96);
  border-color: rgba(255, 255, 255, 0.1);
  border-left-color: var(--toast-accent);
  box-shadow:
    0 1em 2.5em rgba(0, 0, 0, 0.38),
    0 0.125em 0.5em rgba(0, 0, 0, 0.22);
}

:global(:root.dark) .toast__close {
  color: #b9b7ca;
  background: rgba(255, 255, 255, 0.08);
}

:global(:root.dark) .toast__close:hover,
:global(:root.dark) .toast__close:focus-visible {
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
}

@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateY(-0.75em) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (width <= 480px) {
  .toast-host {
    width: calc(100vw - 1.25em);
  }

  .toast {
    gap: 0.625em;
    padding: 0.625em;
    border-radius: 0.625em;
  }

  .toast__icon {
    width: 2em;
    height: 2em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast {
    animation: none;
  }

  .toast__close {
    transition: none;
  }
}
</style>
