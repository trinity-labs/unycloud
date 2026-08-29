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
}

let nextToastID = 0;

export const toasts = reactive<ToastMessage[]>([]);

export function showToast(toast: Omit<ToastMessage, "id">) {
  nextToastID += 1;
  const id = nextToastID;
  toasts.push({ ...toast, id });

  if (toast.timeout > 0) {
    window.setTimeout(() => removeToast(id), toast.timeout);
  }
}

export function removeToast(id: number) {
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index !== -1) {
    toasts.splice(index, 1);
  }
}
