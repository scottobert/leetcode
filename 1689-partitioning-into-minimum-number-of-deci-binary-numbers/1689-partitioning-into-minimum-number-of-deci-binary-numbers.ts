function minPartitions(n: string): number {
    let max = "0";
    for(let i = 0; i < n.length; i++) {
        max = n[i] > max ? n[i] : max
    }
    return parseInt(max);
};