<template>
  <div class="shell" :class="[shellClass, { ['shell--hidden']: !showShell }]">
    <div
      @pointerdown="startDrag()"
      @pointerup="stopDrag()"
      class="shell__divider"
      :class="{ 'shell__divider--dragging': shellDrag }"
    ></div>
    <div @click="focus" class="shell__content" ref="scrollable">
      <div v-for="(c, index) in content" :key="index" class="shell__result">
        <div class="shell__prompt">
          <i class="material-icons">chevron_right</i>
        </div>
        <pre class="shell__text">{{ c.text }}</pre>
      </div>

      <div
        class="shell__result"
        :class="{ 'shell__result--hidden': !canInput }"
      >
        <div class="shell__prompt">
          <i class="material-icons">chevron_right</i>
        </div>
        <pre
          tabindex="0"
          ref="input"
          class="shell__text"
          :contenteditable="true"
          @keydown.prevent.arrow-up="historyUp"
          @keydown.prevent.arrow-down="historyDown"
          @keypress.prevent.enter="submit"
        />
      </div>
    </div>
    <div
      @pointerup="stopDrag()"
      class="shell__overlay"
      v-if="this.shellDrag"
    ></div>
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";

import { commands } from "@/api";
import { throttle } from "lodash-es";
import { cssEm, getDynamicClass, upsertRule } from "@/utils/cspStyle";

export default {
  name: "shell",
  computed: {
    ...mapState(useLayoutStore, ["showShell"]),
    ...mapState(useFileStore, ["isFiles"]),
    path: function () {
      if (this.isFiles) {
        return this.$route.path;
      }

      return "";
    },
  },
  data: () => ({
    content: [],
    history: [],
    historyPos: 0,
    canInput: true,
    shellDrag: false,
    shellHeight: 25,
    shellClass: getDynamicClass("shell-height"),
    fontsize: parseFloat(getComputedStyle(document.documentElement).fontSize),
  }),
  mounted() {
    this.updateShellHeightRule();
    window.addEventListener("resize", this.resize);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.resize);
  },
  methods: {
    ...mapActions(useLayoutStore, ["toggleShell"]),
    updateShellHeightRule() {
      upsertRule(`.${this.shellClass}`, {
        height: cssEm(this.shellHeight, 2, 100),
      });
    },
    startDrag() {
      document.addEventListener("pointermove", this.handleDrag);
      this.shellDrag = true;
    },
    stopDrag() {
      document.removeEventListener("pointermove", this.handleDrag);
      this.shellDrag = false;
    },
    handleDrag: throttle(function (event) {
      const top = window.innerHeight / this.fontsize - 4;
      const userPos = (window.innerHeight - event.clientY) / this.fontsize;
      const bottom =
        2.25 +
        document.querySelector(".shell__divider").offsetHeight / this.fontsize;

      if (userPos <= top && userPos >= bottom) {
        this.shellHeight = userPos.toFixed(2);
        this.updateShellHeightRule();
      }
    }, 32),
    resize: throttle(function () {
      const top = window.innerHeight / this.fontsize - 4;
      const bottom =
        2.25 +
        document.querySelector(".shell__divider").offsetHeight / this.fontsize;

      if (this.shellHeight > top) {
        this.shellHeight = top;
      } else if (this.shellHeight < bottom) {
        this.shellHeight = bottom;
      }
      this.updateShellHeightRule();
    }, 32),
    scroll: function () {
      this.$refs.scrollable.scrollTop = this.$refs.scrollable.scrollHeight;
    },
    focus: function () {
      this.$refs.input.focus();
    },
    historyUp() {
      if (this.historyPos > 0) {
        this.$refs.input.innerText = this.history[--this.historyPos];
        this.focus();
      }
    },
    historyDown() {
      if (this.historyPos >= 0 && this.historyPos < this.history.length - 1) {
        this.$refs.input.innerText = this.history[++this.historyPos];
        this.focus();
      } else {
        this.historyPos = this.history.length;
        this.$refs.input.innerText = "";
      }
    },
    submit: function (event) {
      const cmd = event.target.innerText.trim();

      if (cmd === "") {
        return;
      }

      if (cmd === "clear") {
        this.content = [];
        event.target.textContent = "";
        return;
      }

      if (cmd === "exit") {
        event.target.textContent = "";
        this.toggleShell();
        return;
      }

      this.canInput = false;
      event.target.textContent = "";

      const results = {
        text: `${cmd}\n\n`,
      };

      this.history.push(cmd);
      this.historyPos = this.history.length;
      this.content.push(results);

      commands(
        this.path,
        cmd,
        (event) => {
          results.text += `${event.data}\n`;
          this.scroll();
        },
        () => {
          results.text = results.text

            .replace(/\u001b\[[0-9;]+m/g, "") // Filter ANSI color for now
            .trimEnd();
          this.canInput = true;
          this.$refs.input.focus();
          this.scroll();
        }
      );
    },
  },
};
</script>
