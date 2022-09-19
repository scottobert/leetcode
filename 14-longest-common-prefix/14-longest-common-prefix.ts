function longestCommonPrefix(strs: string[]): string {
    let prefix = "";
    let done = false;
    for(let i = 0; i < strs[0].length; i++) {
        for(let j = 1; j < strs.length; j++) {
            if(strs[j][i] !== strs[j-1][i]) {
                done = true;
                break;
            }
        }
        if(!done) {
            prefix = prefix + strs[0][i];
        } else {
            break;
        }
    }
    return prefix;
};