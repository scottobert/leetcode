import { expect } from 'chai';
import { intToRoman } from "./intToRoman";
describe('intToRoman', () => {
    it('should error for negative numbers', () => {
        const input = -1;
        expect(() => intToRoman(input)).to.throw(`invalid number: ${input}`);
    });
    it('should error for numbers > 3999', () => {
        const input = 4000;
        expect(() => intToRoman(input)).to.throw(`invalid number: ${input}`);
    });
    it('should return IV for 4', () => {
        const input = 4;
        expect(intToRoman(input)).to.equal('IV');
    });
    it('should return IX for 9', () => {
        const input = 9;
        expect(intToRoman(input)).to.equal('IX');
    });
    it('should return X for 10', () => {
        const input = 10;
        expect(intToRoman(input)).to.equal('X');
    });
    it('should return XX for 20', () => {
        const input = 20;
        expect(intToRoman(input)).to.equal('XX');
    });
    it('should return XXX for 30', () => {
        const input = 30;
        expect(intToRoman(input)).to.equal('XXX');
    });
    it('should return XL for 40', () => {
        const input = 40;
        expect(intToRoman(input)).to.equal('XL');
    });
    it('should return L for 50', () => {
        const input = 50;
        expect(intToRoman(input)).to.equal('L');
    });
    it('should return LX for 60', () => {
        const input = 60;
        expect(intToRoman(input)).to.equal('LX');
    });
    it('should return LXX for 70', () => {
        const input = 70;
        expect(intToRoman(input)).to.equal('LXX');
    });
    it('should return LXXX for 80', () => {
        const input = 80;
        expect(intToRoman(input)).to.equal('LXXX');
    });
    it('should return XC for 90', () => {
        const input = 90;
        expect(intToRoman(input)).to.equal('XC');
    });
    it('should return C for 100', () => {
        const input = 100;
        expect(intToRoman(input)).to.equal('C');
    });
    it('should return CC for 200', () => {
        const input = 200;
        expect(intToRoman(input)).to.equal('CC');
    });
    it('should return CCC for 300', () => {
        const input = 300;
        expect(intToRoman(input)).to.equal('CCC');
    });
    it('should return CD for 400', () => {
        const input = 400;
        expect(intToRoman(input)).to.equal('CD');
    });
    it('should return D for 500', () => {
        const input = 500;
        expect(intToRoman(input)).to.equal('D');
    });
    it('should return DC for 600', () => {
        const input = 600;
        expect(intToRoman(input)).to.equal('DC');
    });
    it('should return DCC for 700', () => {
        const input = 700;
        expect(intToRoman(input)).to.equal('DCC');
    });
    it('should return DCCC for 800', () => {
        const input = 800;
        expect(intToRoman(input)).to.equal('DCCC');
    });
    it('should return CM for 900', () => {
        const input = 900;
        expect(intToRoman(input)).to.equal('CM');
    });
    it('should return M for 1000', () => {
        const input = 1000;
        expect(intToRoman(input)).to.equal('M');
    });
    it('should return MM for 2000', () => {
        const input = 2000;
        expect(intToRoman(input)).to.equal('MM');
    });
    it('should return MMM for 3000', () => {
        const input = 3000;
        expect(intToRoman(input)).to.equal('MMM');
    });
    it('should return MMMCMXCIX for 3999', () => {
        const input = 3999;
        expect(intToRoman(input)).to.equal('MMMCMXCIX');
    });
});