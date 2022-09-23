function myAtoi(s: string): number {
    const max = Math.pow(2, 31) - 1;
    const min = Math.pow(-2, 31);
    const num = parseInt(s);
    if(isNaN(num)) {
        return 0;
    }
    if(num > max) {
        return max;
    }
    if(num < min) {
        return min;
    }
    return num;
};