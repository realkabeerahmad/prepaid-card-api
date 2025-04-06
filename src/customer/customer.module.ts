import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { CustomerProvider } from './customer';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customers } from './customer.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Customers])],
  controllers: [CustomerController],
  providers: [CustomerProvider],
  exports: [TypeOrmModule]
})
export class CustomerModule { }
