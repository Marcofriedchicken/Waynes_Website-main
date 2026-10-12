// Add another review by copying an existing entry and updating the fields.

export type Review = {
  author_name: string
  rating: number
  text: string
  date: string
  source: string
}

export const reviews: Review[] = [
  {
    author_name: "Aliya Pangulima",
    rating: 5,
    text: "The crew was so professional and friendly. Had my car car washed and ceramic protected. I was so happy with the transformation. It turned my car into a nice looking candy gloss skin! Wow!",
    date: "September 2026",
    source: "Google Review",
  },
]
