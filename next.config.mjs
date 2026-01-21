/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    eslint: {
        ignoreDuringBuilds: true, // Often helpful in CI/Docker to prevent build failures from minor lint issues
    },
};

export default nextConfig;
