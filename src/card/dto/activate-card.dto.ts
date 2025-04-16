import {
  IsDateString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
} from 'class-validator';

export class ActivateCardDto {
  @IsNumberString()
  @IsNotEmpty()
  card_srno: Number;

  @IsOptional()
  @IsDateString()
  expiry?: Date; // ✅ Changed from Date to string for consistency with IsDateString

  @IsOptional()
  @IsNumberString()
  cvv?: Number; // ✅ Use string here because IsNumberString expects string input

  @IsOptional()
  @IsDateString()
  date_of_birth?: Date; // ✅ ISO string like '1990-01-01'
}
