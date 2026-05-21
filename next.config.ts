import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Redirect URL antigua del newsroom hacia la nueva raíz protegida.
  // El archivo /public/vu_newsroom.html ya no existe; ahora se sirve via app/route.ts.
  async redirects() {
    return [
      {
        source: '/vu_newsroom.html',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
