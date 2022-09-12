function maximumWealth(accounts: number[][]): number {
    return accounts.map((cust) => {
        let balance = 0;
        cust.forEach((bal) => { balance += bal }); 
        return balance;
    }).sort((a,b) => { 
        return b-a; 
    })[0];
};