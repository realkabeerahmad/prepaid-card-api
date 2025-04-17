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

/**
 * CardProvider Service
 *
 * This service handles all card-related operations including:
 * - Card creation and activation
 * - Card status management
 * - Fund operations (credit, debit, pre-auth, fees)
 *
 * Logging Strategy:
 * - INFO: Major operations and state changes
 * - DEBUG: Detailed data processing (masked sensitive info)
 * - WARN: Non-critical issues
 * - ERROR: Critical failures
 */
@Injectable()
export class CardProvider {
  private readonly logger = new Logger(CardProvider.name);

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

  // MARK: - Card Lifecycle Operations

  /**
   * Creates a new card with associated customer and funding
   *
   * Flow:
   * 1. Validate card program exists
   * 2. Find or create customer
   * 3. Generate card details (number, CVV, PIN, expiry)
   * 4. Create card entity with relationships
   * 5. Save all entities
   *
   * @param dto - Card creation data
   * @returns Masked card details
   * @throws NotFoundException if program not found
   */
  async addCard(dto: CardDto) {
    this.logger.log(`[Card Creation] Initiated for program: ${dto.program}`);
    this.logger.debug(
      `Request payload: ${JSON.stringify({
        ...dto,
        profile: dto.profile ? { ...dto.profile, ssn: '***' } : null,
      })}`,
    );

    // Step 1: Validate card program
    const programDetails = await this.cardProgramRepository.findOneBy({
      name: dto.program,
    });
    if (!programDetails) {
      this.logger.error(`[Card Creation] Program not found: ${dto.program}`);
      throw new NotFoundException(
        `Card Program with name ${dto.program} not found!`,
      );
    }
    this.logger.log(
      `[Card Creation] Program validated: ${programDetails.name}`,
    );

    // Step 2: Handle customer association
    let customerDetails: any;
    if (dto.customer) {
      this.logger.debug(
        `[Card Creation] Looking up existing customer ID: ${dto.customer}`,
      );
      customerDetails = await this.customersRepository.findOneBy({
        id: Number(dto.customer),
      });
      if (!customerDetails) {
        this.logger.error(
          `[Card Creation] Customer not found: ID ${dto.customer}`,
        );
        throw new NotFoundException(
          `Customer with id ${dto.customer} not found!`,
        );
      }
      this.logger.log(
        `[Card Creation] Linked to existing customer ID: ${customerDetails.id}`,
      );
    } else {
      this.logger.log(`[Card Creation] Creating new customer record`);
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
      this.logger.log(
        `[Card Creation] New customer created ID: ${customerDetails.id}`,
      );
    }

    // Step 3: Generate card security details
    this.logger.debug(`[Card Creation] Generating card security details`);
    const cardNumber = generateCard(String(programDetails.starting_number));
    const expiryDate = generateExpiry(Number(programDetails.expiry_months));
    const cvv = generateCvv();
    const pin = generatePin(programDetails.pin_option, cardNumber);

    this.logger.debug(
      `[Card Creation] Generated PAN: ${cardNumber.substring(0, 6)}******${cardNumber.substring(12)}`,
    );
    this.logger.debug(`[Card Creation] Generated expiry: ${expiryDate}`);
    this.logger.debug(
      `[Card Creation] Generated CVV: *** (length: ${cvv.length})`,
    );
    this.logger.debug(
      `[Card Creation] Generated PIN: **** (length: ${String(pin).length})`,
    );

    // Step 4: Build card entity with relationships
    this.logger.debug(`[Card Creation] Building card entity structure`);
    const card = new Cards();
    card.card_no = cardNumber;
    card.expiry = expiryDate;
    card.atm_allowed = !!programDetails.atm_allowed;
    card.pos_allowed = !!programDetails.pos_allowed;
    card.emborsing = String(dto.emborsing);
    card.created_at = new Date();
    card.card_program = programDetails;
    card.customer = customerDetails;
    card.status = CardStatus.PREACTIVE;

    // Card metadata
    const cardMoreInfo = new CardMoreInfos();
    cardMoreInfo.cvv = Number(cvv);
    cardMoreInfo.pin = Number(pin);
    card.card_more_info = cardMoreInfo;

    // Initial funding
    const cardFund = new CardFunds();
    cardFund.balance = dto.funds || 0;
    cardFund.ledger = dto.funds || 0;
    cardFund.last_trans_dt = new Date();
    card.card_fund = cardFund;

    // Step 5: Persist all entities
    this.logger.debug(`[Card Creation] Saving card to database`);
    const savedCard = await this.cardsRepository.save(card);
    this.logger.log(
      `[Card Creation] Success - Card ID: ${savedCard.srno}, PAN: ${savedCard.card_no.substring(0, 6)}******${savedCard.card_no.substring(12)}`,
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
      card_srno: savedCard.srno,
    };
  }

