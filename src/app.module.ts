import { Module } from '@nestjs/common';
import { CardProgramModule } from './card-program/card-program.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardModule } from './card/card.module';
import { CustomerModule } from './customer/customer.module';

@Module({
  imports: [CardProgramModule, TypeOrmModule.forRoot({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "@dmin1122",
    database: "sandbox",
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: true,
    autoLoadEntities: true
  }), CardModule, CustomerModule],
})
export class AppModule { }
