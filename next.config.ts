import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js-ontwikkelmenu (Route, Bundler, Preferences) linksonder niet tonen
  devIndicators: false,
  experimental: {
    // Een net bekeken pagina 30 seconden in de browser bewaren: heen en weer klikken tussen
    // Home, Open en Notities gaat dan zonder nieuwe serverronde. Eigen wijzigingen legen deze
    // cache meteen (revalidatePath); wijzigingen van collega's zie je hooguit 30 s later.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
