<template>
  <div id="editor-container">
    <header-bar>
      <action icon="close" :label="t('buttons.close')" @action="close()" />
      <title>{{ fileStore.req?.name ?? "" }}</title>

      <template #actions>
        <action
          v-if="authStore.user?.perm.rename"
          :disabled="dirty || saving"
          icon="mode_edit"
          :label="t('buttons.rename')"
          show="rename"
        />
        <action
          v-if="!isReadOnly"
          :disabled="loading || saving || !dirty"
          id="save-button"
          icon="save"
          :label="t('buttons.save')"
          @action="save()"
        />

        <action
          v-if="authStore.user?.perm.download"
          icon="file_download"
          :label="t('buttons.download')"
          @action="api.download(null, route.path)"
        />
        <SystemFileActions :dirty="dirty" />
        <action
          v-if="authStore.user?.perm.delete"
          :disabled="dirty || saving"
          icon="delete"
          :label="t('buttons.delete')"
          @action="
            layoutStore.showHover({ prompt: 'delete', confirm: finishClose })
          "
        />
        <action icon="info" :label="t('buttons.info')" show="info" />

        <action
          icon="preview"
          :label="t('buttons.preview')"
          @action="preview()"
          v-if="isMarkdownFile"
        />
      </template>
    </header-bar>

    <div class="loading delayed" v-if="layoutStore.loading || loading">
      <div class="spinner">
        <div class="bounce1"></div>
        <div class="bounce2"></div>
        <div class="bounce3"></div>
      </div>
    </div>
    <template v-else>
      <div class="editor-tools" :aria-label="t('reader.controls')">
        <button
          :title="t('pdf.zoomOut')"
          :aria-label="t('pdf.zoomOut')"
          @click="decreaseFontSize"
        >
          <i class="material-icons">zoom_out</i>
        </button>
        <span>{{ fontSize }}px</span>
        <button
          :title="t('pdf.zoomIn')"
          :aria-label="t('pdf.zoomIn')"
          @click="increaseFontSize"
        >
          <i class="material-icons">zoom_in</i>
        </button>
        <select
          v-if="!binary"
          v-model="language"
          :aria-label="t('reader.language')"
        >
          <option value="plaintext">{{ t("reader.plainText") }}</option>
          <option
            v-for="item in codeLanguages.filter((item) => item !== 'plaintext')"
            :key="item"
            :value="item"
          >
            {{ item }}
          </option>
        </select>
        <span v-if="binary">{{ t("reader.binary") }}</span>
        <div class="editor-clipboard">
          <button
            :disabled="isSelectionEmpty"
            :title="t('buttons.copy')"
            :aria-label="t('buttons.copy')"
            @click="executeEditorCommand('copy')"
          >
            <span><i class="material-icons">content_copy</i></span>
          </button>
          <button
            :disabled="isSelectionEmpty || isReadOnly"
            :title="t('reader.cut')"
            :aria-label="t('reader.cut')"
            @click="executeEditorCommand('cut')"
          >
            <span><i class="material-icons">content_cut</i></span>
          </button>
          <button
            :disabled="isReadOnly"
            :title="t('reader.paste')"
            :aria-label="t('reader.paste')"
            @click="executeEditorCommand('paste')"
          >
            <span><i class="material-icons">content_paste</i></span>
          </button>
          <button
            :title="t('reader.selectAll')"
            :aria-label="t('reader.selectAll')"
            @click="executeEditorCommand('selectAll')"
          >
            <span><i class="material-icons">select_all</i></span>
          </button>
        </div>
      </div>

      <p v-if="loadError" role="alert" class="reader-status">{{ loadError }}</p>
      <p v-if="binary" class="reader-status">{{ t("reader.binaryNotice") }}</p>

      <div
        :hidden="!isPreview || !isMarkdownFile"
        id="preview-container"
        class="md_preview"
        v-html="previewContent"
      ></div>
      <div
        :hidden="isPreview && isMarkdownFile"
        class="code-surface"
        :class="editorClass"
      >
        <pre
          ref="codeLayer"
          class="code-layer hljs"
          aria-hidden="true"
        ><code v-html="highlighted"></code></pre>
        <textarea
          id="editor"
          ref="editorArea"
          v-model="content"
          :class="editorClass"
          :readonly="isReadOnly || saving"
          :aria-label="fileStore.req?.name"
          wrap="off"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
          @select="refreshSelection"
          @keyup="refreshSelection"
          @click="refreshSelection"
          @input="refreshSelection"
          @scroll="syncScroll"
        ></textarea>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { files as api } from "@/api";
import SystemFileActions from "@/components/files/SystemFileActions.vue";
import Action from "@/components/header/Action.vue";
import HeaderBar from "@/components/header/HeaderBar.vue";
import { useAuthStore } from "@/stores/auth";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { read, copy } from "@/utils/clipboard";
import { cssPx, getDynamicClass, upsertRule } from "@/utils/cspStyle";
import buttons from "@/utils/buttons";
import url from "@/utils/url";
import DOMPurify from "dompurify";
import {
  codeLanguage,
  codeLanguages,
  decodeEditableText,
  hexDump,
  highlightCode,
} from "@/utils/code";
import "highlight.js/styles/monokai.css";
import { marked } from "marked";
import markedKatex from "marked-katex-extension";
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watchEffect,
} from "vue";
import { useI18n } from "vue-i18n";
import {
  onBeforeRouteLeave,
  onBeforeRouteUpdate,
  useRoute,
  useRouter,
} from "vue-router";

