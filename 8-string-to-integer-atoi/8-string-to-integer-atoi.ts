function myAtoi(s: string): number {
    const max = 2147483647;
    const min = -2147483648;
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