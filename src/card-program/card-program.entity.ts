import { Cards } from 'src/card/card.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export enum CardProgramType {
  PREPAID = 'P',
  DEBIT = 'D',
  CREDIT = 'C',
}

export enum Network {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  UNIONPAY = 'UNIONPAY',
  DISCOVER = 'DISCOVER',
}

export enum pin_options {
  LAST4DIGITSOFCARDNO = 1,
  RANDOMNUMBERS = 2,
}

export enum activation_option {
  EXPIRY = 1,
  CVV = 2,
  DATEOFBIRTH = 3,
  DATEOFBIRTH_CVV = 4,
  EXPIRY_CVV = 5,
  ALL = 0,
}

@Entity()
export class CardPrograms {
  @PrimaryGeneratedColumn('increment')
  id: Number;

  @Column({ unique: true })
  name: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: CardProgramType,
    default: CardProgramType.PREPAID,
  })
  type: string;

  @Column({ type: 'enum', enum: Network })
  network: string;

  @Column({
    type: 'enum',
    enum: pin_options,
    default: pin_options.LAST4DIGITSOFCARDNO,
  })
  pin_option: Number;

  @Column({
    type: 'enum',
    enum: activation_option,
    default: activation_option.EXPIRY,
  })
  activation_option: Number;

  @Column()
  bin: Number;

  @Column()
  starting_number: Number;

  @Column()
  atm_allowed: boolean;

  @Column()
  pos_allowed: boolean;

  @Column()
  currency_code: string;

  @Column({ nullable: true })
  country: string;

  @Column()
  expiry_months: Number;

  @Column()
  email: string;

  @OneToMany(() => Cards, (card) => card.card_program)
  cards: Cards[];
}
