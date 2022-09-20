function getConcatenation(nums: number[]): number[] {
    nums.forEach(n => nums.push(n));
    return nums;
};