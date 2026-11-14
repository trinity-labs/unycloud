<template>
  <Action
    v-if="auth.user?.perm.download && nativeShare"
    icon="open_in_new"
    :label="t('reader.openWith')"
    @action="prepareShare"
  />
  <Action
    v-if="auth.user?.perm.download && auth.user?.perm.modify"
    icon="upload_file"
    :label="t('reader.importEdited')"
    @action="chooseEdited"
  />
  <Teleport to="body">
    <input ref="picker" type="file" hidden @change="selected" />
    <dialog
      ref="dialog"
      class="system-file-dialog"
      :aria-label="t('reader.openWith')"
      @close="reset"
      @cancel="cancel"
    >
      <h2>
        {{
          mode === "import" ? t("reader.importEdited") : t("reader.openWith")
        }}
      </h2>
      <p v-if="working" role="status">{{ t("files.loading") }}</p>
      <p v-if="failure" role="alert">{{ failure }}</p>
      <p v-if="file">{{ file.name }}</p>
      <p v-if="mode === 'import' && file">
        {{ t("reader.replaceConfirm", { name: targetName }) }}
      </p>
      <div class="system-file-buttons">
        <button
          class="button"
          type="button"
          :disabled="saving"
          @click="dialog?.close()"
        >
          {{ t("buttons.cancel") }}
        </button>
        <button
          v-if="file && !working"
          class="button"
          type="button"
          @click="mode === 'import' ? replaceFile() : shareFile()"
        >
          {{ mode === "import" ? t("buttons.save") : t("reader.openWith") }}
        </button>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useFileStore } from "@/stores/file";
import { files as api } from "@/api";
import Action from "@/components/header/Action.vue";

const props = defineProps<{ dirty?: boolean }>();
const { t } = useI18n();
const route = useRoute();
const auth = useAuthStore();
const store = useFileStore();
const nativeShare =
  typeof navigator.share === "function" &&
  typeof navigator.canShare === "function";
const dialog = ref<HTMLDialogElement>();
const picker = ref<HTMLInputElement>();
const mode = ref<"share" | "import">("share");
const file = ref<File>();
const working = ref(false);
const saving = ref(false);
const failure = ref("");
const targetName = ref("");
let target = "";
let controller: AbortController | undefined;
const limit = 32 * 1024 * 1024;

function reset() {
  controller?.abort();
  file.value = undefined;
  failure.value = "";
  working.value = false;
}
function cancel(event: Event) {
  if (saving.value) event.preventDefault();
}
function open(kind: "share" | "import") {
  reset();
  mode.value = kind;
  target = route.path;
  targetName.value = store.req?.name || "file";
  dialog.value?.showModal();
}
async function prepareShare() {
  if (!auth.user?.perm.download) return;
  open("share");
  if (props.dirty) {
    failure.value = t("reader.saveFirst");
    return;
  }
  if ((store.req?.size || 0) > limit) {
    failure.value = t("reader.tooLarge");
    return;
  }
  working.value = true;
  const request = new AbortController();
  controller = request;
  try {
    const result = await api.readBytes(target, limit, request.signal);
    if (result.truncated) throw new Error(t("reader.tooLarge"));
    const candidate = new File([result.bytes], targetName.value, {
      type: result.type.split(";")[0],
    });
    if (!navigator.canShare({ files: [candidate] }))
      throw new Error(t("reader.shareUnavailable"));
    file.value = candidate;
  } catch (error) {
    if (!request.signal.aborted) failure.value = (error as Error).message;
  } finally {
    if (!request.signal.aborted) working.value = false;
  }
}
async function shareFile() {
  if (!file.value) return;
  try {
    // A separate explicit click preserves transient activation after the download.
    await navigator.share({ files: [file.value] });
    dialog.value?.close();
  } catch (error) {
    if ((error as Error).name !== "AbortError")
      failure.value = t("reader.shareUnavailable");
  }
}
function chooseEdited() {
  if (!auth.user?.perm.modify || !auth.user?.perm.download) return;
  if (props.dirty) {
    open("import");
    failure.value = t("reader.saveFirst");
    return;
  }
  if (picker.value) {
    picker.value.value = "";
    picker.value.click();
  }
}
function selected() {
  const candidate = picker.value?.files?.[0];
  if (!candidate) return;
  open("import");
  if (candidate.size > limit) {
    failure.value = t("reader.tooLarge");
    return;
  }
  file.value = candidate;
}
async function replaceFile() {
  if (
    !file.value ||
    saving.value ||
    !auth.user?.perm.modify ||
    props.dirty ||
    target !== route.path
  )
    return;
  working.value = saving.value = true;
  try {
    await api.put(target, file.value);
    dialog.value?.close();
    store.reload = true;
  } catch (error) {
    failure.value = (error as Error).message;
  } finally {
    working.value = saving.value = false;
  }
}
onBeforeUnmount(() => {
  controller?.abort();
  dialog.value?.close();
});
</script>

<style scoped>
.system-file-dialog {
  width: min(28rem, calc(100% - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow: auto;
  padding: 1.25rem;
  border: 1px solid var(--divider);
  border-radius: 6px;
  background: var(--surfacePrimary);
  color: var(--textPrimary);
}
.system-file-dialog::backdrop {
  background: #0008;
}
.system-file-dialog h2 {
  font-size: 1.125rem;
  margin: 0 0 1rem;
}
.system-file-dialog p {
  overflow-wrap: anywhere;
}
.system-file-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}
</style>
