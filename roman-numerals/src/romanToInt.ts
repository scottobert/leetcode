export function romanToInt(s: string): number {
    const digitMap: { [key: string]: number } = {
        I: 1,
        V: 5,
        X: 10,
        L: 50,
        C: 100,
        D: 500,
        M: 1000,
        IV: 4,
        IX: 9,
        XL: 40,
        XC: 90,
        CD: 400,
        CM: 900
    };

    let retVal = 0;
    let skipNext = false;
    for (var i = 0; i < s.length; i++) {
        if(skipNext) {
            skipNext = false;
            continue;
        }
        const currentAndNext = s[i] + s[i + 1];
        if (digitMap[currentAndNext] != null) {
            retVal += digitMap[currentAndNext];
            skipNext = true;
        }
        else {
            retVal += digitMap[s[i]];
        }
    }
    return retVal;
}
