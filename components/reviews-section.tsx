"use client"

import { motion } from "framer-motion"
import { Quote, Star } from "lucide-react"
import { reviews } from "@/lib/reviews-data"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function ReviewsSection() {
  const visibleReviews = reviews.slice(0, 5)

  const content = !visibleReviews.length ? (
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
      <p className="text-white/60 max-w-2xl leading-relaxed">We&apos;d love to hear how we did.</p>
    </motion.div>
  ) : (
    visibleReviews.map((review, index) => (
      <motion.div
        key={`${review.author_name}-${index}`}
        className="relative bg-gradient-to-br from-[#111111] to-[#0A0A0A] rounded-2xl p-6 border border-[#2A2A2A] hover:border-[#D4A843]/30 transition-all duration-300"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        viewport={{ once: true }}
      >
        <Quote className="absolute top-4 right-4 w-8 h-8 text-[#D4A843]/20" />

        <div className="flex items-center gap-4 mb-4">
          <div className="flex gap-1">
            {Array.from({ length: review.rating }).map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-[#D4A843] text-[#D4A843]" />
            ))}
          </div>
          <div className="text-white/50 text-sm uppercase tracking-[0.14em] ml-1">
            {review.date}
          </div>
        </div>

        <p className="text-white/80 text-sm mb-6 leading-relaxed">&quot;{review.text}&quot;</p>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ED0407] to-[#D4A843] flex items-center justify-center text-white font-bold text-sm">
            {getInitials(review.author_name)}
          </div>
          <div>
            <div className="text-white font-semibold">{review.author_name}</div>
            <div className="text-white/50 text-sm">{review.source}</div>
          </div>
        </div>
      </motion.div>
    ))
  )

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
