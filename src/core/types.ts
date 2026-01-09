export interface Package {
  id: number;
  name: string;
  price: string;
  description: string;
  features: string[];
  isFeatured: boolean;
  paymentLink: string;
}

export type TestimonialRole = 'Inicial' | 'Avanzado' | 'PL' | 'Senior' | 'Staff' | 'Coach' | 'Participante';
export type TestimonialStatus = 'pending' | 'approved' | 'rejected';

export interface Testimonial {
  id: string | number;
  quote: string;
  author: string;
  cycle?: string;
  roles: TestimonialRole[];
  program?: string; // e.g. 'CRESER'
  camada?: string; // '27', '32'
  plName?: string; // 'Nombre de tu PL'
  camadaName?: string; // 'Nombre de tu camada'
  hasMultiplePL?: boolean;
  enrolledBy?: string; // 'Quien te enrollo'
  rating: number; // Supports 4.5 etc.
  photoUrl?: string;
  videoUrl?: string;
  status: TestimonialStatus;
  createdAt: string;
}