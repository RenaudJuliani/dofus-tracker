import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy"],
      disallow: ["/auth/", "/profile", "/dofus/", "/characters/", "/achievements/"],
    },
    sitemap: "https://dofus-tracker-ten.vercel.app/sitemap.xml",
  };
}
