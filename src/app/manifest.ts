import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reciplanner",
    short_name: "Reciplanner",
    description: "A shared recipe book for your household.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafaf9",
    theme_color: "#ea580c",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
