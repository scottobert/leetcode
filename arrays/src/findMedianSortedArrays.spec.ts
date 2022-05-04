import { findMedianSortedArrays } from './findMedianSortedArrays';
import { expect } from 'chai';
describe('romanToInt', () => {
    it('should return 2', () => {
        const nums1 = [1, 3];
        const nums2 = [2];
        const expected = 2.00000;
        expect(findMedianSortedArrays(nums1, nums2)).to.equal(expected);
    });
    it('should return 2.5', () => {
        const nums1 = [1, 2];
        const nums2 = [3, 4];
        const expected = 2.50000;
        expect(findMedianSortedArrays(nums1, nums2)).to.equal(expected);
    });
    it('should return 5.5', () => {
        const nums1 = [9, 9, 10, 10, 2, 7, 6, 5, 9, 2, 1];
        const nums2 = [1, 4, 7, 2, 0];
        const expected = 5.50000;
        expect(findMedianSortedArrays(nums1, nums2)).to.equal(expected);
    });
});


// Example 1:

// Input: nums1 = [1, 3], nums2 = [2]
// Output: 2.00000
// Explanation: merged array = [1, 2, 3] and median is 2.

// Example 2:

// Input: nums1 = [1, 2], nums2 = [3, 4]
// Output: 2.50000
// Explanation: merged array = [1, 2, 3, 4] and median is(2 + 3) / 2 = 2.5.

