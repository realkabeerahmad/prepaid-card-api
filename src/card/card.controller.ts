import { Body, Controller, Post } from '@nestjs/common';
import { CardProvider } from './card';
import { CardDto } from './dto';

@Controller('card')
export class CardController {
    constructor(private CardProvider: CardProvider) { }

    @Post('add')
    addCard(@Body() dto: CardDto) {
        return this.CardProvider.addCard(dto)
    }
}
