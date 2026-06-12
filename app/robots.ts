import type { MetadataRoute } from "next";

import { absolutePublicUrl } from "@/lib/public-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/verify", "/sign-in", "/sign-up"]
      }
    ],
    sitemap: absolutePublicUrl("/sitemap.xml")
  };
}
