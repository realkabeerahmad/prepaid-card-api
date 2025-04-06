import { Test, TestingModule } from '@nestjs/testing';
import { Customer } from './customer';

describe('Customer', () => {
  let provider: Customer;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Customer],
    }).compile();

    provider = module.get<Customer>(Customer);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
