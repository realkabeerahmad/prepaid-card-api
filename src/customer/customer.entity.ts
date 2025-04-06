import { Cards } from "src/card/card.entity";
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Customers {
    @PrimaryGeneratedColumn('increment')
    id: Number

    @Column({ nullable: true })
    firstName: string

    @Column({ nullable: true })
    middleName: string

    @Column({ nullable: true })
    lastName: string

    @Column({ nullable: true })
    address1: string

    @Column({ nullable: true })
    address2: string

    @Column({ nullable: true })
    city: string

    @Column({ nullable: true })
    state: string

    @Column({ nullable: true })
    country: string

    @Column({ nullable: true })
    dateOfBirth: string

    @Column({ nullable: true })
    gender: string

    @Column({ nullable: true })
    language: string

    @Column({ nullable: true })
    ssn: string

    @Column({ nullable: true })
    mobile: string

    @Column({ nullable: true })
    phone: string

    @Column({ nullable: true })
    email: string

    @Column({ nullable: true })
    motherMaidnName: string

    @OneToMany(() => Cards, (card) => card.customer)
    cards: Cards[];
}