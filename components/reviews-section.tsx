"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Star, Quote } from "lucide-react"

type GoogleReview = {
  author_name: string
  rating: number
  relative_time_description: string
  text: string
}

const skeletonCards = Array.from({ length: 3 })

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function ReviewsSection() {
  const [reviews, setReviews] = useState<GoogleReview[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadReviews() {
      try {
        const res = await fetch("/api/reviews")
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data?.message || "Unable to load reviews.")
        }

        if (!data?.reviews?.length) {
          if (mounted) {
            setReviews([])
            setMessage(data?.message || "Reviews coming soon.")
          }
        } else {
          if (mounted) {
            setReviews(data.reviews)
            setMessage(null)
          }
        }
      } catch (error) {
        if (!mounted) return
        setReviews([])
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load reviews at this time.",
        )
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadReviews()
    return () => {
      mounted = false
    }
  }, [])

  const content = useMemo(() => {
    if (loading) {
      return skeletonCards.map((_, index) => (
        <motion.div
          key={index}
          className="relative rounded-2xl p-6 border border-[#2A2A2A] bg-[#111111] animate-pulse"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          viewport={{ once: true }}
        >
          <div className="h-5 w-24 rounded-full bg-white/10 mb-6" />
          <div className="space-y-3 mb-8">
            <div className="h-4 w-full rounded-full bg-white/10" />
            <div className="h-4 w-[90%] rounded-full bg-white/10" />
            <div className="h-4 w-[80%] rounded-full bg-white/10" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/10" />
            <div className="space-y-2 w-full">
              <div className="h-4 w-3/5 rounded-full bg-white/10" />
              <div className="h-3 w-2/5 rounded-full bg-white/10" />
            </div>
          </div>
        </motion.div>
      ))
    }

    if (!reviews.length) {
      return (
        <motion.div
          className="lg:col-span-3 rounded-2xl border border-[#2A2A2A] bg-gradient-to-br from-[#111111] to-[#0A0A0A] p-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <div className="mb-6">
            <Quote className="w-10 h-10 text-[#D4A843]/20" />
          </div>
          <h3 className="text-3xl font-black text-white mb-4">Reviews coming soon</h3>
          <p className="text-white/60 max-w-2xl leading-relaxed">
            We&apos;re pulling live reviews from Google Business Profile. If the place ID is not configured or the listing is not yet available, we&apos;ll show them here as soon as they appear.
          </p>
          {message ? (
            <p className="text-white/40 mt-6 text-sm">{message}</p>
          ) : null}
        </motion.div>
      )
    }

    return reviews.map((review, index) => (
      <motion.div
        key={`${review.author_name}-${index}`}
        className="relative bg-gradient-to-br from-[#111111] to-[#0A0A0A] rounded-2xl p-6 border border-[#2A2A2A] hover:border-[#D4A843]/30 transition-all duration-300"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        viewport={{ once: true }}
      >
        <Quote className="absolute top-4 right-4 w-8 h-8 text-[#D4A843]/20" />

        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex gap-1">
            {Array.from({ length: review.rating }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-[#D4A843] text-[#D4A843]" />
            ))}
          </div>
          <div className="text-white/50 text-sm uppercase tracking-[0.14em]">
            {review.relative_time_description}
          </div>
        </div>

        <p className="text-white/80 text-sm mb-6 leading-relaxed">&quot;{review.text}&quot;</p>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED0407] to-[#D4A843] flex items-center justify-center text-white font-bold text-sm">
            {getInitials(review.author_name)}
          </div>
          <div>
            <div className="text-white font-semibold">{review.author_name}</div>
            <div className="text-white/50 text-sm">Google Review</div>
          </div>
        </div>
      </motion.div>
    ))
  }, [loading, reviews, message])

  return (
    <section id="reviews" className="py-24 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="text-[#D4A843] text-sm font-bold tracking-widest uppercase">
            Testimonials
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-4">
            What Our <span className="text-[#ED0407]">Clients</span> Say
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Don&apos;t just take our word for it. Here&apos;s what our satisfied customers have to say.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{content}</div>
      </div>
    </section>
  )
}
