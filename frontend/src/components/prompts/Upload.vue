<template>
  <div class="card floating upload-choice-dialog">
    <div class="card-title">
      <h2>{{ t("prompts.upload") }}</h2>
    </div>

    <div class="card-content">
      <p>{{ t("prompts.uploadMessage") }}</p>
    </div>

    <div class="upload-options">
      <button
        type="button"
        @click="uploadFile"
        class="upload-choice"
        id="focus-prompt"
      >
        <i class="material-icons" aria-hidden="true">insert_drive_file</i>
        <span>{{ t("buttons.file") }}</span>
      </button>
      <button type="button" @click="uploadFolder" class="upload-choice">
        <i class="material-icons" aria-hidden="true">folder</i>
        <span>{{ t("buttons.folder") }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import { useLayoutStore } from "@/stores/layout";

import * as upload from "@/utils/upload";
import buttons from "@/utils/buttons";

const { t } = useI18n();
const route = useRoute();

const layoutStore = useLayoutStore();

// TODO: this is a copy of the same function in FileListing.vue
const uploadInput = async (event: Event) => {
  const files = (event.currentTarget as HTMLInputElement)?.files;
  if (files === null) return;

  const folder_upload = !!files[0].webkitRelativePath;

  const uploadFiles: UploadList = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = folder_upload ? file.webkitRelativePath : undefined;
    uploadFiles.push({
      file,
      name: file.name,
      size: file.size,
      isDir: false,
      fullPath,
    });
  }

  const path = route.path.endsWith("/") ? route.path : route.path + "/";

  // Checking the destination hits the server, so show it is working rather
  // than leaving the action looking inert until the upload starts.
  buttons.loading("upload");
  const conflict = await upload.checkConflict(uploadFiles, path);

  if (conflict.length > 0) {
    buttons.done("upload");
    layoutStore.showHover({
      prompt: "resolve-conflict",
      props: {
        conflict: conflict,
        isUploadAction: true,
      },
      confirm: (event: Event, result: Array<ConflictingResource>) => {
        event.preventDefault();
        layoutStore.closeHovers();
        for (let i = result.length - 1; i >= 0; i--) {
          const item = result[i];
          if (item.checked.length == 2) {
            continue;
          } else if (item.checked.length == 1 && item.checked[0] == "origin") {
            uploadFiles[item.index].overwrite = true;
          } else {
            uploadFiles.splice(item.index, 1);
          }
        }
        if (uploadFiles.length > 0) {
          upload.handleFiles(uploadFiles, path);
        }
      },
    });

    return;
  }

  upload.handleFiles(uploadFiles, path);
};

const openUpload = (isFolder: boolean) => {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.webkitdirectory = isFolder;
  // TODO: call the function in FileListing.vue instead
  input.onchange = uploadInput;
  input.click();
};

const uploadFile = () => {
  openUpload(false);
};
const uploadFolder = () => {
  openUpload(true);
};
</script>

<style scoped>
.upload-choice-dialog {
  width: min(24rem, calc(100vw - 2rem));
}

.upload-choice-dialog .card-title h2 {
  font-size: 1.125rem;
  font-weight: 500;
}

.upload-options {
  display: grid;
  gap: 0.5rem;
  padding: 0 1rem 1rem;
}

.upload-choice {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  min-height: 44px;
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--borderPrimary);
  border-radius: 4px;
  background: var(--surfaceSecondary);
  color: var(--textPrimary);
  font: inherit;
  font-size: 0.875rem;
  text-align: start;
  cursor: pointer;
}

.upload-choice i {
  flex: 0 0 1.25rem;
  font-size: 1.25rem;
  color: #5a52c8;
}

.upload-choice span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.upload-choice:hover,
.upload-choice:focus-visible {
  background: #f0effa;
  border-color: #5a52c8;
}

.upload-choice:focus-visible {
  outline: 2px solid #5a52c8;
  outline-offset: 2px;
}

:root.dark .upload-choice i {
  color: #a39cff;
}

:root.dark .upload-choice:hover,
:root.dark .upload-choice:focus-visible {
  background: #282c3b;
  border-color: #a39cff;
}
</style>
