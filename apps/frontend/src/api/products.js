// Using mock responses based on docs/API-contract.md exactly
import { api } from './client';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const mockProducts = [
  { _id: "65f000000000000000000101", name: "T-shirt blanc", barcode: "1234567890123", category: "Vêtements", price: 1500, isActive: true },
  { _id: "65f000000000000000000102", name: "Pantalon noir", barcode: "1234567890124", category: "Vêtements", price: 3000, isActive: true },
  { _id: "65f000000000000000000103", name: "Chaussures de sport", barcode: "1234567890125", category: "Chaussures", price: 5000, isActive: true },
];

export const productsApi = {
  searchProducts: async (query) => {
    // If backend is ready, use: return api.get(`/products/search?q=${encodeURIComponent(query)}`);
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
  },
  
  getProduct: async (id) => {
    // return api.get(`/products/${id}`);
    await delay(200);
    const product = mockProducts.find(p => p._id === id);
    if (!product) {
      return { success: false, data: null, error: { code: 'NOT_FOUND', message: 'Product not found' }, meta: null };
    }
    return { success: true, data: { product }, error: null, meta: null };
  },

  createProduct: async (productData) => {
    // return api.post('/products', productData);
    await delay(400);
    const newProduct = { ...productData, _id: `65f00000000000000000010${mockProducts.length + 1}` };
    mockProducts.push(newProduct);
    return { success: true, data: { product: newProduct }, error: null, meta: null };
  },

  updateProduct: async (id, productData) => {
    // return api.put(`/products/${id}`, productData);
    await delay(300);
    const index = mockProducts.findIndex(p => p._id === id);
    if (index === -1) {
      return { success: false, data: null, error: { code: 'NOT_FOUND', message: 'Product not found' }, meta: null };
    }
    mockProducts[index] = { ...mockProducts[index], ...productData };
    return { success: true, data: { product: mockProducts[index] }, error: null, meta: null };
  },

  deleteProduct: async (id) => {
    // return api.delete(`/products/${id}`);
    await delay(300);
    const index = mockProducts.findIndex(p => p._id === id);
    if (index > -1) {
      mockProducts.splice(index, 1);
      return { success: true, data: null, error: null, meta: null };
    }
    return { success: false, data: null, error: { code: 'NOT_FOUND', message: 'Product not found' }, meta: null };
  },

  importProducts: async (formData) => {
    // return fetchClient('/products/import', { method: 'POST', body: formData, headers: {} }); // Note: Handle FormData correctly
    await delay(1000);
    return { success: true, data: { importedCount: 10, errors: [] }, error: null, meta: null };
  }
};
