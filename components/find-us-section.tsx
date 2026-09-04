import { motion } from "framer-motion"
import { MapPin, Clock, ExternalLink } from "lucide-react"
import { businessInfo } from "@/lib/site-info"

export function FindUsSection() {
  return (
    <section id="find-us" className="py-24 bg-[#0A0A0A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <span className="text-[#D4A843] text-sm font-bold tracking-widest uppercase">
            Find Us
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white mt-3 mb-4">
            Visit <span className="text-[#ED0407]">Wayne&apos;s Detailing</span>
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto">
            Our shop is ready for your vehicle. Use the map below to get directions and stop by today.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[1.15fr,_0.85fr] items-start">
          <motion.div
            className="rounded-3xl border border-[#2A2A2A] overflow-hidden bg-gradient-to-br from-[#111111] to-[#090909] shadow-[0_20px_80px_rgba(0,0,0,0.35)]"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="relative h-96 sm:h-[28rem] w-full">
              <iframe
                title="Wayne's Detailing location map"
                src={businessInfo.googleMapsEmbedUrl}
                className="h-full w-full border-0 filter brightness-80 contrast-[1.05] saturate-[0.85]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </motion.div>

          <motion.div
            className="rounded-3xl border border-[#2A2A2A] bg-[#111111] p-8 flex flex-col gap-8"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="space-y-6">
              <div className="rounded-3xl border border-[#2A2A2A] bg-[#0A0A0A] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#ED0407]/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-[#ED0407]" />
                  </div>
                  <div>
                    <p className="text-white/50 text-sm uppercase tracking-[0.16em]">Address</p>
                    <p className="text-white font-semibold">{businessInfo.fullAddress}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#2A2A2A] bg-[#0A0A0A] p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-[#ED0407]/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-[#ED0407]" />
                  </div>
                  <div>
                    <p className="text-white/50 text-sm uppercase tracking-[0.16em]">Hours</p>
                    <p className="text-white font-semibold">{businessInfo.hours}</p>
                  </div>
                </div>
              </div>
            </div>

            <a
              href={businessInfo.googleMapsDirectionsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#D4A843] hover:bg-[#D4A843]/90 text-[#0A0A0A] px-8 py-4 rounded-full font-bold text-lg transition-all"
            >
              Get Directions
              <ExternalLink className="w-4 h-4" />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
