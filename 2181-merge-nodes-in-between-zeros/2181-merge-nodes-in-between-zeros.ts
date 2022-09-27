/**
 * Definition for singly-linked list.
 * class ListNode {
 *     val: number
 *     next: ListNode | null
 *     constructor(val?: number, next?: ListNode | null) {
 *         this.val = (val===undefined ? 0 : val)
 *         this.next = (next===undefined ? null : next)
 *     }
 * }
 */

function mergeNodes(head: ListNode | null): ListNode | null {
    let currentNode = head.next;
    let accumulator = 0;
    let result = new ListNode();
    let currentResult = result;
    
    while (currentNode !== null) {
        if(currentNode.val === 0) {
            currentResult.val = accumulator;
            if(currentNode.next != null) {                
                currentResult.next = new ListNode();
                currentResult = currentResult.next;
            }
            accumulator = 0;
        }
        
        accumulator += currentNode.val;
        currentNode = currentNode.next;
    }
    return result;
};