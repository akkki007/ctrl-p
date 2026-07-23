import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ctrlp — Poster Printing",
    short_name: "ctrlp",
    description: "Upload, customise, and get museum-quality posters printed, framed, and delivered.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#6d28d9",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
