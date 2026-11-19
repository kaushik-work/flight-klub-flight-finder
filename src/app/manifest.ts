import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Flight Klub Flight Finder",
    short_name: "Flight Klub",
    description: "Find the cheapest destinations and months to fly.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9fb",
    theme_color: "#8b1d24",
  };
}
