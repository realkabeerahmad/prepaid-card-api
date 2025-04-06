import { Module } from '@nestjs/common';
import { CardProgramController } from './card-program.controller';
import { CardPrograms } from './card-program.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardProgramProvider } from './card-program';

@Module({
  imports:[TypeOrmModule.forFeature([CardPrograms])],
  controllers: [CardProgramController],
  providers: [CardProgramProvider],
  exports:[TypeOrmModule],
})
export class CardProgramModule {}
