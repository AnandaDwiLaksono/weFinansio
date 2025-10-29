import withPWA from "next-pwa";

const withPWAFn = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  reactStrictMode: true,
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};

export default withPWAFn(nextConfig);
