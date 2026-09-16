/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.wasm?url' {
  const url: string;
  export default url;
}
