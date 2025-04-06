import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cards } from './card.entity';
import { Repository } from 'typeorm';
import { CardPrograms } from 'src/card-program/card-program.entity';
import { CardMoreInfos } from './card-more-info.entity';
import { CardFunds } from './card-balance.entity';
import { CardDto } from './dto';
import { generateCard, generateCvv, generateExpiry, generatePin } from 'src/common/utils/card.utils';
import { Customers } from 'src/customer/customer.entity';

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

    async addCard(dto: CardDto) {
        const programDetails = await this.cardProgramRepository.findOneBy({ name: dto.program });
        let customerDetails: any = null;
        if (!programDetails) {
            throw new NotFoundException(`Card Program with name ${dto.program} not found!`)
        }
        if (dto.customer) {
            customerDetails = await this.customersRepository.findOneBy({ id: Number(dto.customer) });
            if (!customerDetails) {
                throw new NotFoundException(`Cutomer with id ${dto.customer} not found!`)
            }
        }


        // Generate Card
        const cardNumber = generateCard(String(programDetails.starting_number));
        // Generate Expiry
        const expiryDate = generateExpiry(Number(programDetails.expiry_months));
        // Generate CVV
        const cvv = generateCvv();
        // Generate PIN
        const pin = generatePin(programDetails.pin_option, cardNumber);

        // Create card entity
        const card = new Cards();

        // Add data to the relevant fields
        card.card_no = cardNumber;
        card.expiry = expiryDate;
        card.atm_allowed = Boolean(programDetails.atm_allowed);
        card.pos_allowed = Boolean(programDetails.pos_allowed);
        card.emborsing = String(dto.emborsing);
        card.created_at = new Date();
        card.card_program = programDetails;

        // Create related entities
        const card_more_info = new CardMoreInfos();
        card_more_info.cvv = Number(cvv);
        card_more_info.pin = Number(pin);
        card.card_more_info = card_more_info;

        const card_fund = new CardFunds();
        card_fund.balance = dto.funds || 0;
        card_fund.ledger = dto.funds || 0;
        card_fund.last_trans_dt = new Date();
        card.card_fund = card_fund;

        // Save card (which will cascade save the related entities)
        const savedCard = await this.cardsRepository.save(card);

        Logger.debug('Card created:', savedCard);

        return {
            card_no: savedCard.card_no.replace(savedCard.card_no.substring(6, 12), '******'),
            expiry: "**/**",
            cvv: "***",
            pin: "****",
            balance: savedCard.card_fund.balance,
            program: programDetails.name
        };
    }
}