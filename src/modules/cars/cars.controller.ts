import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentAgency } from '../../common/decorators/current-agency.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AgencyMemberGuard } from '../../common/guards/agency-member.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AgencyUserRole } from '../../common/enums';
import { CarsService } from './cars.service';
import { CarQueryDto } from './dto/car-query.dto';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { UpdateCarStatusDto } from './dto/update-car-status.dto';

@Controller('dashboard/cars')
@UseGuards(JwtAuthGuard, AgencyMemberGuard)
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Get()
  findAll(@CurrentAgency() agencyId: string, @Query() query: CarQueryDto) {
    return this.carsService.findAll(agencyId, query);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(AgencyUserRole.OWNER, AgencyUserRole.MANAGER)
  create(
    @CurrentAgency() agencyId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCarDto,
  ) {
    return this.carsService.create(agencyId, dto, user.sub);
  }

  @Get(':id')
  findById(@CurrentAgency() agencyId: string, @Param('id') carId: string) {
    return this.carsService.findById(carId, agencyId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(AgencyUserRole.OWNER, AgencyUserRole.MANAGER)
  update(
    @CurrentAgency() agencyId: string,
    @Param('id') carId: string,
    @Body() dto: UpdateCarDto,
  ) {
    return this.carsService.update(carId, agencyId, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(AgencyUserRole.OWNER, AgencyUserRole.MANAGER)
  softDelete(@CurrentAgency() agencyId: string, @Param('id') carId: string) {
    return this.carsService.softDelete(carId, agencyId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(AgencyUserRole.OWNER, AgencyUserRole.MANAGER)
  updateStatus(
    @CurrentAgency() agencyId: string,
    @Param('id') carId: string,
    @Body() dto: UpdateCarStatusDto,
  ) {
    return this.carsService.updateStatus(carId, agencyId, dto);
  }

  @Post(':id/photos')
  @UseGuards(RolesGuard)
  @Roles(AgencyUserRole.OWNER, AgencyUserRole.MANAGER)
  @UseInterceptors(FileInterceptor('file'))
  addPhoto(
    @CurrentAgency() agencyId: string,
    @Param('id') carId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.carsService.addPhoto(carId, agencyId, file);
  }

  @Delete(':id/photos/:photoIndex')
  @UseGuards(RolesGuard)
  @Roles(AgencyUserRole.OWNER, AgencyUserRole.MANAGER)
  removePhoto(
    @CurrentAgency() agencyId: string,
    @Param('id') carId: string,
    @Param('photoIndex', ParseIntPipe) photoIndex: number,
  ) {
    return this.carsService.removePhoto(carId, agencyId, photoIndex);
  }
}
