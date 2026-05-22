export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  images: {
    jpg: {
      image_url: string;
      small_image_url: string;
      large_image_url: string;
    };
    webp: {
      image_url: string;
      small_image_url: string;
      large_image_url: string;
    };
  };
  synopsis: string | null;
  episodes: number | null;
  status: string;
  aired: {
    from: string | null;
    to: string | null;
  };
  score: number | null;
  genres: { mal_id: number; name: string }[];
  studios: { mal_id: number; name: string }[];
  season: string | null;
  year: number | null;
  broadcast: {
    day: string | null;
    time: string | null;
  };
}

export interface JikanSearchResponse {
  data: JikanAnime[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

export interface JikanSeasonResponse {
  data: JikanAnime[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

export interface JikanScheduleResponse {
  data: JikanAnime[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

export interface JikanRecommendation {
  entry: {
    mal_id: number;
    title: string;
    images: {
      jpg: {
        image_url: string;
        small_image_url: string;
        large_image_url: string;
      };
      webp: {
        image_url: string;
        small_image_url: string;
        large_image_url: string;
      };
    };
  };
  votes: number;
}

export interface JikanReview {
  mal_id: number;
  user: {
    username: string;
    images: { jpg: { image_url: string } };
  };
  score: number;
  review: string;
  date: string;
  tags: string[];
}

export interface JikanTopResponse {
  data: JikanAnime[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
  };
}
