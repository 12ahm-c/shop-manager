const delay = (ms) => new Promise(res => setTimeout(res, ms));

// Mock database for employees
let mockEmployees = [
  { _id: "65f000000000000000000001", name: "Admin User", role: "admin", phone: "+22236123456", isActive: true },
  { _id: "65f000000000000000000002", name: "Cashier One", role: "employee", phone: "+22236123457", isActive: true },
];

export const employeesApi = {
  list: async () => {
    await delay(500);
    return {
      success: true,
      data: [...mockEmployees],
      error: null,
      meta: { page: 1, limit: 20, total: mockEmployees.length }
    };
  },
  
  create: async (data) => {
    await delay(600);
    const newEmployee = {
      _id: `65f${Math.random().toString(16).substring(2, 12)}`,
      ...data,
      isActive: true
    };
    mockEmployees.push(newEmployee);
    return {
      success: true,
      data: newEmployee,
      error: null,
      meta: null
    };
  },
  
  update: async (id, data) => {
    await delay(500);
    const index = mockEmployees.findIndex(e => e._id === id);
    if (index === -1) {
      return { success: false, data: null, error: { code: 'NOT_FOUND', message: 'Employee not found' }, meta: null };
    }
    
    mockEmployees[index] = { ...mockEmployees[index], ...data };
    
    return {
      success: true,
      data: mockEmployees[index],
      error: null,
      meta: null
    };
  }
};
