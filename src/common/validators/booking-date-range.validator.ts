import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsValidBookingDateRange', async: false })
export class IsValidBookingDateRangeConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { startDate?: string; endDate?: string };

    if (!obj.startDate || !obj.endDate) {
      return true;
    }

    const start = this.toDateOnly(obj.startDate);
    const end = this.toDateOnly(obj.endDate);
    const today = this.toDateOnly(new Date().toISOString().slice(0, 10));

    return end > start && start >= today;
  }

  defaultMessage(): string {
    return 'endDate must be after startDate and startDate must be today or later';
  }

  private toDateOnly(value: string): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}

export function IsValidBookingDateRange(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      constraints: [],
      validator: IsValidBookingDateRangeConstraint,
    });
  };
}
