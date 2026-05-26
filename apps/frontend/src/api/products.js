// Using mock responses based on docs/API-contract.md exactly

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const mockProducts = [
  { _id: "65f000000000000000000101", name: "T-shirt blanc", barcode: "1234567890123", category: "Vêtements", price: 1500, isActive: true },
  { _id: "65f000000000000000000102", name: "Pantalon noir", barcode: "1234567890124", category: "Vêtements", price: 3000, isActive: true },
  { _id: "65f000000000000000000103", name: "Chaussures de sport", barcode: "1234567890125", category: "Chaussures", price: 5000, isActive: true },
];

export const productsApi = {
  searchProducts: async (query) => {
    await delay(300);
    const q = query.toLowerCase();
    const filtered = mockProducts.filter(p => 
      p.name.toLowerCase().includes(q) || p.barcode.includes(q)
    );
    
    // In search, we mock the totalStock response part
    const productsWithStock = filtered.map(p => ({
      product: p,
      totalStock: Math.floor(Math.random() * 50) + 10 // Mock stock between 10-60
    }));

    return {
      success: true,
      data: { products: productsWithStock },
      error: null,
      meta: {
        page: 1,
        limit: 20,
        total: productsWithStock.length,
        nextCursor: null,
        hasMore: false
      }
    };
  }
};
