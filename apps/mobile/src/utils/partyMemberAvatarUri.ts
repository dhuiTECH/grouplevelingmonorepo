import { Image as RNImage } from 'react-native';

/** Resolve portrait URL for a party member (player avatar or pet image). */
export function resolvePartyMemberAvatarUri(member: any, fallbackUser: any): string {
  if (member?.type === 'pet') return member.petDetails?.image_url || 'https://via.placeholder.com/40';
  const u = member?.avatar || fallbackUser;
  if (!u) return 'https://via.placeholder.com/40';
  const url = u.base_body_silhouette_url || u.base_body_url || u.avatar_url;
  if (typeof url === 'string' && url.startsWith('http')) return url;
  const profilePic = u.profilePicture;
  if (!profilePic) return 'https://via.placeholder.com/40';
  if (typeof profilePic === 'string') return profilePic;
  if (profilePic?.uri) return profilePic.uri;
  try {
    const asset = RNImage.resolveAssetSource(profilePic);
    return asset?.uri || 'https://via.placeholder.com/40';
  } catch {
    return 'https://via.placeholder.com/40';
  }
}
