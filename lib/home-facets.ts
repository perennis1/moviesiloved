export type FacetKey = "genre" | "language" | "year" | "type" | "audio" | "quality";

export type FacetOption = {
  value: string;
  count: number;
};

export type PopularFilter = {
  facet: FacetKey;
  value: string;
  count: number;
};

export type HomepageFacetStats = {
  genres: FacetOption[];
  languages: FacetOption[];
  years: FacetOption[];
  types: FacetOption[];
  audio: FacetOption[];
  quality: FacetOption[];
  popularFilters: PopularFilter[];
};

export const genreFilters = [
  "Action",
  "Adventure",
  "Anime",
  "Comedy",
  "Crime",
  "Drama",
  "Family",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Thriller",
  "Sci-Fi"
];

export const languageFilters = ["Hindi", "English", "Tamil", "Telugu", "Malayalam", "Kannada", "Urdu", "Bangla"];
export const typeFilters = ["Movie", "Series", "Web Series", "Anime"];
export const audioFilters = ["Dual Audio", "Multi Audio", "Hindi-English", "Hindi Dubbed", "English"];
export const qualityFilters = ["480p", "720p", "1080p", "4K", "x265", "10Bit"];
export const sortFilters = ["Newest", "Featured", "Most Viewed", "Top Rated", "A-Z"];
export const currentYear = new Date().getFullYear();
export const yearFilters = Array.from({ length: 7 }, (_, index) => String(currentYear - index));
