// eslint.config.mjs — Native ESLint 9 flat config for Next.js 16
// No legacy FlatCompat. Next.js 16 ships native flat config.
import nextjs from "eslint-config-next";

const config = [...nextjs];

export default config;
