import { romanToInt } from './romanToInt';
import { expect } from 'chai';
describe('romanToInt', () => {
    it('should return 4 for IV', () => {
        expect(romanToInt('IV')).to.equal(4);
    });
    it('should return 9 for IX', () => {
        expect(romanToInt('IX')).to.equal(9);
    });
    it('should return 40 for XL', () => {
        expect(romanToInt('XL')).to.equal(40);
    });
    it('should return 90 for XC', () => {
        expect(romanToInt('XC')).to.equal(90);
    });
    it('should return 400 for CD', () => {
        expect(romanToInt('CD')).to.equal(400);
    });
    it('should return 900 for CM', () => {
        expect(romanToInt('CM')).to.equal(900);
    });
    it('should return 1 for I', () => {
        expect(romanToInt('I')).to.equal(1);
    });
    it('should return 5 for V', () => {
        expect(romanToInt('V')).to.equal(5);
    });
    it('should return 10 for X', () => {
        expect(romanToInt('X')).to.equal(10);
    });
    it('should return 50 for L', () => {
        expect(romanToInt('L')).to.equal(50);
    });
    it('should return 100 for C', () => {
        expect(romanToInt('C')).to.equal(100);
    });
    it('should return 500 for D', () => {
        expect(romanToInt('D')).to.equal(500);
    });
    it('should return 1000 for M', () => {
        expect(romanToInt('M')).to.equal(1000);
    });
    it('should return 3 for III', () => {
        expect(romanToInt('III')).to.equal(3);
    });
    it('should return 6 for VI', () => {
        expect(romanToInt('VI')).to.equal(6);
    });
    it('should return 58 for LVIII', () => {
        expect(romanToInt('LVIII')).to.equal(58);
    });
    it('should return 1994 for MCMXCIV', () => {
        expect(romanToInt('MCMXCIV')).to.equal(1994);
    });
});