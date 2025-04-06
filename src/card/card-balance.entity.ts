import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Cards } from "./card.entity";

@Entity()
export class CardFunds {
    @PrimaryGeneratedColumn('increment')
    srno: number;

    @Column({ nullable: false, default: 0 })
    balance: number;

    @Column({ nullable: false, default: 0 })
    ledger: number;

    @Column({ nullable: true })
    last_trans_dt: Date;

    @OneToOne(() => Cards, (card) => card.card_fund)
    @JoinColumn({ name: "card_srno" })
    card: Cards;
}