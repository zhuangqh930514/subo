import { fileURLToPath } from "node:url";

export default defineNuxtConfig({
  devtools: { enabled: true },
  compatibilityDate: "2026-05-30",
  runtimeConfig: {
    apiInternalBase:
      process.env.NUXT_API_INTERNAL_BASE ??
      process.env.NUXT_PUBLIC_API_BASE ??
      "http://127.0.0.1:3006/api",
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? "/api"
    }
  },
  alias: {
    "@subo/shared": fileURLToPath(new URL("./data/shared.ts", import.meta.url))
  },
  css: ["~/assets/css/main.css"],
  typescript: {
    strict: true
  },
  app: {
    head: {
      title: "溯博生物",
      htmlAttrs: {
        lang: "zh-CN"
      },
      titleTemplate: "%s - 溯博生物"
    }
  }
});
