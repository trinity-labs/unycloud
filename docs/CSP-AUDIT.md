# CSP Audit

UnyCloud uses a stable CSP. It must not depend on rebuild hashes, inline
scripts, inline styles, or unsafe directives.

Current policy goals:

- no inline script/style escape hatches;
- no eval escape hatches;
- no CSP hashes for application runtime code;
- no inline `<script>` blocks in HTML templates;
- no inline `<style>` blocks in HTML templates;
- JavaScript runtime bootstrap served as `/static/runtime.js`;
- loading CSS served as `/static/loading.css`;
- PWA manifest served as same-origin `/static/manifest.json`;
- third-party CSS injection avoided;
- editor runtime built on native browser controls instead of Ace;
- PDF preview rendered through a sandboxed iframe, with `object-src 'none'`;
- EPUB inline reader disabled until it can meet the same CSP contract.

The build runs `scripts/csp-audit.sh` before compiling. The audit fails if CSP
escape hatches, hashes, inline script blocks, inline style blocks, `v-show`, or
template style bindings are introduced into the controlled application paths.

The current production blockers caused by runtime style injection from
`@chenfengyuan/vue-number-input`, Ace, `vue-reader`, and video.js were fixed by
replacing them with local/native code paths.

Private branding files must also stay same-origin. Do not use CDN `@import`
rules in `custom.css`; vendor the asset locally or use the bundled Material
Icons/font assets.

For rare dynamic geometry such as context-menu coordinates and image pan/zoom,
UnyCloud updates rules in an already-loaded same-origin stylesheet instead of
writing `style` attributes to DOM elements. That keeps CSP hashes idempotent:
there are no per-build hashes to maintain.
