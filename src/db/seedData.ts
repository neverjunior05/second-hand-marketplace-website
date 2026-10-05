/**
 * Seed data for Bindery.
 * 18 realistic used-book listings across 6 genres, 6 accounts (5 members + 1 admin),
 * 2 completed orders and verified-purchase reviews so seller ratings are populated.
 *
 * Cover images use picsum.photos with fixed seeds so the layout is stable between runs.
 */
export const cover = (seed: string, index = 1) =>
  `https://picsum.photos/seed/${seed}-${index}/600/900`;

export const genreSeed = [
  { name: "Fiction", slug: "fiction", description: "Literary and contemporary novels." },
  { name: "Academic & Textbooks", slug: "academic", description: "Course books, reference and exam prep." },
  { name: "Self-Help", slug: "self-help", description: "Habits, work, money and mindset." },
  { name: "Children's Books", slug: "childrens", description: "Picture books, early readers and middle grade." },
  { name: "Sci-Fi & Fantasy", slug: "sci-fi-fantasy", description: "Worlds that never were." },
  { name: "Mystery & Crime", slug: "mystery-crime", description: "Detectives, thrillers and whodunnits." },
];

export const userSeed = [
  {
    name: "Meera Kapoor",
    email: "admin@bindery.test",
    password: "Admin@123",
    role: "admin" as const,
    city: "Mumbai",
    bio: "Bindery trust & safety.",
    accent: "terracotta",
  },
  {
    name: "Priya Raghavan",
    email: "priya@bindery.test",
    password: "Password@123",
    role: "user" as const,
    city: "Kolkata",
    bio: "English lit post-grad clearing my shelves. Every parcel is wrapped in brown paper and string.",
    accent: "emerald",
  },
  {
    name: "Arjun Mehta",
    email: "arjun@bindery.test",
    password: "Password@123",
    role: "user" as const,
    city: "Bengaluru",
    bio: "Ex-textbook reseller. I grade honestly — ask me about the highlighting before you buy.",
    accent: "amber",
  },
  {
    name: "Sara Fernandes",
    email: "sara@bindery.test",
    password: "Password@123",
    role: "user" as const,
    city: "Pune",
    bio: "Mom of two, selling our outgrown picture books. Condition notes are always honest.",
    accent: "emerald",
  },
  {
    name: "Devika Nair",
    email: "devika@bindery.test",
    password: "Password@123",
    role: "user" as const,
    city: "Chennai",
    bio: "Fantasy paperbacks, mostly. Ships within 24 hours of a confirmed order.",
    accent: "terracotta",
  },
  {
    name: "Rahul Verma",
    email: "rahul@bindery.test",
    password: "Password@123",
    role: "user" as const,
    city: "Delhi",
    bio: "Mostly a buyer, occasionally selling duplicates.",
    accent: "amber",
  },
];

export type BookSeed = {
  title: string;
  author: string;
  isbn: string;
  genreSlug: string;
  condition: "new" | "like_new" | "good" | "fair" | "acceptable";
  conditionNotes: string;
  description: string;
  price: number;
  originalPrice: number;
  quantity?: number;
  sellerEmail: string;
  coverSeed: string;
  publishedYear: number;
};