  /**
   * Activates a pre-active card after validating activation requirements
   *
   * Activation options:
   * 0: Expiry + DOB + CVV
   * 1: Expiry only
   * 2: CVV only
   * 3: DOB only
   * 4: Expiry + CVV
   * 5: DOB + CVV
   *
   * @param dto Activation request data
   * @returns Activation confirmation
   * @throws NotFoundException if card not found
   * @throws ForbiddenException for invalid activation attempts
   */
  async activateCard(dto: ActivateCardDto) {
    this.logger.log(
      `[Card Activation] Initiated for card SRNO: ${dto.card_srno}`,
    );
    this.logger.debug(
      `Activation payload: ${JSON.stringify({
        ...dto,
        cvv: dto.cvv ? '***' : null,
        expiry: dto.expiry ? '**/**' : null,
      })}`,
    );

    // Retrieve card with relationships
    const card = await this.cardsRepository.findOne({
      where: { srno: Number(dto.card_srno) },
      relations: {
        card_program: true,
        card_more_info: true,
        customer: true,
      },
    });

    if (!card) {
      this.logger.warn(
        `[Card Activation] Card not found - SRNO: ${dto.card_srno}`,
      );
      throw new NotFoundException(
        `Card with Reference Number ${dto.card_srno} not found.`,
      );
    }

    // Validate card status
    if (card.status !== CardStatus.PREACTIVE) {
      this.logger.warn(
        `[Card Activation] Invalid status attempt - Current status: ${card.status}`,
      );
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

    this.logger.debug(
      `[Card Activation] Program activation option: ${card.card_program.activation_option}`,
    );

    // Validate based on program's activation requirements
    try {
      switch (card.card_program.activation_option) {
        case 1: // Expiry only
          if (!dto.expiry) {
            this.logger.warn(`[Card Activation] Missing expiry for option 1`);
            throw new ForbiddenException(`Expiry Date not Provided`);
          }
          compareExpiry(card.expiry, dto.expiry);
          break;

        case 2: // CVV only
          if (dto.cvv == null) {
            this.logger.warn(`[Card Activation] Missing CVV for option 2`);
            throw new ForbiddenException(`CVV not Provided`);
          }
          compareCVV(card.card_more_info?.cvv, Number(dto.cvv));
          break;

        case 3: // DOB only
          if (!dto.date_of_birth) {
            this.logger.warn(`[Card Activation] Missing DOB for option 3`);
            throw new ForbiddenException(`Date of Birth not Provided`);
          }
          compareDateOfBirth(card.customer?.date_of_birth, dto.date_of_birth);
          break;

        case 4: // Expiry + CVV
          if (!dto.expiry || dto.cvv == null) {
            this.logger.warn(
              `[Card Activation] Missing expiry or CVV for option 4`,
            );
            throw new ForbiddenException(
              `Either Expiry Date or CVV not Provided`,
            );
          }
          compareExpiry(card.expiry, dto.expiry);
          compareCVV(card.card_more_info?.cvv, Number(dto.cvv));
          break;

        case 5: // DOB + CVV
          if (!dto.date_of_birth || dto.cvv == null) {
            this.logger.warn(
              `[Card Activation] Missing DOB or CVV for option 5`,
            );
            throw new ForbiddenException(
              `Either Date of Birth or CVV not Provided`,
            );
          }
          compareDateOfBirth(card.customer?.date_of_birth, dto.date_of_birth);
          compareCVV(card.card_more_info?.cvv, Number(dto.cvv));
          break;

        case 0: // Expiry + DOB + CVV
          if (!dto.expiry || !dto.date_of_birth || dto.cvv == null) {
            this.logger.warn(
              `[Card Activation] Missing expiry, DOB or CVV for option 0`,
            );
            throw new ForbiddenException(`Expiry, DOB, or CVV not Provided`);
          }
          compareExpiry(card.expiry, dto.expiry);
          compareDateOfBirth(card.customer?.date_of_birth, dto.date_of_birth);
          compareCVV(card.card_more_info?.cvv, Number(dto.cvv));
          break;

        default:
          this.logger.error(
            `[Card Activation] Invalid activation option: ${card.card_program.activation_option}`,
          );
          throw new ForbiddenException(`Unsupported activation option`);
      }
    } catch (validationError) {
      this.logger.error(
        `[Card Activation] Validation failed: ${validationError.message}`,
      );
      throw validationError;
    }

    // Update card status
    card.status = CardStatus.ACTIVE;
    card.first_act_on = new Date();
    await this.cardsRepository.save(card);

    this.logger.log(
      `[Card Activation] Success - Card SRNO: ${card.srno}, PAN: ${card.card_no.substring(0, 6)}******${card.card_no.substring(12)}`,
    );
    return {
      message: `Card with Card Sr. No. ${card.srno} Activated Successfully`,
      card_srno: card.srno,
      status: card.status,
      activated_at: card.first_act_on,
    };
  }

  /**
   * Updates card status (BLOCKED, CLOSED, etc.)
   *
   * @param dto Status update request
   * @returns Confirmation message
   * @throws NotFoundException if card not found
   */
  async setCardStatus(dto: SetCardStatusCardDto) {
    this.logger.log(
      `[Status Update] Request for card SRNO: ${dto.card_srno} to ${dto.status}`,
    );

    const card = await this.cardsRepository.findOne({
      where: { srno: Number(dto.card_srno) },
    });

    if (!card) {
      this.logger.error(
        `[Status Update] Card not found - SRNO: ${dto.card_srno}`,
      );
      throw new NotFoundException(`Card with srno ${dto.card_srno} not found`);
    }

    this.logger.debug(
      `[Status Update] Current status: ${card.status}, New status: ${dto.status}`,
    );

    // Validate status transition
    if (card.status === CardStatus.CLOSED && dto.status !== 'CLOSED') {
      this.logger.warn(
        `[Status Update] Invalid transition from CLOSED to ${dto.status}`,
      );
      throw new ForbiddenException('Cannot change status from CLOSED');
    }

    card.status = CardStatus[dto.status as keyof typeof CardStatus];
    await this.cardsRepository.save(card);

    this.logger.log(
      `[Status Update] Success - Card SRNO: ${card.srno} set to ${dto.status}`,
    );
    return {
      message: `Card status updated to ${dto.status}`,
      card_srno: dto.card_srno,
      previous_status: card.status,
      updated_at: new Date(),
    };
  }

  // MARK: - Fund Operations

  /**
   * Validates card for financial transactions
   *
   * @param card Card entity
   * @throws ForbiddenException if card is not eligible for transactions
   */
  private async validateCardForTransaction(card: Cards) {
    this.logger.debug(
      `[Transaction Validation] Checking card SRNO: ${card.srno}`,
    );

    if (![CardStatus.ACTIVE, CardStatus.PREACTIVE].includes(card.status)) {
      this.logger.warn(
        `[Transaction Validation] Invalid status: ${card.status}`,
      );
      throw new ForbiddenException(`Card status is not ACTIVE or PREACTIVE`);
    }

    if (new Date(card.expiry) < new Date()) {
      this.logger.warn(
        `[Transaction Validation] Card expired on ${card.expiry}`,
      );
      throw new ForbiddenException(`Card is expired`);
    }

    this.logger.debug(
      `[Transaction Validation] Card validated for transactions`,
    );
  }

  /**
   * Credits funds to card balance
   *
   * @param dto Credit request (card SRNO and amount)
   * @returns Updated balance
   * @throws NotFoundException if card not found
   * @throws ForbiddenException if card not eligible
   */
  async creditFunds(dto: { srno: string; amount: number }) {
    this.logger.log(
      `[Credit Funds] Initiated for card SRNO: ${dto.srno}, Amount: ${dto.amount}`,
    );

    const card = await this.cardsRepository.findOne({
      where: { srno: Number(dto.srno) },
      relations: ['card_fund'],
    });

    if (!card) {
      this.logger.error(`[Credit Funds] Card not found - SRNO: ${dto.srno}`);
      throw new NotFoundException(`Card not found`);
    }

    await this.validateCardForTransaction(card);

    this.logger.debug(
      `[Credit Funds] Current balance: ${card.card_fund.balance}, Ledger: ${card.card_fund.ledger}`,
    );

    card.card_fund.balance += dto.amount;
    card.card_fund.ledger += dto.amount;
    card.card_fund.last_trans_dt = new Date();

    await this.cardFundsRepository.save(card.card_fund);

    this.logger.log(
      `[Credit Funds] Success - Card SRNO: ${card.srno}, New balance: ${card.card_fund.balance}`,
    );
    return {
      message: 'Funds credited successfully',
      card_srno: card.srno,
      amount: dto.amount,
      balance: card.card_fund.balance,
      transaction_date: card.card_fund.last_trans_dt,
    };
  }

  /**
   * Debits funds from card balance
   *
   * @param dto Debit request (card SRNO and amount)
   * @returns Updated balance
   * @throws NotFoundException if card not found
   * @throws ForbiddenException if card not eligible or insufficient funds
   */
  async debitFunds(dto: { srno: string; amount: number }) {
    this.logger.log(
      `[Debit Funds] Initiated for card SRNO: ${dto.srno}, Amount: ${dto.amount}`,
    );

    const card = await this.cardsRepository.findOne({
      where: { srno: Number(dto.srno) },
      relations: ['card_fund'],
    });

    if (!card) {
      this.logger.error(`[Debit Funds] Card not found - SRNO: ${dto.srno}`);
      throw new NotFoundException(`Card not found`);
    }

    await this.validateCardForTransaction(card);

    this.logger.debug(
      `[Debit Funds] Current balance: ${card.card_fund.balance}, Requested debit: ${dto.amount}`,
    );

    if (card.card_fund.balance < dto.amount) {
      this.logger.warn(
        `[Debit Funds] Insufficient funds - Balance: ${card.card_fund.balance}, Attempted debit: ${dto.amount}`,
      );
      throw new ForbiddenException(`Insufficient balance`);
    }

    card.card_fund.balance -= dto.amount;
    card.card_fund.ledger -= dto.amount;
    card.card_fund.last_trans_dt = new Date();

    await this.cardFundsRepository.save(card.card_fund);

    this.logger.log(
      `[Debit Funds] Success - Card SRNO: ${card.srno}, New balance: ${card.card_fund.balance}`,
    );
    return {
      message: 'Funds debited successfully',
      card_srno: card.srno,
      amount: dto.amount,
      balance: card.card_fund.balance,
      transaction_date: card.card_fund.last_trans_dt,
    };
  }

  /**
   * Pre-authorizes funds (temporarily holds amount)
   *
   * @param dto Pre-auth request (card SRNO and amount)
   * @returns Updated balance
   * @throws NotFoundException if card not found
   * @throws ForbiddenException if card not eligible or insufficient funds
   */
  async preAuth(dto: { srno: string; amount: number }) {
    this.logger.log(
      `[Pre-Auth] Initiated for card SRNO: ${dto.srno}, Amount: ${dto.amount}`,
    );

    const card = await this.cardsRepository.findOne({
      where: { srno: Number(dto.srno) },
      relations: ['card_fund'],
    });

    if (!card) {
      this.logger.error(`[Pre-Auth] Card not found - SRNO: ${dto.srno}`);
      throw new NotFoundException(`Card not found`);
    }

    await this.validateCardForTransaction(card);

    this.logger.debug(
      `[Pre-Auth] Current balance: ${card.card_fund.balance}, Requested hold: ${dto.amount}`,
    );

    if (card.card_fund.balance < dto.amount) {
      this.logger.warn(
        `[Pre-Auth] Insufficient funds - Balance: ${card.card_fund.balance}, Attempted hold: ${dto.amount}`,
      );
      throw new ForbiddenException(`Insufficient balance`);
    }

    card.card_fund.balance -= dto.amount;
    card.card_fund.last_trans_dt = new Date();

    await this.cardFundsRepository.save(card.card_fund);

    this.logger.log(
      `[Pre-Auth] Success - Card SRNO: ${card.srno}, New balance: ${card.card_fund.balance}`,
    );
    return {
      message: 'Pre-authorization successful',
      card_srno: card.srno,
      amount: dto.amount,
      balance: card.card_fund.balance,
      transaction_date: card.card_fund.last_trans_dt,
    };
  }

  /**
   * Applies fees to card balance
   *
   * @param dto Fee request (card SRNO and amount)
   * @returns Updated balance
   * @throws NotFoundException if card not found
   * @throws ForbiddenException if card not eligible or insufficient funds
   */
  async applyFee(dto: { srno: string; amount: number }) {
    this.logger.log(
      `[Apply Fee] Initiated for card SRNO: ${dto.srno}, Amount: ${dto.amount}`,
    );

    const card = await this.cardsRepository.findOne({
      where: { srno: Number(dto.srno) },
      relations: ['card_fund'],
    });

    if (!card) {
      this.logger.error(`[Apply Fee] Card not found - SRNO: ${dto.srno}`);
      throw new NotFoundException(`Card not found`);
    }

    await this.validateCardForTransaction(card);

    this.logger.debug(
      `[Apply Fee] Current balance: ${card.card_fund.balance}, Ledger: ${card.card_fund.ledger}, Fee: ${dto.amount}`,
    );

    if (
      card.card_fund.balance < dto.amount ||
      card.card_fund.ledger < dto.amount
    ) {
      this.logger.warn(
        `[Apply Fee] Insufficient funds/ledger - Balance: ${card.card_fund.balance}, Ledger: ${card.card_fund.ledger}, Fee: ${dto.amount}`,
      );
      throw new ForbiddenException(`Insufficient balance or ledger for fee`);
    }

    card.card_fund.balance -= dto.amount;
    card.card_fund.ledger -= dto.amount;
    card.card_fund.last_trans_dt = new Date();

    await this.cardFundsRepository.save(card.card_fund);

    this.logger.log(
      `[Apply Fee] Success - Card SRNO: ${card.srno}, New balance: ${card.card_fund.balance}, New ledger: ${card.card_fund.ledger}`,
    );
    return {
      message: 'Fee applied successfully',
      card_srno: card.srno,
      amount: dto.amount,
      balance: card.card_fund.balance,
      ledger: card.card_fund.ledger,
      transaction_date: card.card_fund.last_trans_dt,
    };
  }
}
