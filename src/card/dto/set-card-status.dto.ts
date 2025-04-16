import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class SetCardStatusCardDto {
    @IsNumberString()
    @IsNotEmpty()
    card_srno: Number;

    @IsString()
    @IsNotEmpty() // ❗If required
    // @IsOptional() ❗If optional, use this instead of @IsNotEmpty()
    status: string;
}
