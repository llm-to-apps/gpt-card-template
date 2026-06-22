export type PublicProfileDto = {
  id: string;
  locale: string;
  fallbackLocale: string | null;
  onboardingComplete: boolean;
  photoUrl: string | null;
  name: string | null;
  title: string | null;
  location: string | null;
  age: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactWhatsApp: string | null;
  contactTelegram: string | null;
  contactWebsite: string | null;
  agentChatUrl: string | null;
  currency: string;
  timeZone: string;
  firstDayOfWeek: number;
  professionalProfile: string | null;
  expertise: string | null;
  casesAndResults: string | null;
  experienceAndAchievements: string | null;
  collaborationFormats: string | null;
  showAvailability: boolean;
};

export type AvailabilitySlotDto = {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  price: number | null;
};

export type ExceptionDto = {
  id: string;
  date: string;
  note: string | null;
};

export type AvailableBookingSlotDto = {
  date: string;
  weekday: number;
  startAt: string;
  endAt: string;
  label: string;
  price: number | null;
  booked: boolean;
};

export type ConsultationRequestDto = {
  id: string;
  requestedStartAt: string;
  requestedEndAt: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string;
  requestDescription: string;
  status: 'NEW' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
};

export type CardSnapshotDto = {
  profile: PublicProfileDto;
  availabilitySlots: AvailabilitySlotDto[];
  exceptions: ExceptionDto[];
  availableBookingSlots: AvailableBookingSlotDto[];
  consultationRequests?: ConsultationRequestDto[];
  isAdmin: boolean;
};
