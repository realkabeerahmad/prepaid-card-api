import { IsBooleanString, IsEmail, IsInt, isNotEmpty, IsNotEmpty, IsNumberString, IsPositive, IsString, Matches, MaxLength } from "class-validator";

export class CardProgramDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^[A-Za-z0-9_]+$/, {
        message: 'Name can only contain letters, numbers, and underscores (no spaces or special characters)',
    })
    name: string;

    @IsString()
    description: string;

    @IsString()
    @MaxLength(1)
    @IsNotEmpty()
    type: string

    @IsString()
    @IsNotEmpty()
    network: string

    @IsNumberString()
    @IsNotEmpty()
    bin: string

    @IsNumberString()
    @IsNotEmpty()
    starting_number: string

    @IsNumberString()
    @IsNotEmpty()
    pin_option: string

    @IsBooleanString()
    @IsNotEmpty()
    atm_allowed: boolean

    @IsBooleanString()
    @IsNotEmpty()
    pos_allowed: boolean

    @IsString()
    @IsNotEmpty()
    currency_code: string

    // @IsNumberString()
    @IsPositive()
    @IsInt()
    @IsNotEmpty()
    expiry_months: Number

    @IsEmail()
    @IsNotEmpty()
    email: string
}