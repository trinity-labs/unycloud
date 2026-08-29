<template>
  <video
    ref="videoElement"
    class="video-max"
    controls
    preload="auto"
    tabindex="0"
    :autoplay="autoplay"
    @play="$emit('play')"
  >
    <source :src="source" :type="sourceType" />
    <track
      kind="subtitles"
      v-for="(sub, index) in subtitles"
      :key="index"
      :src="sub"
      :label="subLabel(sub)"
      :default="index === 0"
    />
    <p>
      Sorry, your browser doesn't support embedded videos, but don't worry, you
      can <a :href="source">download it</a>
      and watch it with your favorite video player!
    </p>
  </video>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const videoElement = ref<HTMLVideoElement | null>(null);

const props = withDefaults(
  defineProps<{
    source: string;
    subtitles?: string[];
    options?: { autoplay?: boolean };
  }>(),
  {
    subtitles: () => [],
    options: () => ({}),
  }
);

defineEmits<{
  play: [];
}>();

const autoplay = computed(() => Boolean(props.options?.autoplay));

const sourceType = computed(() => {
  const fileExtension = props.source
    ? props.source.split("?")[0].split(".").pop()
    : "";
  if (fileExtension?.toLowerCase() === "mkv") {
    return "video/mp4";
  }
  return "";
});

const subLabel = (subUrl: string) => {
  let url: URL;
  try {
    url = new URL(subUrl);
  } catch {
    url = new URL(subUrl, window.location.origin);
  }

  return decodeURIComponent(
    url.pathname
      .split("/")
      .pop()!
      .replace(/\.[^/.]+$/, "")
  );
};

defineExpose({
  get paused() {
    return videoElement.value?.paused ?? true;
  },
  get ended() {
    return videoElement.value?.ended ?? true;
  },
});
</script>

<style scoped>
.video-max {
  width: 100%;
  height: 100%;
}
</style>
