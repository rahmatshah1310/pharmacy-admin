// Sample data that matches the API response structure
export const sampleSuppliers = [
  {
    _id: "1",
    companyName: "MedSupply Co.",
    contactPerson: {
      firstName: "John",
      lastName: "Smith"
    },
    email: "john@medsupply.com",
    phone: "+1-555-0123",
    address: {
      street: "123 Medical St",
      city: "Health City",
      state: "HC",
      zipCode: "12345",
      country: "USA"
    },
    paymentTerms: {
      creditLimit: 50000,
      creditDays: 30,
      paymentMethod: "bank_transfer"
    },
    performance: {
      onTimeDelivery: 95,
      qualityRating: 4.8,
      responseTime: 2
    },
    status: "active"
  },
  {
    _id: "2",
    companyName: "PharmaCorp",
    contactPerson: {
      firstName: "Sarah",
      lastName: "Johnson"
    },
    email: "sarah@pharmacorp.com",
    phone: "+1-555-0124",
    address: {
      street: "456 Pharma Ave",
      city: "Drug Town",
      state: "DT",
      zipCode: "67890",
      country: "USA"
    },
    paymentTerms: {
      creditLimit: 30000,
      creditDays: 15,
      paymentMethod: "bank_transfer"
    },
    performance: {
      onTimeDelivery: 92,
      qualityRating: 4.5,
      responseTime: 4
    },
    status: "active"
  },
  {
    _id: "3",
    companyName: "NutriHealth",
    contactPerson: {
      firstName: "Mike",
      lastName: "Wilson"
    },
    email: "mike@nutrihealth.com",
    phone: "+1-555-0125",
    address: {
      street: "789 Vitamin Blvd",
      city: "Wellness City",
      state: "WC",
      zipCode: "13579",
      country: "USA"
    },
    paymentTerms: {
      creditLimit: 75000,
      creditDays: 45,
      paymentMethod: "bank_transfer"
    },
    performance: {
      onTimeDelivery: 98,
      qualityRating: 4.9,
      responseTime: 1
    },
    status: "active"
  }
]

export const samplePurchaseOrders = [
  {
    _id: "1",
    orderNumber: "PO-2024-001",
    supplier: sampleSuppliers[0],
    orderDate: "2024-01-15",
    expectedDeliveryDate: "2024-01-22",
    actualDeliveryDate: "2024-01-20",
    status: 'received' as const,
    total: 1250.00,
    paymentStatus: 'paid' as const,
    items: [
      {
        product: {
          _id: "1",
          name: "Paracetamol 500mg",
          sku: "PAR-500-001",
          barcode: "1234567890123"
        },
        quantity: 100,
        unitCost: 2.50,
        totalCost: 250.00,
        receivedQuantity: 100,
        pendingQuantity: 0
      },
      {
        product: {
          _id: "2",
          name: "Ibuprofen 400mg",
          sku: "IBU-400-001",
          barcode: "1234567890124"
        },
        quantity: 200,
        unitCost: 5.00,
        totalCost: 1000.00,
        receivedQuantity: 200,
        pendingQuantity: 0
      }
    ],
    notes: "Priority delivery requested",
    createdBy: {
      firstName: "John",
      lastName: "Doe"
    },
    approvedBy: {
      firstName: "Jane",
      lastName: "Smith"
    },
    receivedBy: {
      firstName: "Bob",
      lastName: "Johnson"
    },
    paymentTerms: "credit_30"
  },
  {
    _id: "2",
    orderNumber: "PO-2024-002",
    supplier: sampleSuppliers[1],
    orderDate: "2024-01-18",
    expectedDeliveryDate: "2024-01-25",
    status: 'partially_received' as const,
    total: 890.75,
    paymentStatus: 'partially_paid' as const,
    items: [
      {
        product: {
          _id: "3",
          name: "Vitamin D3",
          sku: "VIT-D3-001",
          barcode: "1234567890125"
        },
        quantity: 75,
        unitCost: 12.00,
        totalCost: 900.00,
        receivedQuantity: 40,
        pendingQuantity: 35
      }
    ],
    notes: "Partial delivery received",
    createdBy: {
      firstName: "Mike",
      lastName: "Wilson"
    },
    paymentTerms: "credit_15"
  },
  {
    _id: "3",
    orderNumber: "PO-2024-003",
    supplier: sampleSuppliers[2],
    orderDate: "2024-01-20",
    expectedDeliveryDate: "2024-01-27",
    status: 'sent' as const,
    total: 2100.50,
    paymentStatus: 'pending' as const,
    items: [
      {
        product: {
          _id: "4",
          name: "Blood Pressure Monitor",
          sku: "BPM-001",
          barcode: "1234567890126"
        },
        quantity: 20,
        unitCost: 45.99,
        totalCost: 919.80,
        receivedQuantity: 0,
        pendingQuantity: 20
      },
      {
        product: {
          _id: "5",
          name: "Glucose Test Strips",
          sku: "GTS-001",
          barcode: "1234567890127"
        },
        quantity: 50,
        unitCost: 23.61,
        totalCost: 1180.70,
        receivedQuantity: 0,
        pendingQuantity: 50
      }
    ],
    notes: "Medical equipment order",
    createdBy: {
      firstName: "Sarah",
      lastName: "Davis"
    },
    paymentTerms: "credit_30"
  }
]

