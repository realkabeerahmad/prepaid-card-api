import { Body, Controller, Post } from '@nestjs/common';
import { CardProgramProvider } from './card-program';
import { CardProgramDto } from './dto';

@Controller('card-program')

export class CardProgramController {
    constructor(private CardProgram:CardProgramProvider){}
    /**
     * 
     * @param dto 
     * @returns CardProgrm.create(dto)
     */
    @Post('create')
    create(@Body() dto: CardProgramDto){
        return this.CardProgram.create(dto);
    }
    /**
     * 
     * @param dto 
     * @returns CardProgram.update(dto)
     */
    @Post('update')
    update(@Body() dto: CardProgramDto){
        return this.CardProgram.update(dto);
    }
}
