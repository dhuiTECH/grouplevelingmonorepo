import type { Metadata } from "next";
import { Exo_2, Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from "@/lib/site";

const exo2 = Exo_2({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-exo2',
  weight: ["400", "500", "600", "700", "800", "900"]
});

const orbitron = Orbitron({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-orbitron',
  weight: ["400", "500", "600", "700", "800", "900"]
});

const rajdhani = Rajdhani({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-rajdhani',
  weight: ["300", "400", "500", "600", "700"]
});

export const metadata: Metadata = {
  title: `${SITE_NAME} | The Fantasy Walking RPG & Fitness App`,
  description:
    "Turn your runs and workouts into an RPG adventure. Track calories, conquer dungeons, level up your hunter, and join guilds in the ultimate fitness game.",
  keywords: [
    'gamified fitness',
    'workout RPG',
    'walking RPG',
    'fantasy fitness app',
    'solo leveling style fitness',
    'hunter fantasy workout game',
    'dungeon RPG fitness tracker',
    'run tracker RPG',
    'weight loss game',
    'fitness motivation',
    'step tracker game',
  ],
  authors: [{ name: 'Group Leveling' }],
  creator: 'Group Leveling',
  publisher: 'Group Leveling',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `${SITE_NAME} | The Fantasy Walking RPG & Fitness App`,
    description: 'Turn your runs and workouts into an RPG adventure. Track calories, conquer dungeons, level up your hunter, and join guilds in the ultimate fitness game.',
    url: '/',
    siteName: SITE_NAME,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Group Leveling fantasy walking RPG and fitness app',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | The Fantasy Walking RPG & Fitness App`,
    description: 'Awaken your inner hunter. Track runs, conquer dungeons, level up, and climb the elite rankings in this immersive fitness RPG system.',
    images: [DEFAULT_OG_IMAGE],
    creator: '@huntersystem',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
    ],
    shortcut: '/favicon-96x96.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className={`${exo2.variable} ${orbitron.variable} ${rajdhani.variable}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}