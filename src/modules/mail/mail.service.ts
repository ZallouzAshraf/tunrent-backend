import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import {
  AgencyApprovedMailContext,
  AgencyPendingMailContext,
  BookingCancelledMailContext,
  BookingCompletedMailContext,
  BookingConfirmedMailContext,
  BookingRejectedMailContext,
  BookingRequestAgencyMailContext,
  ResetPasswordMailContext,
  TeamInvitationMailContext,
  VerifyEmailMailContext,
  WelcomeMailContext,
} from './interfaces/mail-context.interface';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendWelcome(to: string, context: WelcomeMailContext): Promise<void> {
    await this.send(to, 'Bienvenue sur TunRent', 'welcome', context);
  }

  async sendVerifyEmail(
    to: string,
    context: VerifyEmailMailContext,
  ): Promise<void> {
    await this.send(
      to,
      'Vérifiez votre adresse email',
      'verify-email',
      context,
    );
  }

  async sendResetPassword(
    to: string,
    context: ResetPasswordMailContext,
  ): Promise<void> {
    await this.send(
      to,
      'Réinitialisation de votre mot de passe',
      'reset-password',
      context,
    );
  }

  async sendBookingRequestAgency(
    to: string,
    context: BookingRequestAgencyMailContext,
  ): Promise<void> {
    await this.send(
      to,
      `Nouvelle demande de réservation — ${context.bookingReference}`,
      'booking-request-agency',
      context,
    );
  }

  async sendBookingConfirmed(
    to: string,
    context: BookingConfirmedMailContext,
  ): Promise<void> {
    await this.send(
      to,
      `Réservation confirmée — ${context.bookingReference}`,
      'booking-confirmed-client',
      context,
    );
  }

  async sendBookingRejected(
    to: string,
    context: BookingRejectedMailContext,
  ): Promise<void> {
    await this.send(
      to,
      `Réservation refusée — ${context.bookingReference}`,
      'booking-rejected-client',
      context,
    );
  }

  async sendBookingCancelled(
    to: string,
    context: BookingCancelledMailContext,
  ): Promise<void> {
    await this.send(
      to,
      `Réservation annulée — ${context.bookingReference}`,
      'booking-cancelled',
      context,
    );
  }

  async sendBookingCompleted(
    to: string,
    context: BookingCompletedMailContext,
  ): Promise<void> {
    await this.send(
      to,
      `Location terminée — ${context.bookingReference}`,
      'booking-completed',
      context,
    );
  }

  async sendTeamInvitation(
    to: string,
    context: TeamInvitationMailContext,
  ): Promise<void> {
    await this.send(
      to,
      `Invitation à rejoindre ${context.agencyName}`,
      'team-invitation',
      context,
    );
  }

  async sendAgencyPending(
    to: string,
    context: AgencyPendingMailContext,
  ): Promise<void> {
    await this.send(
      to,
      `Nouvelle agence en attente — ${context.agencyName}`,
      'agency-pending',
      context,
    );
  }

  async sendAgencyApproved(
    to: string,
    context: AgencyApprovedMailContext,
  ): Promise<void> {
    await this.send(
      to,
      `Votre agence a été approuvée — ${context.agencyName}`,
      'agency-approved',
      context,
    );
  }

  private async send(
    to: string,
    subject: string,
    template: string,
    context: object,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template,
        context,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send email "${subject}" to ${to}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }
}
