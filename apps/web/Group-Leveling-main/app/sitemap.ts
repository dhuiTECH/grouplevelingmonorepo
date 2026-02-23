import { MetadataRoute } from 'next';

const BASE_URL = 'https://www.groupleveling.app'; // IMPORTANT: Replace with your actual domain

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // --- STATIC ROUTES ---
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/privacy-policy`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms-of-service`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/leaderboard`, // Example: if you have a dedicated leaderboard page
      lastModified: new Date().toISOString(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    // Add other static pages here as needed
  ];

  // --- DYNAMIC ROUTES (PLACEHOLDER EXAMPLES) ---
  // You would typically fetch data from your database or API to generate these dynamically.
  // Example: Fetching dynamic leaderboard seasons
  /*
  const leaderboardSeasons = await fetchLeaderboardSeasonsFromAPI(); // Implement this function
  const dynamicLeaderboards: MetadataRoute.Sitemap = leaderboardSeasons.map(
    (season) => ({
      url: `${BASE_URL}/leaderboard/${season.id}`,
      lastModified: new Date(season.updatedAt).toISOString(),
      changeFrequency: 'daily',
      priority: 0.7,
    })
  );
  */

  // Example: Fetching public user profiles
  /*
  const publicUserProfiles = await fetchPublicUserProfilesFromAPI(); // Implement this function
  const dynamicUserProfiles: MetadataRoute.Sitemap = publicUserProfiles.map(
    (user) => ({
      url: `${BASE_URL}/profile/${user.id}`,
      lastModified: new Date(user.lastActivity).toISOString(), // Or a relevant timestamp
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  );
  */

  // Combine all routes
  return [
    ...staticRoutes,
    // ...dynamicLeaderboards, // Uncomment if you implement dynamic leaderboards
    // ...dynamicUserProfiles, // Uncomment if you implement dynamic user profiles
  ];
}
