export interface Package {
  id: number;
  name: string;
  price: string;
  description: string;
  features: string[];
  isFeatured: boolean;
  paymentLink: string;
}

export type TestimonialRole = 'Participante' | 'Senior' | 'Staff';
export type TestimonialStatus = 'pending' | 'approved' | 'rejected';

export interface Testimonial {
  id: string | number;
  quote: string;
  author: string;
  cycle?: string; // Optional now as user input might not have it
  roles: TestimonialRole[];
  pl?: number; // Optional
  rating: number;
  photoUrl?: string;
  videoUrl?: string;
  status: TestimonialStatus;
  createdAt: string;
}