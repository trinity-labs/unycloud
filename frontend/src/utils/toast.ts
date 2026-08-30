import { reactive } from "vue";

export type ToastKind = "success" | "error";

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  message: string;
  isReport: boolean;
  reportText: string;
  timeout: number;
  rtl: boolean;
  timer?: number;
}

let nextToastID = 0;

export const toasts = reactive<ToastMessage[]>([]);

export function showToast(toast: Omit<ToastMessage, "id">) {
  for (const existing of toasts) {
    if (existing.timer !== undefined) {
      window.clearTimeout(existing.timer);
    }
  }
  toasts.splice(0);

  nextToastID += 1;
  const id = nextToastID;
  const timeout = 5000;
  const entry: ToastMessage = { ...toast, id, timeout };

  entry.timer = window.setTimeout(() => removeToast(id), timeout);
  toasts.push(entry);
}

export function removeToast(id: number) {
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index !== -1) {
    const toast = toasts[index];
    if (toast.timer !== undefined) {
      window.clearTimeout(toast.timer);
    }
    toasts.splice(index, 1);
  }
}
