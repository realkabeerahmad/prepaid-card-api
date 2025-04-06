import {
    IsNotEmpty,
    IsNumber,
    IsNumberString,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CardProfileDto {
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    middleName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsString()
    address1?: string;

    @IsOptional()
    @IsString()
    address2?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsString()
    dateOfBirth?: string;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsString()
    language?: string;

    @IsOptional()
    @IsString()
    ssn?: string;

    @IsOptional()
    @IsString()
    mobile?: string;

    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    motherMaidnName?: string;
}

export class CardDto {
    @IsString()
    @IsNotEmpty()
    program: string;

    @IsOptional()
    @IsNumber()
    funds?: number;

    @IsOptional()
    @IsString()
    emborsing?: string;

    @IsOptional()
    @IsNumberString()
    customer?: string;

    @IsOptional()
    @IsObject()
    @ValidateNested()
    @Type(() => CardProfileDto)
    profile?: CardProfileDto;
}