const $showError = inject<IToastError>("$showError")!;

const fileStore = useFileStore();
const authStore = useAuthStore();
const layoutStore = useLayoutStore();

const { t } = useI18n();

const route = useRoute();
const router = useRouter();

const editorArea = ref<HTMLTextAreaElement | null>(null);
const codeLayer = ref<HTMLElement | null>(null);
const loading = ref(true);
const saving = ref(false);
const loadError = ref("");
const binary = ref(false);
const controller = new AbortController();
const language = ref(codeLanguage(fileStore.req?.name || ""));
const editorClass = getDynamicClass("native-editor");
const fontSize = ref(
  Math.max(
    12,
    Math.min(32, Number(localStorage.getItem("editorFontSize")) || 16)
  )
);
const content = ref("");
const savedContent = ref(content.value);
let lineEnding = "\n";
const isPreview = ref(false);
const previewContent = ref("");
const isSelectionEmpty = ref(true);
const isReadOnly = computed(
  () =>
    loading.value ||
    binary.value ||
    !!loadError.value ||
    !authStore.user?.perm.modify ||
    !authStore.user?.perm.download ||
    fileStore.req?.type === "textImmutable"
);
const highlighted = computed(() =>
  DOMPurify.sanitize(highlightCode(content.value, language.value) + "\n", {
    ALLOWED_TAGS: ["span"],
    ALLOWED_ATTR: ["class"],
  })
);
const syncScroll = () => {
  if (codeLayer.value && editorArea.value) {
    codeLayer.value.scrollTop = editorArea.value.scrollTop;
    codeLayer.value.scrollLeft = editorArea.value.scrollLeft;
  }
};

const isMarkdownFile =
  fileStore.req?.name.endsWith(".md") ||
  fileStore.req?.name.endsWith(".markdown");
const katexOptions = {
  output: "mathml" as const,
  throwOnError: false,
};
const markdownURIPattern =
  /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i;
marked.use(markedKatex(katexOptions));

watchEffect(() => {
  upsertRule(`.${editorClass}`, {
    "font-size": cssPx(fontSize.value, 8, 72),
  });
});

const dirty = computed(() => content.value !== savedContent.value);

const refreshSelection = () => {
  const area = editorArea.value;
  isSelectionEmpty.value =
    area === null || area.selectionStart === area.selectionEnd;
};

const replaceSelection = (replacement: string) => {
  const area = editorArea.value;
  if (!area || isReadOnly.value) {
    return;
  }

  const start = area.selectionStart;
  const end = area.selectionEnd;
  content.value =
    content.value.slice(0, start) + replacement + content.value.slice(end);

  nextTick(() => {
    area.selectionStart = start + replacement.length;
    area.selectionEnd = start + replacement.length;
    refreshSelection();
  });
};

const executeEditorCommand = (name: string) => {
  const area = editorArea.value;
  if (!area) {
    return;
  }

  const selectedText = content.value.slice(
    area.selectionStart,
    area.selectionEnd
  );

  if (name === "selectAll") {
    area.select();
    refreshSelection();
    return;
  }

  if (name === "copy") {
    copy({ text: selectedText });
    return;
  }

  if (name === "cut") {
    copy({ text: selectedText });
    replaceSelection("");
    return;
  }

  if (name === "paste") {
    read()
      .then((data) => replaceSelection(data))
      .catch((e) => {
        console.warn("the clipboard api is not supported", e);
      });
  }
};

