/** Shared type for blog posts — used by the Blog page and future API integration. */
export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  tags: string[];
}

/** Contact form field values. */
export interface ContactFormState {
  name: string;
  email: string;
  message: string;
}

/** Contact form validation errors (one per field). */
export interface ContactFormErrors {
  name?: string;
  email?: string;
  message?: string;
}
