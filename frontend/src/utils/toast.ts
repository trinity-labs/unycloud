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
  const existing = toasts.find(
    (item) =>
      item.kind === toast.kind &&
      item.message === toast.message &&
      item.isReport === toast.isReport &&
      item.reportText === toast.reportText
  );

  if (existing) {
    existing.timeout = toast.timeout;
    existing.rtl = toast.rtl;
    if (existing.timer !== undefined) {
      window.clearTimeout(existing.timer);
      existing.timer = undefined;
    }
    if (toast.timeout > 0) {
      existing.timer = window.setTimeout(() => removeToast(existing.id), toast.timeout);
    }
    return;
  }

  nextToastID += 1;
  const id = nextToastID;
  const entry: ToastMessage = { ...toast, id };

  if (toast.timeout > 0) {
    entry.timer = window.setTimeout(() => removeToast(id), toast.timeout);
  }
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