onMounted(async () => {
  window.addEventListener("keydown", keyEvent);
  window.addEventListener("beforeunload", handlePageChange);

  watchEffect(async () => {
    if (isMarkdownFile && isPreview.value) {
      try {
        previewContent.value = DOMPurify.sanitize(await marked(content.value), {
          FORBID_ATTR: ["style"],
          FORBID_TAGS: ["style"],
          ALLOWED_URI_REGEXP: markdownURIPattern,
        });
      } catch (error) {
        console.error("Failed to convert content to HTML:", error);
        previewContent.value = "";
      }
    }
  });

  try {
    if (!authStore.user?.perm.download)
      throw new Error(t("reader.noReadPermission"));
    const size = fileStore.req?.size || 0;
    const result = await api.readBytes(
      route.path,
      size > 10 * 1024 * 1024 ? 4096 : 10 * 1024 * 1024,
      controller.signal
    );
    const text = result.truncated ? null : decodeEditableText(result.bytes);
    binary.value = text === null;
    if (binary.value) language.value = "plaintext";
    content.value = text ?? hexDump(result.bytes.slice(0, 4096));
    lineEnding =
      text?.includes("\r\n") && !/(?<!\r)\n/.test(text) ? "\r\n" : "\n";
    savedContent.value = content.value;
  } catch (error) {
    if (!controller.signal.aborted) loadError.value = (error as Error).message;
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  controller.abort();
  window.removeEventListener("keydown", keyEvent);
  window.removeEventListener("beforeunload", handlePageChange);
});

const guardChanges: Parameters<typeof onBeforeRouteUpdate>[0] = (
  to,
  from,
  next
) => {
  if (!dirty.value) {
    next();

    return;
  }

  layoutStore.showHover({
    prompt: "discardEditorChanges",
    confirm: (event: Event) => {
      event.preventDefault();
      next();
    },
    saveAction: async () => {
      await save(true);
      next();
    },
  });
};
onBeforeRouteUpdate(guardChanges);
onBeforeRouteLeave(guardChanges);

const keyEvent = (event: KeyboardEvent) => {
  if (event.code === "Escape") {
    close();
  }

  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  if (event.key !== "s") {
    return;
  }

  event.preventDefault();
  save();
};

const handlePageChange = (event: BeforeUnloadEvent) => {
  if (dirty.value) {
    event.preventDefault();
    event.returnValue = true;
  }
};

const save = async (throwError?: boolean) => {
  if (isReadOnly.value || saving.value || !dirty.value) return;
  const snapshot = content.value;
  saving.value = true;
  const button = "save";
  buttons.loading("save");

  try {
    await api.put(route.path, snapshot.replace(/\r?\n/g, lineEnding));
    savedContent.value = snapshot;
    buttons.success(button);
  } catch (e: any) {
    buttons.done(button);
    $showError(e);
    if (throwError) throw e;
  } finally {
    saving.value = false;
  }
};

const increaseFontSize = () => {
  fontSize.value = Math.min(32, fontSize.value + 1);
  localStorage.setItem("editorFontSize", fontSize.value.toString());
};

const decreaseFontSize = () => {
  if (fontSize.value > 12) {
    fontSize.value -= 1;
    localStorage.setItem("editorFontSize", fontSize.value.toString());
  }
};

const close = () => {
  if (dirty.value) {
    layoutStore.showHover({
      prompt: "discardEditorChanges",
      confirm: (event: Event) => {
        event.preventDefault();
        savedContent.value = content.value;
        finishClose();
      },
      saveAction: async () => {
        try {
          await save(true);
          finishClose();
        } catch {}
      },
    });
    return;
  }
  finishClose();
};

const finishClose = () => {
  const uri = url.removeLastDir(route.path) + "/";
  router.push({ path: uri });
};

const preview = () => {
  isPreview.value = !isPreview.value;
};
</script>

<style scoped>
.editor-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 4px;
  flex-shrink: 0;
  background: var(--surfacePrimary);
  border-bottom: 1px solid var(--divider);
}
.editor-tools button {
  width: 36px;
  height: 40px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  padding: 0;
  background: transparent;
  color: var(--textPrimary);
  border: 0;
  border-radius: 4px;
  cursor: pointer;
}
.editor-tools button:hover {
  background: var(--surfaceSecondary);
}
.editor-tools button:disabled {
  opacity: 0.35;
  cursor: default;
}
.editor-tools button i {
  font-size: 20px;
}
.editor-tools select {
  width: 6.25rem;
  max-width: 100%;
  min-width: 0;
  padding: 0.25rem;
  color: var(--textPrimary);
  background: var(--background);
  border: 1px solid var(--divider);
}
.editor-clipboard {
  display: inline-flex;
  gap: 2px;
}
.editor-tools span {
  font-size: 0.875rem;
}
.reader-status {
  margin: 0;
  padding: 0.5rem 1rem;
  overflow-wrap: anywhere;
}
.code-surface {
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  background: #272822;
}
.code-surface[hidden] {
  display: none;
}
#editor-container .code-surface #editor,
.code-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 1rem;
  border: 0;
  border-radius: 0;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
  font-size: inherit;
  font-weight: normal;
  line-height: 1.45;
  letter-spacing: 0;
  tab-size: 2;
  white-space: pre;
  box-sizing: border-box;
}
#editor-container .code-surface #editor {
  background: transparent !important;
  color: transparent !important;
  -webkit-text-fill-color: transparent;
  caret-color: #f8f8f2;
  resize: none;
}
#editor-container .code-surface #editor::selection {
  background: #75715e88;
}
.code-layer {
  overflow: hidden;
  pointer-events: none;
  color: #f8f8f2;
}
.code-layer :deep(code),
.code-layer :deep(span) {
  font: inherit;
}
#editor-container {
  height: 100dvh;
  padding-top: calc(4rem + env(safe-area-inset-top, 0px));
}
#editor-container :deep(header) {
  height: calc(4rem + env(safe-area-inset-top, 0px));
  padding-top: calc(0.5rem + env(safe-area-inset-top, 0px));
}
#editor-container :deep(header title) {
  min-width: 0;
}
@media (max-width: 737px) {
  #editor-container :deep(header title) {
    padding: 0 0.5rem;
    font-size: 1rem;
  }
}
</style>
