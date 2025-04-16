import { Body, Controller, Logger, Post } from '@nestjs/common';
import { CardProvider } from './card';
import { CardDto } from './dto';
import { ActivateCardDto } from './dto/activate-card.dto';
import { randomUUID } from 'node:crypto';

@Controller('card')
export class CardController {
  constructor(private CardProvider: CardProvider) {}

  @Post('add')
  addCard(@Body() dto: CardDto) {
    const req_id = randomUUID();
    Logger.debug(`Request received with req id: ${req_id}`);
    return this.CardProvider.addCard(dto);
  }

  @Post('activate')
  activateCard(@Body() dto: ActivateCardDto) {
    return this.CardProvider.activateCard(dto);
  }
}
