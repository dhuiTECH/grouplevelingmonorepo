import type { Metadata } from "next";
import { Exo_2, Orbitron, Rajdhani } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

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
  title: 'Gamified Fitness RPG & Workout Tracker | Group Leveling',
  description: 'Turn your runs and workouts into an RPG adventure. Track calories, conquer dungeons, level up your hero, and join guilds in the ultimate fitness game.',
  keywords: ['gamified fitness', 'workout RPG', 'fitness game', 'run tracker RPG', 'weight loss game', 'fitness motivation', 'step tracker game'],
  authors: [{ name: 'Group Leveling' }],
  creator: 'Group Leveling',
  publisher: 'Group Leveling',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://www.groupleveling.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Gamified Fitness RPG & Workout Tracker | Group Leveling',
    description: 'Turn your runs and workouts into an RPG adventure. Track calories, conquer dungeons, level up your hero, and join guilds in the ultimate fitness game.',
    url: '/',
    siteName: 'Hunter System',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Hunter System - Level Up Through Fitness',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hunter System | Level Up Through Fitness',
    description: 'Awaken your inner hunter. Track runs, conquer dungeons, level up, and climb the elite rankings in this immersive fitness RPG system.',
    images: ['/og-image.png'],
    creator: '@huntersystem',
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: false,
      noimageindex: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
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