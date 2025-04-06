import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CardProgramDto } from './dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CardPrograms } from './card-program.entity';
import { QueryFailedError, Repository } from 'typeorm';

@Injectable()
export class CardProgramProvider {
    constructor(
        @InjectRepository(CardPrograms)
        private cardProgramRepository: Repository<CardPrograms>
    ) { }

    /**
     * Create a new Card Program
     * @param dto 
     * @returns created CardProgram
     */
    async create(dto: CardProgramDto) {
        try {
            if (!(dto.bin === dto.starting_number.substring(0, dto.bin.length))) {
                Logger.warn('[CardProgramProvider.create] BIN and Starting Number mismatch');
                throw new ForbiddenException('BIN and Starting Number do not match');
            }

            Logger.debug(Boolean(dto.atm_allowed));

            const card_program = this.cardProgramRepository.create({
                name: dto.name,
                description: dto.description,
                type: dto.type,
                network: dto.network,
                bin: dto.bin,
                starting_number: dto.starting_number,
                atm_allowed: Boolean(dto.atm_allowed),
                pos_allowed: Boolean(dto.pos_allowed),
                pin_option: Number(dto.pin_option),
                currency_code: dto.currency_code,
                expiry_months: dto.expiry_months,
                email: dto.email,
            });

            await this.cardProgramRepository.save(card_program);

            Logger.log(`[CardProgramProvider.create] Card Program '${dto.name}' created successfully`);
            return { message: 'Card Program has been created', data: card_program };
        } catch (error) {
            if (error instanceof QueryFailedError && (error as any).code === '23505') {
                Logger.warn(`[CardProgramProvider.create] Duplicate entry for '${dto.name}'`);
                throw new ForbiddenException(`Card Program with name '${dto.name}' already exists`);
            }

            Logger.error(`[CardProgramProvider.create] Error: ${error.message}`);
            throw new ForbiddenException('Something went wrong during card program creation');
        }
    }

    /**
     * Update an existing Card Program by name
     * @param dto 
     * @returns updated CardProgram
     */
    async update(dto: CardProgramDto) {
        try {
            const existing = await this.cardProgramRepository.findOne({ where: { name: dto.name } });

            if (!existing) {
                Logger.warn(`[CardProgramProvider.update] Card Program '${dto.name}' not found`);
                throw new NotFoundException(`Card Program '${dto.name}' not found`);
            }

            if (!(dto.bin === dto.starting_number.substring(0, dto.bin.length))) {
                Logger.warn('[CardProgramProvider.update] BIN and Starting Number mismatch');
                throw new ForbiddenException('BIN and Starting Number do not match');
            }

            const updated = this.cardProgramRepository.merge(existing, {
                name: dto.name,
                description: dto.description,
                type: dto.type,
                network: dto.network,
                bin: dto.bin,
                starting_number: dto.starting_number,
                atm_allowed: Boolean(dto.atm_allowed),
                pos_allowed: Boolean(dto.pos_allowed),
                pin_option: Number(dto.pin_option),
                currency_code: dto.currency_code,
                expiry_months: dto.expiry_months,
                email: dto.email,
            });
            await this.cardProgramRepository.save(updated);

            Logger.log(`[CardProgramProvider.update] Card Program '${dto.name}' updated successfully`);
            return { message: 'Card Program updated successfully', data: updated };
        } catch (error) {
            Logger.error(`[CardProgramProvider.update] Error: ${error.message}`);
            throw new ForbiddenException('Failed to update Card Program');
        }
    }
}
