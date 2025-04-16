import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Cards, CardStatus } from './card.entity';
import { CardPrograms } from 'src/card-program/card-program.entity';
import { CardMoreInfos } from './card-more-info.entity';
import { CardFunds } from './card-balance.entity';
import { Customers } from 'src/customer/customer.entity';

import { CardDto, SetCardStatusCardDto } from './dto';
import { ActivateCardDto } from './dto';

import {
  compareCVV,
  compareDateOfBirth,
  compareExpiry,
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
  ) {}

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
    const programDetails = await this.cardProgramRepository.findOneBy({
      name: dto.program,
    });
    if (!programDetails) {
      Logger.error(`Card program not found: ${dto.program}`);
      throw new NotFoundException(
        `Card Program with name ${dto.program} not found!`,
      );
    }
    Logger.log(`Found card program: ${programDetails.name}`);

    let customerDetails: any;

    // Check if customer ID is provided
    if (dto.customer) {
      customerDetails = await this.customersRepository.findOneBy({
        id: Number(dto.customer),
      });
      if (!customerDetails) {
        Logger.error(`Customer with ID ${dto.customer} not found`);
        throw new NotFoundException(
          `Customer with id ${dto.customer} not found!`,
        );
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
        language: dto.profile?.language || 'en',
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

    Logger.debug(
      `Generated card number: ${cardNumber.replace(cardNumber.substring(6, 12), '******')}`,
    );
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
    Logger.log(
      `Card successfully created with card no: ${savedCard.card_no.replace(savedCard.card_no.substring(6, 12), '******')}`,
    );

    return {
      card_no: savedCard.card_no.replace(
        savedCard.card_no.substring(6, 12),
        '******',
      ),
      expiry: '**/**',
      cvv: '***',
      pin: '****',
      balance: savedCard.card_fund.balance,
      program: programDetails.name,
      customer_id: savedCard.customer?.id,
    };
  }

  async activateCard(dto: ActivateCardDto) {
    const card = await this.cardsRepository.findOne({
      where: { srno: Number(dto.card_srno) },
      relations: {
        card_program: true,
        card_more_info: true,
        customer: true,
      },
    });

    if (!card) {
      Logger.warn(`Card with Reference Number ${dto.card_srno} not found.`);
      throw new NotFoundException(
        `Card with Reference Number ${dto.card_srno} not found.`,
      );
    }

    if (card.status !== CardStatus.PREACTIVE) {
      switch (card.status) {
        case CardStatus.ACTIVE:
          throw new ForbiddenException('Card Already Activated');
        case CardStatus.CLOSED:
          throw new ForbiddenException('Closed Card');
        case CardStatus.BLOCKED:
          throw new ForbiddenException('Blocked Card');
        default:
          throw new ForbiddenException(
            'Card Activation from current status is not allowed',
          );
      }
    }

    Logger.debug(
      `Activation option on the program level is ${card.card_program.activation_option}`,
    );

    switch (card.card_program.activation_option) {
      case 1:
        if (!dto.expiry)
          throw new ForbiddenException(`Expiry Date not Provided`);
        compareExpiry(card.expiry, dto.expiry);
        break;

      case 2:
        if (dto.cvv == null) throw new ForbiddenException(`CVV not Provided`);
        compareCVV(card.card_more_info?.cvv, Number(dto.cvv));
        break;

      case 3:
        if (!dto.date_of_birth)
          throw new ForbiddenException(`Date of Birth not Provided`);
        compareDateOfBirth(card.customer?.date_of_birth, dto.date_of_birth);
        break;

      case 4:
        if (!dto.expiry || dto.cvv == null) {
          throw new ForbiddenException(
            `Either Expiry Date or CVV not Provided`,
          );
        }
        compareExpiry(card.expiry, dto.expiry);
        compareCVV(card.card_more_info?.cvv, Number(dto.cvv));
        break;

      case 5:
        if (!dto.date_of_birth || dto.cvv == null) {
          throw new ForbiddenException(
            `Either Date of Birth or CVV not Provided`,
          );
        }
        compareDateOfBirth(card.customer?.date_of_birth, dto.date_of_birth);
        compareCVV(card.card_more_info?.cvv, Number(dto.cvv));
        break;

      case 0:
        if (!dto.expiry || !dto.date_of_birth || dto.cvv == null) {
          throw new ForbiddenException(`Expiry, DOB, or CVV not Provided`);
        }
        compareExpiry(card.expiry, dto.expiry);
        compareDateOfBirth(card.customer?.date_of_birth, dto.date_of_birth);
        compareCVV(card.card_more_info?.cvv, Number(dto.cvv));
        break;

      default:
        throw new ForbiddenException(`Unsupported activation option`);
    }

    card.status = CardStatus.ACTIVE;
    card.first_act_on = new Date();
    await this.cardsRepository.save(card);

    Logger.log(`Card ${card.card_no} activated successfully.`);
    return {
      message: `Card with Card Sr. No. ${card.srno} Activated Successfully`,
      card: card,
    };
  }

  async setCardStatus(dto: SetCardStatusCardDto) {
    const card = await this.cardsRepository.findOne({
      where: { srno: Number(dto.card_srno) },
    });

    if (!card) {
      throw new NotFoundException(`Card with srno ${dto.card_srno} not found`);
    }

    card.status = CardStatus[dto.status as keyof typeof CardStatus];

    await this.cardsRepository.save(card);

    return {
      message: `Card status updated to ${dto.status}`,
      card_srno: dto.card_srno,
    };
  }

  private async validateCardForTransaction(card: Cards) {
    if (![CardStatus.ACTIVE, CardStatus.PREACTIVE].includes(card.status)) {
      throw new ForbiddenException(`Card status is not ACTIVE or PREACTIVE`);
    }

    if (new Date(card.expiry) < new Date()) {
      throw new ForbiddenException(`Card is expired`);
    }
  }

  async creditFunds(dto: { srno: string; amount: number }) {
    const card = await this.cardsRepository.findOne({
      where: { srno: Number(dto.srno) },
      relations: ['card_fund'],
    });

    if (!card) throw new NotFoundException(`Card not found`);

    await this.validateCardForTransaction(card);

    card.card_fund.balance += dto.amount;
    card.card_fund.ledger += dto.amount;
    card.card_fund.last_trans_dt = new Date();

    await this.cardFundsRepository.save(card.card_fund);

    return {
      message: 'Funds credited successfully',
      balance: card.card_fund.balance,
    };
  }

  async debitFunds(dto: { srno: string; amount: number }) {
    const card = await this.cardsRepository.findOne({
      where: { srno: Number(dto.srno) },
      relations: ['card_fund'],
    });

    if (!card) throw new NotFoundException(`Card not found`);

    await this.validateCardForTransaction(card);

    if (card.card_fund.balance < dto.amount) {
      throw new ForbiddenException(`Insufficient balance`);
    }

    card.card_fund.balance -= dto.amount;
    card.card_fund.ledger -= dto.amount;
    card.card_fund.last_trans_dt = new Date();

    await this.cardFundsRepository.save(card.card_fund);

    return {
      message: 'Funds debited successfully',
      balance: card.card_fund.balance,
    };
  }

  async preAuth(dto: { srno: string; amount: number }) {
    const card = await this.cardsRepository.findOne({
      where: { srno: Number(dto.srno) },
      relations: ['card_fund'],
    });

    if (!card) throw new NotFoundException(`Card not found`);

    await this.validateCardForTransaction(card);

    if (card.card_fund.balance < dto.amount) {
      throw new ForbiddenException(`Insufficient balance`);
    }

    card.card_fund.balance -= dto.amount;
    card.card_fund.last_trans_dt = new Date();

    await this.cardFundsRepository.save(card.card_fund);

    return {
      message: 'Pre-authorization successful',
      balance: card.card_fund.balance,
    };
  }

  async applyFee(dto: { srno: string; amount: number }) {
    const card = await this.cardsRepository.findOne({
      where: { srno: Number(dto.srno) },
      relations: ['card_fund'],
    });

    if (!card) throw new NotFoundException(`Card not found`);

    await this.validateCardForTransaction(card);

    if (
      card.card_fund.balance < dto.amount ||
      card.card_fund.ledger < dto.amount
    ) {
      throw new ForbiddenException(`Insufficient balance or ledger for fee`);
    }

    card.card_fund.balance -= dto.amount;
    card.card_fund.ledger -= dto.amount;
    card.card_fund.last_trans_dt = new Date();

    await this.cardFundsRepository.save(card.card_fund);

    return {
      message: 'Fee applied successfully',
      balance: card.card_fund.balance,
    };
  }
}
