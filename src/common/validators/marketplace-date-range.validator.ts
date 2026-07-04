import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsValidMarketplaceDateRange', async: false })
export class IsValidMarketplaceDateRangeConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as { start_date?: string; end_date?: string };
    const hasStart = !!obj.start_date;
    const hasEnd = !!obj.end_date;

    if (hasStart !== hasEnd) {
      return false;
    }

    if (!hasStart || !hasEnd) {
      return true;
    }

    const start = this.toDateOnly(obj.start_date!);
    const end = this.toDateOnly(obj.end_date!);
    const today = this.toDateOnly(new Date().toISOString().slice(0, 10));

    return end > start && start >= today;
  }

  defaultMessage(): string {
    return 'start_date and end_date must both be provided, end_date must be after start_date, and start_date must be today or later';
  }

  private toDateOnly(value: string): Date {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}

export function IsValidMarketplaceDateRange(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      constraints: [],
      validator: IsValidMarketplaceDateRangeConstraint,
    });
  };
}
