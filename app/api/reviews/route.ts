import type { NextRequest } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"

const PLACE_DETAILS_FIELDS = "reviews"
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours
const CACHE_FILE = path.join(process.cwd(), ".cache", "google-reviews.json")

interface GoogleReview {
  author_name: string
  rating: number
  relative_time_description: string
  text: string
  time: number
}

interface GooglePlaceDetailsResponse {
  status: string
  result?: {
    reviews?: GoogleReview[]
  }
  error_message?: string
}

declare global {
  // eslint-disable-next-line no-var
  var reviewsCache: {
    expiresAt: number
    payload: { reviews: ReviewPayload[]; message?: string }
  } | undefined
}

type ReviewPayload = {
  author_name: string
  rating: number
  relative_time_description: string
  text: string
}

type CachedReviewPayload = {
  reviews: ReviewPayload[]
  message?: string
  updatedAt?: number
}

const getCache = () => {
  if (!globalThis.reviewsCache) {
    globalThis.reviewsCache = { expiresAt: 0, payload: { reviews: [] } }
  }
  return globalThis.reviewsCache
}

const readLocalCache = async (): Promise<CachedReviewPayload | null> => {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true })
    const raw = await fs.readFile(CACHE_FILE, "utf8")
    if (!raw.trim()) return null

    const parsed = JSON.parse(raw) as CachedReviewPayload
    if (!parsed || !Array.isArray(parsed.reviews)) return null

    return parsed
  } catch {
    return null
  }
}

const writeLocalCache = async (payload: CachedReviewPayload) => {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true })
    await fs.writeFile(
      CACHE_FILE,
      JSON.stringify({ ...payload, updatedAt: Date.now() }, null, 2),
      "utf8",
    )
  } catch {
    // Ignore filesystem write errors so the site still works in restricted environments.
  }
}

const createResponse = (payload: { reviews: ReviewPayload[]; message?: string }, status = 200) => {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600",
    },
  })
}

export async function GET(_request: NextRequest) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY
  const placeId = process.env.GOOGLE_PLACE_ID
  if (!apiKey || !placeId) {
    return createResponse(
      {
        reviews: [],
        message:
          "Reviews coming soon. Google Place ID or API key has not been configured yet.",
      },
      200,
    )
  }

  const cache = getCache()
  const localCache = await readLocalCache()

  if (localCache && localCache.updatedAt && Date.now() - localCache.updatedAt < CACHE_TTL_MS) {
    cache.expiresAt = localCache.updatedAt + CACHE_TTL_MS
    cache.payload = { reviews: localCache.reviews, message: localCache.message }
    return createResponse(cache.payload)
  }

  if (cache.expiresAt > Date.now()) {
    return createResponse(cache.payload)
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json")
  url.searchParams.set("place_id", placeId)
  url.searchParams.set("fields", PLACE_DETAILS_FIELDS)
  url.searchParams.set("key", apiKey)

  try {
    const res = await fetch(url.toString())
    if (!res.ok) {
      if (localCache?.reviews?.length) {
        return createResponse({ reviews: localCache.reviews, message: localCache.message || "Showing cached reviews." })
      }
      return createResponse(
        {
          reviews: [],
          message: "Unable to load reviews from Google at this time.",
        },
        res.status,
      )
    }

    const data = (await res.json()) as GooglePlaceDetailsResponse
    if (data.status !== "OK" || !data.result?.reviews?.length) {
      if (localCache?.reviews?.length) {
        return createResponse({ reviews: localCache.reviews, message: localCache.message || "Showing cached reviews." })
      }

      const message = data.status === "OK"
        ? "No reviews are available yet. Please check back soon."
        : `Google Places API returned status: ${data.status}`

      const payload = { reviews: [], message }
      cache.expiresAt = Date.now() + CACHE_TTL_MS
      cache.payload = payload
      await writeLocalCache({ ...payload, updatedAt: Date.now() })
      return createResponse(payload)
    }

    const reviews = data.result.reviews.slice(0, 5).map((review) => ({
      author_name: review.author_name,
      rating: review.rating,
      relative_time_description: review.relative_time_description,
      text: review.text,
    }))

    const payload = { reviews, message: undefined }
    cache.expiresAt = Date.now() + CACHE_TTL_MS
    cache.payload = payload
    await writeLocalCache({ ...payload, updatedAt: Date.now() })
    return createResponse(payload)
  } catch {
    if (localCache?.reviews?.length) {
      return createResponse({ reviews: localCache.reviews, message: localCache.message || "Showing cached reviews." })
    }

    return createResponse(
      {
        reviews: [],
        message: "Unable to load reviews from Google at this time.",
      },
      500,
    )
  }
}
