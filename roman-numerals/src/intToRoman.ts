export function intToRoman(num: number): string {
    if(num < 1 || num > 3999) {
        throw new Error(`invalid number: ${num}`);
    }
    const romanMap: {[id: string]: string} = {
        '1': 'I',
        '4': 'IV',
        '5': 'V',
        '9': 'IX',
        '10': 'X',
        '40': 'XL',
        '50': 'L',
        '90': 'XC',
        '100': 'C',
        '400': 'CD',
        '500': 'D',
        '1000': 'M'
    };
    let result = '';
    while(num > 0) {
        const number = Object.keys(romanMap).filter(key => num >= parseInt(key)).sort((a,b) => parseInt(b) - parseInt(a))[0];
        if(number) {
            result += romanMap[number];
            num -= parseInt(number);
        }
    }
    return result;
}