import { Module } from '@nestjs/common';
import { CardController } from './card.controller';
import { CardProvider } from './card';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardPrograms } from 'src/card-program/card-program.entity';
import { Cards } from './card.entity';
import { CardMoreInfos } from './card-more-info.entity';
import { CardFunds } from './card-balance.entity';
import { Customers } from 'src/customer/customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CardPrograms, Cards, CardMoreInfos, CardFunds, Customers])],
  controllers: [CardController],
  providers: [CardProvider],
  exports: [TypeOrmModule],
})
export class CardModule { }