export const bookSeed: BookSeed[] = [
  {
    title: "The Ministry of Utmost Happiness",
    author: "Arundhati Roy",
    isbn: "9780399562907",
    genreSlug: "fiction",
    condition: "like_new",
    conditionNotes: "Read once. No marks at all; jacket has a 5mm scuff on the top edge.",
    description:
      "A sprawling, generous novel that moves between a Delhi graveyard, Kashmir and old Delhi's winding lanes. Second-hand copy from a university reading circle that never got to it.",
    price: 269,
    originalPrice: 599,
    sellerEmail: "priya@bindery.test",
    coverSeed: "bindery-ministry",
    publishedYear: 2017,
  },
  {
    title: "A Suitable Boy",
    author: "Vikram Seth",
    isbn: "9788172234949",
    genreSlug: "fiction",
    condition: "good",
    conditionNotes: "Light spine crease and a pencil inscription on the flyleaf. Pages lightly toned.",
    description:
      "The 1,349-page doorstop, in the everyday paperback edition. Heavy item, ships at cost. A post-partition India family saga that rewards patience.",
    price: 349,
    originalPrice: 750,
    sellerEmail: "priya@bindery.test",
    coverSeed: "bindery-suitable",
    publishedYear: 1993,
  },
  {
    title: "Interpreter of Maladies",
    author: "Jhumpa Lahiri",
    isbn: "9780006551416",
    genreSlug: "fiction",
    condition: "good",
    conditionNotes: "Small crease on the front cover corner; no writing inside.",
    description:
      "The Pulitzer-winning story collection. Clean, tight reading copy — perfect entry point if you have only seen the film adaptations.",
    price: 189,
    originalPrice: 399,
    sellerEmail: "rahul@bindery.test",
    coverSeed: "bindery-interpreter",
    publishedYear: 1999,
  },
  {
    title: "Gun Island",
    author: "Amitav Ghosh",
    isbn: "9780374605867",
    genreSlug: "fiction",
    condition: "fair",
    conditionNotes: "Cover creased at both corners, spine leans slightly. No highlighting.",
    description:
      "Climate migration myth-making from the Sundarbans to Venice. A well-loved copy from a book club that read it cover to cover.",
    price: 179,
    originalPrice: 499,
    sellerEmail: "priya@bindery.test",
    coverSeed: "bindery-gunisland",
    publishedYear: 2019,
  },
  {
    title: "Concepts of Physics — Part 1 & 2",
    author: "H. C. Verma",
    isbn: "9788177091878",
    genreSlug: "academic",
    condition: "acceptable",
    conditionNotes:
      "Heavy highlighting on chapters 3-5 in Part 1; Part 2 has worked solutions in pencil on ~20 pages. Bindings intact.",
    description:
      "The classic JEE physics set. Honestly graded: this is a working copy, not a display copy. All pages present and legible, solutions pencil-erasable.",
    price: 549,
    originalPrice: 1290,
    quantity: 1,
    sellerEmail: "arjun@bindery.test",
    coverSeed: "bindery-hcverma",
    publishedYear: 2011,
  },
  {
    title: "Introduction to Algorithms (CLRS), 3rd ed.",
    author: "Cormen, Leiserson, Rivest & Stein",
    isbn: "9780262033848",
    genreSlug: "academic",
    condition: "good",
    conditionNotes: "Owner name stamped on the fore-edge; appendix pages lightly warped from a spill (dried).",
    description:
      "The algorithms bible, third edition. Grad-school surplus. Every chapter complete, hardcover still square and strong.",
    price: 899,
    originalPrice: 2400,
    sellerEmail: "arjun@bindery.test",
    coverSeed: "bindery-clrs",
    publishedYear: 2009,
  },
  {
    title: "NCERT Mathematics Class 12, Part 1",
    author: "NCERT",
    isbn: "9788174506412",
    genreSlug: "academic",
    condition: "fair",
    conditionNotes: "Cover laminated with old plastic, answers filled in for chapters 1-4.",
    description:
      "Board-exam staple. Cheap on purpose — ideal as a second copy for revision while your school copy stays clean.",
    price: 129,
    originalPrice: 145,
    sellerEmail: "arjun@bindery.test",
    coverSeed: "bindery-ncert12",
    publishedYear: 2019,
  },
  {
    title: "Organic Chemistry, 8th Edition",
    author: "Paula Yurkanis Bruice",
    isbn: "9789332585502",
    genreSlug: "academic",
    condition: "like_new",
    conditionNotes: "Unused spare copy. Still crisp; one tiny dent on the back board.",
    description:
      "Bought by mistake in a bulk order and never opened. Better than the campus photocopy by a mile.",
    price: 1090,
    originalPrice: 1950,
    sellerEmail: "arjun@bindery.test",
    coverSeed: "bindery-bruice",
    publishedYear: 2016,
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    isbn: "9780735211292",
    genreSlug: "self-help",
    condition: "like_new",
    conditionNotes: "Read once on a train trip. No creases, no annotations.",
    description:
      "Tiny changes, remarkable results. Selling because my shelf already has the hardcover gift edition.",
    price: 329,
    originalPrice: 799,
    sellerEmail: "sara@bindery.test",
    coverSeed: "bindery-atomic",
    publishedYear: 2018,
  },
  {
    title: "Deep Work",
    author: "Cal Newport",
    isbn: "9781455586691",
    genreSlug: "self-help",
    condition: "good",
    conditionNotes: "Faint highlight on ~10 pages in chapter 2. Spine uncreased.",
    description:
      "Rules for focused success in a distracted world. A good, honest reading copy with minimal marking.",
    price: 249,
    originalPrice: 599,
    sellerEmail: "priya@bindery.test",
    coverSeed: "bindery-deepwork",
    publishedYear: 2016,
  },
  {
    title: "Rich Dad Poor Dad",
    author: "Robert T. Kiyosaki",
    isbn: "9781612680194",
    genreSlug: "self-help",
    condition: "acceptable",
    conditionNotes: "Sunned cover, pages yellowed throughout, prior-owner stamps on three pages.",
    description:
      "The personal-finance classic everyone has already read twice. Worn but complete and entirely legible.",
    price: 149,
    originalPrice: 399,
    sellerEmail: "rahul@bindery.test",
    coverSeed: "bindery-richdad",
    publishedYear: 2011,
  },
  {
    title: "The Very Hungry Caterpillar",
    author: "Eric Carle",
    isbn: "9780241004388",
    genreSlug: "childrens",
    condition: "good",
    conditionNotes: "Board book with a repaired tear on page 6 (archival tape). Colours still bright.",
    description:
      "The classic counting book. Outgrown at our house — a lovely starter copy for a toddler's bookshelf.",
    price: 199,
    originalPrice: 450,
    sellerEmail: "sara@bindery.test",
    coverSeed: "bindery-caterpillar",
    publishedYear: 2014,
  },
  {
    title: "Harry Potter and the Philosopher's Stone",
    author: "J. K. Rowling",
    isbn: "9781408855652",
    genreSlug: "childrens",
    condition: "like_new",
    conditionNotes: "New illustrated-edition duplicate. Unread, spine square.",
    description:
      "The illustrated hardcover — a duplicate birthday gift. Heavy, gorgeous, and cheaper here than the bookstore.",
    price: 1190,
    originalPrice: 2299,
    sellerEmail: "sara@bindery.test",
    coverSeed: "bindery-hp1",
    publishedYear: 2015,
  },
  {
    title: "Charlotte's Web",
    author: "E. B. White",
    isbn: "9780064400558",
    genreSlug: "childrens",
    condition: "fair",
    conditionNotes: "Creased cover, child's name in crayon on the inside cover, all pages clean.",
    description:
      "Some pig. A well-read school-year copy, perfect for a classroom library where books get used.",
    price: 119,
    originalPrice: 299,
    sellerEmail: "sara@bindery.test",
    coverSeed: "bindery-charlotte",
    publishedYear: 2012,
  },
  {
    title: "The Name of the Wind",
    author: "Patrick Rothfuss",
    isbn: "9788408172183",
    genreSlug: "sci-fi-fantasy",
    condition: "good",
    conditionNotes: "Two light spine creases, corner bumped. No writing.",
    description:
      "Day one of the Kingkiller Chronicle, English trade paperback. Chunky, immersive, ships well packed.",
    price: 299,
    originalPrice: 699,
    sellerEmail: "devika@bindery.test",
    coverSeed: "bindery-notw",
    publishedYear: 2007,
  },
  {
    title: "The Left Hand of Darkness",
    author: "Ursula K. Le Guin",
    isbn: "9780441478125",
    genreSlug: "sci-fi-fantasy",
    condition: "new",
    conditionNotes: "Unread. Still tight and uncreased; no shelf wear at all.",
    description:
      "Le Guin's Hainish masterpiece. Bought twice by accident during a sale — this one has never been opened.",
    price: 389,
    originalPrice: 599,
    sellerEmail: "devika@bindery.test",
    coverSeed: "bindery-lefthand",
    publishedYear: 2016,
  },
  {
    title: "The Fifth Season",
    author: "N. K. Jemisin",
    isbn: "9780356508191",
    genreSlug: "sci-fi-fantasy",
    condition: "like_new",
    conditionNotes: "One faint handling mark on the bottom edge. Otherwise spotless.",
    description:
      "The Broken Earth trilogy opener, Hugo winner three years running. From a once-read collection.",
    price: 279,
    originalPrice: 599,
    sellerEmail: "devika@bindery.test",
    coverSeed: "bindery-fifthseason",
    publishedYear: 2015,
  },
  {
    title: "The Silent Patient",
    author: "Alex Michaelides",
    isbn: "9781250301697",
    genreSlug: "mystery-crime",
    condition: "good",
    conditionNotes: "Reading crease along the spine, page edges slightly toned. No marks.",
    description:
      "The psychotherapist who never speaks and the forensic psychologist who will not let go. Fast, twisty, one-sitting read.",
    price: 209,
    originalPrice: 499,
    sellerEmail: "devika@bindery.test",
    coverSeed: "bindery-silentpatient",
    publishedYear: 2019,
  },
  {
    title: "The Girl with the Dragon Tattoo",
    author: "Stieg Larsson",
    isbn: "9780307454546",
    genreSlug: "mystery-crime",
    condition: "fair",
    conditionNotes: "Creased front cover, spine leans, light underlining in the first three chapters.",
    description:
      "Millennium trilogy book one. A commuter's copy — visibly read, fully readable, bargain price.",
    price: 159,
    originalPrice: 450,
    sellerEmail: "rahul@bindery.test",
    coverSeed: "bindery-dragontattoo",
    publishedYear: 2011,
  },
  {
    title: "And Then There Were None",
    author: "Agatha Christie",
    isbn: "9780062073488",
    genreSlug: "mystery-crime",
    condition: "good",
    conditionNotes: "Small ink mark on the back cover; inside pages clean and uncreased.",
    description:
      "The best-selling mystery novel of all time. Compact paperback, ideal travel copy.",
    price: 139,
    originalPrice: 299,
    sellerEmail: "priya@bindery.test",
    coverSeed: "bindery-none",
    publishedYear: 2011,
  },
];

