import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cards } from './card.entity';
import { CardPrograms } from 'src/card-program/card-program.entity';
import { CardMoreInfos } from './card-more-info.entity';
import { CardFunds } from './card-balance.entity';
import { Customers } from 'src/customer/customer.entity';
import { CardDto } from './dto';

import {
    generateCard,
    generateCvv,
    generateExpiry,
    generatePin,
} from 'src/common/utils/card.utils';

@Injectable()
export class CardProvider {
    constructor(
        @InjectRepository(Cards)
        private cardsRepository: Repository<Cards>,
        @InjectRepository(CardMoreInfos)
        private cardMoreInfosRepository: Repository<CardMoreInfos>,
        @InjectRepository(CardFunds)
        private cardFundsRepository: Repository<CardFunds>,
        @InjectRepository(CardPrograms)
        private cardProgramRepository: Repository<CardPrograms>,
        @InjectRepository(Customers)
        private customersRepository: Repository<Customers>,
    ) { }

    /**
     * Creates and saves a new card using the provided data transfer object.
     * 
     * @param dto - The CardDto object containing all input data
     * @returns An object with masked card info and program details
     * @throws NotFoundException if card program or customer (by ID) is not found
     */
    async addCard(dto: CardDto) {
        Logger.log(`Received card creation request for program: ${dto.program}`);

        // Find program details
        const programDetails = await this.cardProgramRepository.findOneBy({ name: dto.program });
        if (!programDetails) {
            Logger.error(`Card program not found: ${dto.program}`);
            throw new NotFoundException(`Card Program with name ${dto.program} not found!`);
        }
        Logger.log(`Found card program: ${programDetails.name}`);

        let customerDetails: any;

        // Check if customer ID is provided
        if (dto.customer) {
            customerDetails = await this.customersRepository.findOneBy({ id: Number(dto.customer) });
            if (!customerDetails) {
                Logger.error(`Customer with ID ${dto.customer} not found`);
                throw new NotFoundException(`Customer with id ${dto.customer} not found!`);
            }
            Logger.log(`Existing customer linked: ID ${customerDetails.id}`);
        } else {
            Logger.log(`No customer ID provided. Creating new customer...`);
            customerDetails = this.customersRepository.create({
                first_name: dto.profile?.first_name,
                middle_name: dto.profile?.middle_name,
                last_name: dto.profile?.last_name,
                address1: dto.profile?.address1,
                address2: dto.profile?.address2,
                city: dto.profile?.city,
                state: dto.profile?.state,
                country: dto.profile?.country || programDetails.country,
                date_of_birth: dto.profile?.date_of_birth,
                gender: dto.profile?.gender,
                language: dto.profile?.language || "en",
                ssn: dto.profile?.ssn,
                mobile: dto.profile?.mobile,
                phone: dto.profile?.phone,
                email: dto.profile?.email,
                mother_maidn_name: dto.profile?.mother_maidn_name,
            });
            customerDetails = await this.customersRepository.save(customerDetails);
            Logger.log(`New customer created with ID: ${customerDetails.id}`);
        }

        // Generate card-related values
        const cardNumber = generateCard(String(programDetails.starting_number));
        const expiryDate = generateExpiry(Number(programDetails.expiry_months));
        const cvv = generateCvv();
        const pin = generatePin(programDetails.pin_option, cardNumber);

        Logger.debug(`Generated card number: ${cardNumber.replace(cardNumber.substring(6, 12), '******')}`);
        Logger.log(`Generated CVV, PIN, and Expiry`);

        // Build card entity
        const card = new Cards();
        card.card_no = cardNumber;
        card.expiry = expiryDate;
        card.atm_allowed = !!programDetails.atm_allowed;
        card.pos_allowed = !!programDetails.pos_allowed;
        card.emborsing = String(dto.emborsing);
        card.created_at = new Date();
        card.card_program = programDetails;
        card.customer = customerDetails;

        // Related card info
        const cardMoreInfo = new CardMoreInfos();
        cardMoreInfo.cvv = Number(cvv);
        cardMoreInfo.pin = Number(pin);
        card.card_more_info = cardMoreInfo;

        // Related funds
        const cardFund = new CardFunds();
        cardFund.balance = dto.funds || 0;
        cardFund.ledger = dto.funds || 0;
        cardFund.last_trans_dt = new Date();
        card.card_fund = cardFund;

        // Save everything
        const savedCard = await this.cardsRepository.save(card);
        Logger.log(`Card successfully created with card no: ${savedCard.card_no.replace(savedCard.card_no.substring(6, 12), '******')}`);

        return {
            card_no: savedCard.card_no.replace(savedCard.card_no.substring(6, 12), '******'),
            expiry: '**/**',
            cvv: '***',
            pin: '****',
            balance: savedCard.card_fund.balance,
            program: programDetails.name,
            customer_id: savedCard.customer?.id,
        };
    }
}
