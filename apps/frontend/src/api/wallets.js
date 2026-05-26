const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const walletsApi = {
  getWallets: async () => {
    await delay(300);
    return {
      success: true,
      data: {
        wallets: [
          { _id: "65f000000000000000000201", name: "Caisse Principale", balance: 150000, type: "cash" },
          { _id: "65f000000000000000000202", name: "Bankily", balance: 200000, type: "mobile_money" },
          { _id: "65f000000000000000000203", name: "Masrivi", balance: 50000, type: "mobile_money" },
        ]
      },
      error: null,
      meta: null
    };
  }
};
