// This is requred because of obnoxious reasons.
// When redirecting to /landing
// Nginx must redirect to /landing/ (for the rest of the path to be preserved properly, if present)
// Making svelte send 301 when requesting the /landing/ to /landing thus showing /landing in the end users
// URL bar.
// Very annoying.
export const trailingSlash = 'ignore';
