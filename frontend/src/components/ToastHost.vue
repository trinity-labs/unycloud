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
  top: max(1.25em, env(safe-area-inset-top));
  left: 50%;
  z-index: 10000;
  width: min(24em, calc(100vw - 2.5em));
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.75em;
  pointer-events: none;
}

.toast {
  --toast-accent: #817cff;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 0.75em;
  min-height: 4em;
  padding: 0.75em;
  color: #f8f7ff;
  background: #181b24eb;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75em;
  backdrop-filter: blur(1.25em) saturate(140%);
  animation: toast-enter 240ms cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
  pointer-events: auto;
}

.toast::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: -1;
  height: 0.1875em;
  background: var(--toast-accent);
  transform-origin: left;
  animation: toast-timeout 5s linear both;
  content: "";
}

.toast--success {
  --toast-accent: #36d399;
}

.toast--error {
  --toast-accent: #ff6b7a;
}

.toast--rtl {
  direction: rtl;
}

.toast__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 2em;
  height: 2em;
  color: #171622;
  background: var(--toast-accent);
  border-radius: 0.625em;
}

.toast__icon i {
  font-size: 1em;
  font-weight: 700;
}

.toast__message {
  flex: 1;
  min-width: 0;
  font-size: 0.82em;
  font-weight: 600;
  line-height: 1.35;
  letter-spacing: 0.005em;
}

.toast__report {
  flex: 0 0 auto;
  color: var(--toast-accent);
  font-size: 0.8em;
  font-weight: 700;
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
  color: #aaa8b8;
  background: transparent;
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
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
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

:root:not(.dark) .toast {
  color: #29273a;
  background: #ffffffeb;
  border-color: rgba(53, 49, 86, 0.12);
}

:root:not(.dark) .toast--success {
  --toast-accent: #16845b;
}

:root:not(.dark) .toast--error {
  --toast-accent: #d7374b;
}

:root:not(.dark) .toast__icon {
  color: #fff;
}

:root:not(.dark) .toast__close {
  color: #777486;
}

:root:not(.dark) .toast__close:hover,
:root:not(.dark) .toast__close:focus-visible {
  color: #29273a;
  background: rgba(41, 39, 58, 0.08);
}

@keyframes toast-enter {
  from {
    opacity: 0;
    transform: translateY(-1.5em) scale(0.96);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes toast-timeout {
  from {
    transform: scaleX(1);
  }

  to {
    transform: scaleX(0);
  }
}

@media (width <= 480px) {
  .toast-host {
    top: max(0.625em, env(safe-area-inset-top));
    width: min(20em, calc(100vw - 2em));
  }

  .toast {
    gap: 0.625em;
    min-height: 3.25em;
    padding: 0.55em 0.625em;
    border-radius: 0.75em;
  }

  .toast__icon {
    width: 1.75em;
    height: 1.75em;
    border-radius: 0.5em;
  }

  .toast__icon i {
    font-size: 0.9em;
  }

  .toast__message {
    font-size: 0.76em;
  }

  .toast__close {
    width: 1.75em;
    height: 1.75em;
  }

  .toast__close i {
    font-size: 1.1em;
  }
}

@media (prefers-reduced-motion: reduce) {
  .toast {
    animation: none;
  }

  .toast::after {
    animation: none;
  }

  .toast__close {
    transition: none;
  }
}
</style>
