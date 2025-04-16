import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';

const usedCardNumbers = new Set<string>(); // Simulated in-memory DB

function generateRandomDigits(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');
}

function calculateLuhnCheckDigit(number: string): number {
  let sum = 0;
  const reversedDigits = number.split('').reverse().map(Number);

  for (let i = 0; i < reversedDigits.length; i++) {
    let digit = reversedDigits[i];
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  return (10 - (sum % 10)) % 10;
}

export function generateCard(starting_number: string): string {
  const totalLength = 16;
  const payloadLength = totalLength - starting_number.length - 1; // reserve 1 for Luhn check digit

  if (payloadLength < 0) {
    throw new Error('Starting number too long.');
  }

  let cardNumber = '';

  do {
    const body = starting_number + generateRandomDigits(payloadLength);
    const checkDigit = calculateLuhnCheckDigit(body);
    cardNumber = body + checkDigit;
  } while (usedCardNumbers.has(cardNumber)); // ensure uniqueness

  usedCardNumbers.add(cardNumber);
  return cardNumber;
}

export function generateExpiry(expiry_months: number): Date {
  const result = new Date();
  result.setMonth(result.getMonth() + expiry_months);
  return result;
}

export function generateCvv() {
  return Math.floor(100 + Math.random() * 900).toString();
}

export function generatePin(pin_option: Number, card_no: string) {
  switch (pin_option) {
    case 1:
      return card_no.slice(12, 16);
    case 2:
      return Math.floor(1000 + Math.random() * 9000).toString();
      break;
    default:
      throw new NotFoundException('Pin option not found for program');
  }
  return;
}

export function compareExpiry(cardExpiry: Date, reqExpiry: Date): boolean {
    const cardDateOnly = new Date(cardExpiry).toISOString().split('T')[0];
    const reqDateOnly = new Date(reqExpiry).toISOString().split('T')[0];
  
    Logger.debug(`Card Expiry: ${cardDateOnly}, Request Expiry: ${reqDateOnly}`);
  
    if (cardDateOnly !== reqDateOnly) {
      throw new ForbiddenException('Incorrect Expiry Date provided');
    }
    return true;
  }
  
  export function compareDateOfBirth(dateOfBirth: Date, reqDateOfBirth: Date): boolean {
    const cardDateOnly = new Date(dateOfBirth).toISOString().split('T')[0];
    const reqDateOnly = new Date(reqDateOfBirth).toISOString().split('T')[0];
  
    Logger.debug(`Card Holder DOB: ${cardDateOnly}, Request DOB: ${reqDateOnly}`);
  
    if (cardDateOnly !== reqDateOnly) {
      throw new ForbiddenException('Incorrect Date of Birth provided');
    }
    return true;
  }
  
  export function compareCVV(cvv: number, reqCvv: number): boolean {
    Logger.debug(`Card CVV: ${cvv}, Request CVV: ${reqCvv}`);
    if (cvv !== reqCvv) {
      throw new ForbiddenException('Incorrect CVV provided');
    }
    return true;
  }
  
