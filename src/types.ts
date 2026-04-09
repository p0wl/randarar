export interface Credential {
  email: string;
  password: string;
}

export type BookingStatus = 'pending' | 'booked' | 'failed';

export interface BookingRequest {
  id: string;
  url: string;
  credentialId: string;
  status: BookingStatus;
  createdAt: string;
  bookedAt?: string;
  error?: string;
}

export interface BookingResult {
  success: boolean;
  notOpenYet?: boolean;
  message: string;
}
