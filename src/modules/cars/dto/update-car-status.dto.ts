import { IsEnum, IsNotIn } from 'class-validator';
import { CarStatus } from '../../../common/enums';

export class UpdateCarStatusDto {
  @IsEnum(CarStatus)
  @IsNotIn([CarStatus.RENTED], {
    message: 'Car status cannot be set to rented manually',
  })
  status: CarStatus;
}
