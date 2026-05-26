const delay = (ms) => new Promise(res => setTimeout(res, ms));

const mockCustomers = [
  { _id: "65f000000000000000000301", name: "Client Comptoir", phone: "+22200000000", loyaltyPoints: 0, debt: 0, creditLimit: 0 },
  { _id: "65f000000000000000000302", name: "Ahmed Sidi", phone: "+22236112233", loyaltyPoints: 120, debt: 5000, creditLimit: 20000 },
  { _id: "65f000000000000000000303", name: "Fatima Mint", phone: "+22246112233", loyaltyPoints: 50, debt: 0, creditLimit: 10000 },
];

export const customersApi = {
  searchCustomers: async (query) => {
    await delay(300);
    const q = query.toLowerCase();
    const filtered = mockCustomers.filter(c => 
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );

    return {
      success: true,
      data: { customers: filtered },
      error: null,
      meta: null
    };
  },

  createCustomer: async (customerData) => {
    await delay(400);
    const newCustomer = {
      _id: `65f000000000000000000${Math.floor(Math.random() * 900) + 100}`,
      ...customerData,
      loyaltyPoints: 0,
      debt: 0,
      creditLimit: customerData.creditLimit || 0
    };
    mockCustomers.push(newCustomer);
    return {
      success: true,
      data: { customer: newCustomer },
      error: null,
      meta: null
    };
  },

  redeemLoyalty: async (customerId, pointsToRedeem) => {
    await delay(300);
    const customer = mockCustomers.find(c => c._id === customerId);
    if (!customer) {
      return { success: false, data: null, error: { message: "Not found" }, meta: null };
    }
    if (customer.loyaltyPoints < pointsToRedeem) {
      return { success: false, data: null, error: { code: 'INVALID_STATE', message: "Not enough points" }, meta: null };
    }
    
    // In real app, this creates a transaction or modifies the cart
    return {
      success: true,
      data: { discountAmount: pointsToRedeem * 10 }, // 1 point = 10 MRU discount
      error: null,
      meta: null
    };
  },

  getCustomer: async (id) => {
    await delay(300);
    const customer = mockCustomers.find(c => c._id === id);
    if (!customer) {
      return { success: false, data: null, error: { code: 'NOT_FOUND', message: "Customer not found" }, meta: null };
    }
    return {
      success: true,
      data: {
        customer,
        recentPurchases: [
          { _id: 'sale-1', date: new Date().toISOString(), totalAmount: 1500, status: 'completed' },
          { _id: 'sale-2', date: new Date(Date.now() - 86400000).toISOString(), totalAmount: 4200, status: 'completed' }
        ]
      },
      error: null,
      meta: null
    };
  },

  payDebt: async (id, data, idempotencyKey) => {
    // API Contract states: POST /customers/:id/debt/pay requires Idempotency-Key
    await delay(400);
    const customer = mockCustomers.find(c => c._id === id);
    if (!customer) {
      return { success: false, data: null, error: { code: 'NOT_FOUND', message: "Customer not found" }, meta: null };
    }
    
    // Update local mock
    customer.debt = Math.max(0, customer.debt - data.amount);
    
    return {
      success: true,
      data: {
        paymentId: 'txn-' + Math.floor(Math.random() * 1000),
        newDebt: customer.debt
      },
      error: null,
      meta: null
    };
  },

  getOverdueDebts: async () => {
    await delay(400);
    const overdue = mockCustomers.filter(c => c.debt > 0).map(c => ({
      customer: c,
      daysOverdue: Math.floor(Math.random() * 45) + 31 // Mock 31-75 days
    }));
    return {
      success: true,
      data: { overdue },
      error: null,
      meta: {
        page: 1,
        limit: 20,
        total: overdue.length,
        nextCursor: null,
        hasMore: false
      }
    };
  }
};
