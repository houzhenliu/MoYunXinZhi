import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/upload-file',
        destination: 'https://xingchen-api.xf-yun.com/workflow/v1/upload_file',
      },
    ];
  },
  // 允许外部图片域名
  images: {
    domains: ['xingchen-api.xf-yun.com', 'sgw-dx.xf-yun.com'],
  },
};

export default nextConfig;
