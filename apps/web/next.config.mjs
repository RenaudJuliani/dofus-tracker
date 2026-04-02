/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@dofus-tracker/db", "@dofus-tracker/types"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fmhfivaxlairclolwmby.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
