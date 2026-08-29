<template>
  <div id="editor-container">
    <header-bar>
      <action icon="close" :label="t('buttons.close')" @action="close()" />
      <title>{{ fileStore.req?.name ?? "" }}</title>

      <action
        icon="add"
        @action="increaseFontSize"
        :label="t('buttons.increaseFontSize')"
      />
      <span class="editor-font-size">{{ fontSize }}px</span>
      <action
        icon="remove"
        @action="decreaseFontSize"
        :label="t('buttons.decreaseFontSize')"
      />

      <action
        v-if="authStore.user?.perm.modify"
        id="save-button"
        icon="save"
        :label="t('buttons.save')"
        @action="save()"
      />

      <action
        icon="preview"
        :label="t('buttons.preview')"
        @action="preview()"
        v-if="isMarkdownFile"
      />
    </header-bar>

    <div class="loading delayed" v-if="layoutStore.loading">
      <div class="spinner">
        <div class="bounce1"></div>
        <div class="bounce2"></div>
        <div class="bounce3"></div>
      </div>
    </div>
    <template v-else>
      <div class="editor-header">
        <Breadcrumbs base="/files" noLink />

        <div>
          <button
            :disabled="isSelectionEmpty"
            @click="executeEditorCommand('copy')"
          >
            <span><i class="material-icons">content_copy</i></span>
          </button>
          <button
            :disabled="isSelectionEmpty || isReadOnly"
            @click="executeEditorCommand('cut')"
          >
            <span><i class="material-icons">content_cut</i></span>
          </button>
          <button :disabled="isReadOnly" @click="executeEditorCommand('paste')">
            <span><i class="material-icons">content_paste</i></span>
          </button>
          <button @click="executeEditorCommand('selectAll')">
            <span><i class="material-icons">select_all</i></span>
          </button>
        </div>
      </div>

      <div
        :hidden="!isPreview || !isMarkdownFile"
        id="preview-container"
        class="md_preview"
        v-html="previewContent"
      ></div>
      <textarea
        :hidden="isPreview && isMarkdownFile"
        id="editor"
        ref="editorArea"
        v-model="content"
        :class="editorClass"
        :readonly="isReadOnly"
        spellcheck="false"
        autocapitalize="off"
        autocomplete="off"
        autocorrect="off"
        @select="refreshSelection"
        @keyup="refreshSelection"
        @click="refreshSelection"
        @input="refreshSelection"
      ></textarea>
    </template>
  </div>
</template>

<script setup lang="ts">
import { files as api } from "@/api";
import Breadcrumbs from "@/components/Breadcrumbs.vue";
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
import { onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";

const $showError = inject<IToastError>("$showError")!;

const fileStore = useFileStore();
const authStore = useAuthStore();
const layoutStore = useLayoutStore();

const { t } = useI18n();

const route = useRoute();
const router = useRouter();

const editorArea = ref<HTMLTextAreaElement | null>(null);
const editorClass = getDynamicClass("native-editor");
const fontSize = ref(parseInt(localStorage.getItem("editorFontSize") || "14"));
const content = ref(fileStore.req?.content || "");
const savedContent = ref(content.value);
const isPreview = ref(false);
const previewContent = ref("");
const isSelectionEmpty = ref(true);
const isReadOnly = computed(() => fileStore.req?.type === "textImmutable");

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

const focusEditor = async () => {
  await nextTick();
  editorArea.value?.focus();
  refreshSelection();
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

onMounted(() => {
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

  if (!layoutStore.loading) {
    focusEditor();
  } else {
    const unwatch = watchEffect(() => {
      if (!layoutStore.loading) {
        focusEditor();
        unwatch();
      }
    });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", keyEvent);
  window.removeEventListener("beforeunload", handlePageChange);
});

onBeforeRouteUpdate((to, from, next) => {
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
      await save();
      next();
    },
  });
});

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
  const button = "save";
  buttons.loading("save");

  try {
    await api.put(route.path, content.value);
    savedContent.value = content.value;
    buttons.success(button);
  } catch (e: any) {
    buttons.done(button);
    $showError(e);
    if (throwError) throw e;
  }
};

const increaseFontSize = () => {
  fontSize.value += 1;
  localStorage.setItem("editorFontSize", fontSize.value.toString());
};

const decreaseFontSize = () => {
  if (fontSize.value > 8) {
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
.editor-font-size {
  margin: 0 0.5em;
  color: var(--fg);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.editor-header > div > button {
  background: transparent;
  color: var(--action);
  border: none;
  outline: none;
  opacity: 0.8;
  cursor: pointer;
}

.editor-header > div > button:hover:not(:disabled) {
  opacity: 1;
}

.editor-header > div > button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.editor-header > div > button > span > i {
  font-size: 1.2rem;
}
</style>
