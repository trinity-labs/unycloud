import { disableExternal } from "@/utils/constants";
import { createApp } from "vue";
import VueLazyload from "vue-lazyload";
import createPinia from "@/stores";
import router from "@/router";
import i18n, { isRtl } from "@/i18n";
import App from "@/App.vue";
import VueNumberInput from "@/components/VueNumberInput.vue";
import { showToast } from "@/utils/toast";

import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";

import "./css/styles.css";

// register dayjs plugins globally
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(duration);

const pinia = createPinia(router);

const app = createApp(App);

app.component(VueNumberInput.name || "vue-number-input", VueNumberInput);
app.use(VueLazyload);

app.use(i18n);
app.use(pinia);
app.use(router);

app.mixin({
  mounted() {
    // expose vue instance to components
    this.$el.__vue__ = this;
  },
});

// provide v-focus for components
app.directive("focus", {
  mounted: async (el) => {
    // initiate focus for the element
    el.focus();
  },
});

app.provide("$showSuccess", (message: string) => {
  showToast({
    kind: "success",
    message,
    isReport: false,
    reportText: "",
    timeout: 4000,
    rtl: isRtl(),
  });
});

app.provide("$showError", (error: Error | string, displayReport = true) => {
  showToast({
    kind: "error",
    message: (error as Error).message || String(error),
    isReport: !disableExternal && displayReport,
    reportText: i18n.global.t("buttons.reportIssue"),
    timeout: 0,
    rtl: isRtl(),
  });
});

router.isReady().then(() => app.mount("#app"));
