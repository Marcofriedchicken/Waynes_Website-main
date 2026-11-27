// "Our Work" videos shown on the homepage.
// To add one: copy an entry, set platform to "instagram" or "tiktok",
// and paste the ID from the link:
//   instagram.com/reel/<ID>/            -> id: "<ID>"
//   tiktok.com/@waynes.detailing/video/<ID> -> id: "<ID>"

export type WorkVideo = {
  platform: "instagram" | "tiktok"
  id: string
}

export const workVideos: WorkVideo[] = [
  { platform: "tiktok", id: "7712651571435261205" },
  { platform: "instagram", id: "DgOhQy2yC6h" },
  { platform: "instagram", id: "DgLz--rJYxH" },
  { platform: "instagram", id: "DgEHwn7hVXW" },
]

export function embedUrl(video: WorkVideo) {
  return video.platform === "instagram"
    ? `https://www.instagram.com/reel/${video.id}/embed/`
    : `https://www.tiktok.com/player/v1/${video.id}?description=0&music_info=0&rel=0`
}

export function postUrl(video: WorkVideo) {
  return video.platform === "instagram"
    ? `https://www.instagram.com/reel/${video.id}/`
    : `https://www.tiktok.com/@waynes.detailing/video/${video.id}`
}
