/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['tesseract.js', 'puppeteer-core', '@sparticuz/chromium'],
  },
  webpack: (config) => {
    // tesseract.js needs these to work in serverless functions
    config.externals.push({ 'puppeteer-core': 'commonjs puppeteer-core' });
    return config;
  },
};
module.exports = nextConfig;
