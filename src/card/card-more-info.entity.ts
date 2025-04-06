import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Cards } from "./card.entity";

@Entity()
export class CardMoreInfos {
    @PrimaryGeneratedColumn('increment')
    srno: number;

    @Column({ nullable: false })
    cvv: number;

    @Column({ nullable: false })
    pin: number;

    @OneToOne(() => Cards, (card) => card.card_more_info)
    @JoinColumn({ name: "card_srno" })
    card: Cards;
}