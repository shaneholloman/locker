// Vite supports importing CSS as an inline string with the `?inline` query.
// The vite/client.d.ts file declares this globally, but the WXT-generated
// reference chain isn't picked up by this project's tsconfig include set,
// so we re-declare just the suffixes we use here.

declare module "*.css?inline" {
  const css: string;
  export default css;
}
