export interface WelcomeMailContext {
  firstName: string;
  frontendUrl: string;
}

export interface VerifyEmailMailContext {
  firstName: string;
  verificationCode: string;
  expiresMinutes: number;
}

export interface ResetPasswordMailContext {
  firstName: string;
  resetUrl: string;
}

export interface BookingRequestAgencyMailContext {
  agencyName: string;
  bookingReference: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  carName: string;
  startDate: string;
  endDate: string;
  totalPrice: string;
  dashboardUrl: string;
}

export interface BookingConfirmedMailContext {
  clientName: string;
  bookingReference: string;
  agencyName: string;
  carName: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  totalPrice: string;
}

export interface BookingRejectedMailContext {
  clientName: string;
  bookingReference: string;
  agencyName: string;
  carName: string;
  rejectionReason?: string;
}

export interface BookingCancelledMailContext {
  recipientName: string;
  bookingReference: string;
  agencyName: string;
  carName: string;
  cancelledBy: string;
  cancellationReason?: string;
}

export interface BookingCompletedMailContext {
  clientName: string;
  bookingReference: string;
  agencyName: string;
  carName: string;
  reviewUrl: string;
}

export interface TeamInvitationMailContext {
  inviteeEmail: string;
  agencyName: string;
  role: string;
  invitedByName: string;
  invitationUrl: string;
}

export interface AgencyPendingMailContext {
  agencyName: string;
  ownerName: string;
  ownerEmail: string;
  city: string;
  adminDashboardUrl: string;
}

export interface AgencyApprovedMailContext {
  ownerName: string;
  agencyName: string;
  dashboardUrl: string;
}

export interface ContactMessageMailContext {
  name: string;
  email: string;
  subject: string;
  message: string;
}
