/**
 * @fileoverview Unit tests for Luhn algorithm validation
 */
import { describe, it, expect } from 'vitest';
import { luhnValidate, extractCreditCards, identifyCardIssuer, looksLikeCreditCard, maskCreditCard, } from '@/shared/utils/luhn';
describe('luhnValidate', () => {
    it('validates known test card numbers', () => {
        // These are standard test card numbers
        expect(luhnValidate('4532015112830366')).toBe(true); // Visa
        expect(luhnValidate('5425233430109903')).toBe(true); // Mastercard
        expect(luhnValidate('374245455400126')).toBe(true); // Amex
        expect(luhnValidate('6011000990139424')).toBe(true); // Discover
    });
    it('rejects invalid card numbers', () => {
        expect(luhnValidate('1234567890123456')).toBe(false);
        expect(luhnValidate('0000000000000000')).toBe(false);
        expect(luhnValidate('4532015112830367')).toBe(false); // One digit changed
    });
    it('handles formatted numbers with spaces', () => {
        expect(luhnValidate('4532 0151 1283 0366')).toBe(true);
        expect(luhnValidate('5425 2334 3010 9903')).toBe(true);
    });
    it('handles formatted numbers with dashes', () => {
        expect(luhnValidate('4532-0151-1283-0366')).toBe(true);
        expect(luhnValidate('5425-2334-3010-9903')).toBe(true);
    });
    it('rejects non-numeric input', () => {
        expect(luhnValidate('453201511283036x')).toBe(false);
        expect(luhnValidate('abcdefghijklmnop')).toBe(false);
    });
    it('rejects too short numbers', () => {
        expect(luhnValidate('123456789012')).toBe(false); // 12 digits
    });
    it('rejects too long numbers', () => {
        expect(luhnValidate('12345678901234567890')).toBe(false); // 20 digits
    });
});
describe('extractCreditCards', () => {
    it('finds credit cards in text', () => {
        const text = 'My card number is 4532015112830366 thanks';
        const cards = extractCreditCards(text);
        expect(cards).toHaveLength(1);
        expect(cards[0]?.value).toBe('4532015112830366');
        expect(cards[0]?.issuer).toBe('visa');
    });
    it('finds multiple cards', () => {
        const text = 'Card 1: 4532015112830366, Card 2: 5425233430109903';
        const cards = extractCreditCards(text);
        expect(cards).toHaveLength(2);
        expect(cards[0]?.issuer).toBe('visa');
        expect(cards[1]?.issuer).toBe('mastercard');
    });
    it('ignores invalid numbers that look like cards', () => {
        const text = 'Reference number 1234567890123456 is not a card';
        const cards = extractCreditCards(text);
        expect(cards).toHaveLength(0);
    });
    it('finds formatted cards', () => {
        const text = 'Card: 4532 0151 1283 0366 or 5425-2334-3010-9903';
        const cards = extractCreditCards(text);
        expect(cards).toHaveLength(2);
    });
    it('returns correct positions', () => {
        const text = 'Card: 4532015112830366';
        const cards = extractCreditCards(text);
        expect(cards[0]?.start).toBe(6);
        expect(cards[0]?.end).toBe(22);
    });
});
describe('identifyCardIssuer', () => {
    it('identifies Visa', () => {
        expect(identifyCardIssuer('4532015112830366')).toBe('visa');
        expect(identifyCardIssuer('4111111111111111')).toBe('visa');
    });
    it('identifies Mastercard', () => {
        expect(identifyCardIssuer('5425233430109903')).toBe('mastercard');
        expect(identifyCardIssuer('5500000000000004')).toBe('mastercard');
        expect(identifyCardIssuer('2221000000000009')).toBe('mastercard'); // New range
    });
    it('identifies Amex', () => {
        expect(identifyCardIssuer('374245455400126')).toBe('amex');
        expect(identifyCardIssuer('378282246310005')).toBe('amex');
    });
    it('identifies Discover', () => {
        expect(identifyCardIssuer('6011000990139424')).toBe('discover');
        expect(identifyCardIssuer('6500000000000002')).toBe('discover');
    });
    it('identifies Diners', () => {
        expect(identifyCardIssuer('30569309025904')).toBe('diners');
        expect(identifyCardIssuer('38520000023237')).toBe('diners');
    });
    it('returns unknown for unrecognized', () => {
        expect(identifyCardIssuer('9999999999999999')).toBe('unknown');
    });
});
describe('looksLikeCreditCard', () => {
    it('returns true for card-length numbers', () => {
        expect(looksLikeCreditCard('4532015112830366')).toBe(true);
        expect(looksLikeCreditCard('374245455400126')).toBe(true);
    });
    it('returns true for formatted numbers', () => {
        expect(looksLikeCreditCard('4532 0151 1283 0366')).toBe(true);
        expect(looksLikeCreditCard('4532-0151-1283-0366')).toBe(true);
    });
    it('returns false for non-numeric', () => {
        expect(looksLikeCreditCard('not a card number')).toBe(false);
    });
    it('returns false for wrong length', () => {
        expect(looksLikeCreditCard('123456789012')).toBe(false); // Too short
        expect(looksLikeCreditCard('12345678901234567890')).toBe(false); // Too long
    });
});
describe('maskCreditCard', () => {
    it('masks 16-digit cards correctly', () => {
        expect(maskCreditCard('4532015112830366')).toBe('4532********0366');
    });
    it('masks 15-digit cards correctly', () => {
        expect(maskCreditCard('374245455400126')).toBe('3742*******0126');
    });
    it('handles formatted input', () => {
        expect(maskCreditCard('4532 0151 1283 0366')).toBe('4532********0366');
        expect(maskCreditCard('4532-0151-1283-0366')).toBe('4532********0366');
    });
    it('handles short numbers', () => {
        expect(maskCreditCard('1234')).toBe('****');
        expect(maskCreditCard('12345678')).toBe('12345678'); // 8 chars, shows all
    });
});
//# sourceMappingURL=luhn.test.js.map