/** Completed demo orders + the verified-purchase reviews attached to them. */
export const orderSeed = [
  {
    buyerEmail: "rahul@bindery.test",
    status: "delivered" as const,
    daysAgo: 21,
    items: [
      { coverSeed: "bindery-deepwork", title: "Deep Work", author: "Cal Newport", condition: "good" as const, price: 249, sellerEmail: "priya@bindery.test" },
      { coverSeed: "bindery-none", title: "And Then There Were None", author: "Agatha Christie", condition: "good" as const, price: 139, sellerEmail: "priya@bindery.test" },
    ],
    reviews: [
      {
        sellerEmail: "priya@bindery.test",
        rating: 5,
        comment:
          "Wrapped in brown paper and posted the same evening. Condition notes were spot on — no surprises at all.",
      },
    ],
  },
  {
    buyerEmail: "sara@bindery.test",
    status: "delivered" as const,
    daysAgo: 9,
    items: [
      { coverSeed: "bindery-notw", title: "The Name of the Wind", author: "Patrick Rothfuss", condition: "good" as const, price: 299, sellerEmail: "devika@bindery.test" },
    ],
    reviews: [
      {
        sellerEmail: "devika@bindery.test",
        rating: 4,
        comment:
          "Good copy as described, spine creases exactly as photographed. Would have liked tracking updates, but no complaints.",
      },
    ],
  },
  {
    buyerEmail: "priya@bindery.test",
    status: "shipped" as const,
    daysAgo: 4,
    items: [
      { coverSeed: "bindery-fifthseason", title: "The Fifth Season", author: "N. K. Jemisin", condition: "like_new" as const, price: 279, sellerEmail: "devika@bindery.test" },
    ],
    reviews: [],
  },
];
