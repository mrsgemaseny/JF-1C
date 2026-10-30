export interface Review {
  id: number;
  nameKey: string;
  companyKey: string;
  textKey: string;
  rating?: number;
}

export const reviewsList: Review[] = [
  {
    id: 1,
    nameKey: 'reviews.0.name',
    companyKey: 'reviews.0.company',
    textKey: 'reviews.0.text',
    rating: 5,
  },
  {
    id: 2,
    nameKey: 'reviews.1.name',
    companyKey: 'reviews.1.company',
    textKey: 'reviews.1.text',
    rating: 5,
  },
  {
    id: 3,
    nameKey: 'reviews.2.name',
    companyKey: 'reviews.2.company',
    textKey: 'reviews.2.text',
    rating: 5,
  },
  {
    id: 4,
    nameKey: 'reviews.3.name',
    companyKey: 'reviews.3.company',
    textKey: 'reviews.3.text',
    rating: 5,
  },
  {
    id: 5,
    nameKey: 'reviews.4.name',
    companyKey: 'reviews.4.company',
    textKey: 'reviews.4.text',
    rating: 5,
  },
  {
    id: 6,
    nameKey: 'reviews.5.name',
    companyKey: 'reviews.5.company',
    textKey: 'reviews.5.text',
    rating: 5,
  },
  {
    id: 7,
    nameKey: 'reviews.6.name',
    companyKey: 'reviews.6.company',
    textKey: 'reviews.6.text',
    rating: 5,
  },
  {
    id: 8,
    nameKey: 'reviews.7.name',
    companyKey: 'reviews.7.company',
    textKey: 'reviews.7.text',
    rating: 5,
  },
];

export const reviewsRow1 = reviewsList.slice(0, 4);
export const reviewsRow2 = reviewsList.slice(4, 8);
