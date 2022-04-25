export function romanToInt(s: string): number {
    var retVal = 0;
    for (var i = 0; i < s.length; i++) {
        if (s[i] === "I" && s[i + 1] === "V") {
            retVal += 4;
            i++;
        }
        else if (s[i] === "I" && s[i + 1] === "X") {
            retVal += 9;
            i++;
        }
        else if (s[i] === "X" && s[i + 1] === "L") {
            retVal += 40;
            i++;
        }
        else if (s[i] === "X" && s[i + 1] === "C") {
            retVal += 90;
            i++;
        }
        else if (s[i] === "C" && s[i + 1] === "D") {
            retVal += 400;
            i++;
        }
        else if (s[i] === "C" && s[i + 1] === "M") {
            retVal += 900;
            i++;
        }
        else if (s[i] === "I") {
            retVal += 1;
        }
        else if (s[i] === "V") {
            retVal += 5;
        }
        else if (s[i] === "X") {
            retVal += 10;
        }
        else if (s[i] === "L") {
            retVal += 50;
        }
        else if (s[i] === "C") {
            retVal += 100;
        }
        else if (s[i] === "D") {
            retVal += 500;
        }
        else if (s[i] === "M") {
            retVal += 1000;
        }
    }
    return retVal;
}
