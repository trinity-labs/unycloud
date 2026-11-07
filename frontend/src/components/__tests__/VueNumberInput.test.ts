import { describe, expect, it, vi } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import VueNumberInput from "../VueNumberInput.vue";

vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));

describe("number input controls", () => {
  it("renders visible, keyboard-accessible controls and labels the input", async () => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(VueNumberInput, {
            controls: true,
            modelValue: 12,
            min: 1,
            id: "minimumPasswordLength",
          }),
      })
    );
    expect(html).toContain(">remove</i>");
    expect(html).toContain(">add</i>");
    expect(html).toMatch(/<input[^>]*id="minimumPasswordLength"/);
    expect(html).not.toMatch(/<div[^>]*id="minimumPasswordLength"/);
    expect(html).not.toContain('tabindex="-1"');
    expect(html).toContain('type="button"');
  });

  it.each([
    [1, "minus"],
    [20, "plus"],
  ])("disables the control at boundary %s", async (value, control) => {
    const html = await renderToString(
      createSSRApp({
        render: () =>
          h(VueNumberInput, {
            controls: true,
            modelValue: Number(value),
            min: 1,
            max: 20,
          }),
      })
    );
    expect(html).toMatch(
      new RegExp(`<button[^>]*button--${control}[^>]*disabled`)
    );
  });
});
