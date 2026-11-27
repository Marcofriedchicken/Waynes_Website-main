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
    author_name: "Victoria",
    rating: 5,
    text: "Cool website and its very easy to make a booking.. i recommend booking on their website/texting the owner so u dont have to wait when u arrive. The owner is also very friendly and nice, the detailing itself is very nice and clean..",
    date: "November 2026",
    source: "Google Review",
  },
  {
    author_name: "Luis Valladolid",
    rating: 5,
    text: "Outstanding car detailing service! You can really see the dedication, passion, and attention to detail that go into their work. They take pride in delivering excellent results and making sure every vehicle gets the care it deserves. Great service, professional workmanship, and highly recommended!",
    date: "November 2026",
    source: "Google Review",
  },
  {
    author_name: "Aliya Pangulima",
    rating: 5,
    text: "The crew was so professional and friendly. Had my car car washed and ceramic protected. I was so happy with the transformation. It turned my car into a nice looking candy gloss skin! Wow!",
    date: "September 2026",
    source: "Google Review",
  },
]
