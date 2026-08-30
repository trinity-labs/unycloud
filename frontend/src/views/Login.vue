<template>
  <div id="login" :class="{ recaptcha: recaptcha }">
    <form
      method="post"
      :action="createMode ? '/api/signup' : '/api/login'"
      autocomplete="on"
      novalidate
      @submit="submit"
    >
      <img :src="logoURL" alt="UnyCloud" />
      <h1>
        <template v-if="loginBrandLink">
          <a
            :href="repositoryURL"
            target="_blank"
            rel="noopener noreferrer"
          >
            UnyCloud
          </a>
          <span>{{ loginBrandSuffix }}</span>
        </template>
        <template v-else>{{ name }}</template>
      </h1>
      <p v-if="reason != null" class="logout-message">
        {{ t(`login.logout_reasons.${reason}`) }}
      </p>
      <div v-if="error !== ''" class="wrong">{{ error }}</div>

      <label class="sr-only" for="username">{{ t("login.username") }}</label>
      <input
        autofocus
        id="username"
        name="username"
        class="input input--block"
        type="email"
        autocomplete="username"
        inputmode="text"
        enterkeyhint="next"
        :aria-label="t('login.username')"
        autocapitalize="off"
        autocorrect="off"
        spellcheck="false"
        v-model="username"
        :placeholder="t('login.username')"
      />
      <label class="sr-only" for="password">{{ t("login.password") }}</label>
      <input
        id="password"
        name="password"
        class="input input--block"
        type="password"
        :autocomplete="createMode ? 'new-password' : 'current-password'"
        enterkeyhint="done"
        :aria-label="t('login.password')"
        v-model="password"
        :placeholder="t('login.password')"
      />
      <label v-if="createMode" class="sr-only" for="password-confirm">
        {{ t("login.passwordConfirm") }}
      </label>
      <input
        id="password-confirm"
        name="passwordConfirm"
        class="input input--block"
        v-if="createMode"
        type="password"
        autocomplete="new-password"
        v-model="passwordConfirm"
        :placeholder="t('login.passwordConfirm')"
      />

      <div v-if="recaptcha" id="recaptcha"></div>
      <input
        class="button button--block"
        type="submit"
        :value="createMode ? t('login.signup') : t('login.submit')"
      />

      <p @click="toggleMode" v-if="signup">
        {{ createMode ? t("login.loginInstead") : t("login.createAnAccount") }}
      </p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { StatusError } from "@/api/utils";
import * as auth from "@/utils/auth";
import {
  name,
  logoURL,
  recaptcha,
  recaptchaKey,
  signup,
} from "@/utils/constants";
import { inject, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

// Define refs
const createMode = ref<boolean>(false);
const error = ref<string>("");
const username = ref<string>("");
const password = ref<string>("");
const passwordConfirm = ref<string>("");

const route = useRoute();
const router = useRouter();
const { t } = useI18n({});
// Define functions
const toggleMode = () => (createMode.value = !createMode.value);

const $showError = inject<IToastError>("$showError")!;

const reason = route.query["logout-reason"] ?? null;
const repositoryURL = "https://github.com/trinity-labs/unycloud";
const loginBrandPrefix = "UnyCloud - ";
const loginBrandLink = name.startsWith(loginBrandPrefix);
const loginBrandSuffix = loginBrandLink
  ? name.slice("UnyCloud".length)
  : "";

const safeRedirect = (value: unknown): string => {
  if (typeof value !== "string") return "/files/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/files/";
  if (/[\r\n]/.test(value)) return "/files/";
  return value;
};

const submit = async (event: Event) => {
  event.preventDefault();
  event.stopPropagation();

  const redirect = safeRedirect(route.query.redirect);

  let captcha = "";
  if (recaptcha) {
    captcha = window.grecaptcha.getResponse();

    if (captcha === "") {
      error.value = t("login.wrongCredentials");
      return;
    }
  }

  if (createMode.value) {
    if (password.value !== passwordConfirm.value) {
      error.value = t("login.passwordsDontMatch");
      return;
    }
  }

  try {
    if (createMode.value) {
      await auth.signup(username.value, password.value);
    }

    await auth.login(username.value, password.value, captcha);
    router.push({ path: redirect });
  } catch (e: any) {
    // console.error(e);
    if (e instanceof StatusError) {
      if (e.status === 409) {
        error.value = t("login.usernameTaken");
      } else if (e.status === 403) {
        error.value = t("login.wrongCredentials");
      } else if (e.status === 429) {
        $showError("429 Too Many Requests", false);
      } else if (e.status === 400) {
        const match = e.message.match(/minimum length is (\d+)/);
        if (match) {
          error.value = t("login.passwordTooShort", { min: match[1] });
        } else {
          error.value = e.message;
        }
      } else {
        $showError(e);
      }
    }
  }
};

// Run hooks
onMounted(() => {
  if (!recaptcha) return;

  window.grecaptcha.ready(function () {
    window.grecaptcha.render("recaptcha", {
      sitekey: recaptchaKey,
    });
  });
});
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
