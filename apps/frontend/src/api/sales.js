const delay = (ms) => new Promise(res => setTimeout(res, ms));

const processedIdempotencyKeys = new Set();

export const salesApi = {
  createSale: async (payload, idempotencyKey) => {
    await delay(500);

    if (!idempotencyKey) {
      return { success: false, data: null, error: { message: "Missing Idempotency-Key header" }, meta: null };
    }

    if (processedIdempotencyKeys.has(idempotencyKey)) {
      return { success: false, data: null, error: { code: 'IDEMPOTENCY_KEY_REUSED', message: "Same key used" }, meta: null };
    }

    processedIdempotencyKeys.add(idempotencyKey);

    // Calculate totals based on payload items
    const totalAmount = payload.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discount = payload.useLoyaltyPoints * 10;
    const finalAmount = totalAmount - discount;
    
    // Calculate debt if mixed or credit
    let debtAmount = 0;
    if (payload.paymentMethod === 'credit') {
      debtAmount = finalAmount;
    } else if (payload.paymentMethod === 'mixed' && payload.cashGiven < finalAmount) {
      debtAmount = finalAmount - payload.cashGiven;
    }

    const saleId = `65f000000000000000000${Math.floor(Math.random() * 900) + 100}`;

    return {
      success: true,
      data: {
        saleId,
        invoiceNumber: `FAC-2025-${Math.floor(Math.random() * 90000) + 10000}`,
        totalAmount: finalAmount,
        changeAmount: Math.max(0, payload.cashGiven - finalAmount),
        loyaltyPointsEarned: Math.floor(finalAmount / 100),
        newDebt: debtAmount
      },
      error: null,
      meta: null
    };
  },

  getDailySales: async () => {
    await delay(300);
    return {
      success: true,
      data: {
        totalSales: 15000,
        transactionCount: 12,
        cashCollected: 10000
      },
      error: null,
      meta: null
    };
  }
};
