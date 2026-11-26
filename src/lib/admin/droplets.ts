// Which scraper droplet takes which cities. Mirrors SCRAPE_ORIGINS in each droplet's settings (see the scraper README);
// change both together. The cities are listed in the order each droplet scrapes them.
export const DROPLETS = [
  { name: "Droplet 1", ip: "139.59.61.222", cities: ["bangalore", "hyderabad", "pune"] },
  { name: "Droplet 2", ip: "168.144.81.14", cities: ["delhi", "chennai", "kolkata"] },
  { name: "Droplet 3", ip: "168.144.122.179", cities: ["mumbai", "ahmedabad"] },
] as const;
export const TOTAL_DESTINATIONS = 53;
