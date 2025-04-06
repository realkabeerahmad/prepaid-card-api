import { CardPrograms } from "src/card-program/card-program.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { CardMoreInfos } from "./card-more-info.entity";
import { CardFunds } from "./card-balance.entity";
import { Customers } from "src/customer/customer.entity";

export enum CardStatus {
    ACTIVE = 'A',
    BLOCKED = 'B',
    CLOSED = 'C',
    EXPIRED = 'E',
    PREACTIVE = 'P',
    INACTIVE = 'I',
    FRAUDBLOCKED = 'F',
    REISSUED = 'R'
}

@Entity()
export class Cards {
    @PrimaryGeneratedColumn('increment')
    srno: number;

    @Column({ unique: true, nullable: false })
    card_no: string;

    @Column({ nullable: false })
    expiry: Date;

    @Column({ type: "enum", enum: CardStatus, default: CardStatus.PREACTIVE })
    status: CardStatus;

    @Column({ type: "boolean", default: true })
    atm_allowed: boolean;

    @Column({ type: "boolean", default: true })
    pos_allowed: boolean;

    @Column({ nullable: true })
    emborsing: string;

    @Column({ nullable: true })
    tracking_id: number;

    @Column({ nullable: true })
    created_at: Date;

    @Column({ nullable: true })
    first_act_on: Date;

    @Column({ nullable: true })
    last_act_on: Date;

    @ManyToOne(() => CardPrograms, (card_program) => card_program.cards)
    @JoinColumn({ name: "program_id" })
    card_program: CardPrograms;

    @OneToOne(() => CardMoreInfos, (card_more_info) => card_more_info.card, { cascade: true })
    card_more_info: CardMoreInfos;

    @OneToOne(() => CardFunds, (card_fund) => card_fund.card, { cascade: true })
    card_fund: CardFunds;

    @ManyToOne(() => Customers, (customer) => customer.cards)
    @JoinColumn({ name: "ch_id" })
    customer: Customers;
}