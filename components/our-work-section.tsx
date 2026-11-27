"use client"

import { motion } from "framer-motion"
import { Instagram } from "lucide-react"
import { businessInfo } from "@/lib/site-info"
import { workVideos, embedUrl, postUrl } from "@/lib/work-videos"

function TikTokIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.6c.27 0 .53.04.77.12V9.77a5.68 5.68 0 0 0-.77-.05 5.69 5.69 0 1 0 5.69 5.69V9.01a7.34 7.34 0 0 0 4.3 1.38V7.3a4.3 4.3 0 0 1-3.25-1.48z" />
    </svg>
  )
}

export function OurWorkSection() {
  if (!workVideos.length) return null

  return (
    <section id="our-work" className="py-24 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="text-[#D4A843] text-sm font-bold tracking-widest uppercase">Before &amp; After</span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-4">
            See Our <span className="text-[#ED0407]">Work</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Real cars, real transformations. Watch what we do from start to finish.
          </p>
        </motion.div>

        <div className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 lg:justify-center lg:flex-wrap lg:overflow-visible">
          {workVideos.map((video) => (
            <div
              key={`${video.platform}-${video.id}`}
              className="snap-center shrink-0 w-[300px] rounded-2xl overflow-hidden border border-[#2A2A2A] bg-[#111111]"
            >
              <iframe
                src={embedUrl(video)}
                title={`Wayne's Detailing ${video.platform === "instagram" ? "Instagram" : "TikTok"} video`}
                className="w-full h-[540px] block bg-black"
                loading="lazy"
                scrolling="no"
                allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                allowFullScreen
              />
              <a
                href={postUrl(video)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white/70 hover:text-[#D4A843] transition-colors border-t border-[#2A2A2A]"
              >
                {video.platform === "instagram" ? <Instagram className="w-4 h-4" /> : <TikTokIcon />}
                Watch on {video.platform === "instagram" ? "Instagram" : "TikTok"}
              </a>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={businessInfo.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl bg-[#ED0407] text-white font-bold hover:bg-[#ED0407]/90 transition-colors"
          >
            More on TikTok
          </a>
          <a
            href={businessInfo.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl border border-[#2A2A2A] text-white/80 font-bold hover:border-[#D4A843]/60 hover:text-white transition-colors"
          >
            Follow on Instagram
          </a>
        </div>
      </div>
    </section>
  )
}
