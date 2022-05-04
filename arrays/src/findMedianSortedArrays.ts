export function findMedianSortedArrays(nums1: number[], nums2: number[]): number {
    let merged: number[] = [...nums1, ...nums2];
    merged.sort((a,b) => a - b);
    const middle = Math.round(merged.length / 2);
    if(merged.length % 2 === 0) {
        return (merged[middle - 1] + merged[middle]) / 2;
    }
    else {
        return merged[middle - 1];
    }
};