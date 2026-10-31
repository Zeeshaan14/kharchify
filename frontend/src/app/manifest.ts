import type { MetadataRoute } from "next";

// Makes the app installable ("Add to Home Screen"); it then opens full-screen without browser bars.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kharchify",
    short_name: "Kharchify",
    description: "See where your money goes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050507",
    theme_color: "#050507",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Add expense", url: "/?add=1", icons: [{ src: "/icon-192.png", sizes: "192x192" }] }],
  };
}
