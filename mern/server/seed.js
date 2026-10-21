// Direct port of Data/ApplicationDbContext.cs -> SeedData()
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

const Shop = require('./models/Shop');
const User = require('./models/User');
const Supplier = require('./models/Supplier');
const SupplierOrder = require('./models/SupplierOrder');

const ShoeProduct = require('./models/shoes/Product');
const ShoeSale = require('./models/shoes/Sale');
const ShoeSalesman = require('./models/shoes/Salesman');

const ClothingProduct = require('./models/clothes/ClothingProduct');
const ClothingSale = require('./models/clothes/ClothingSale');

async function seed({ connect = true } = {}) {
  if (connect) await connectDB();

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    console.log('Database already has users — skipping seed.');
    return false;
  }

  // ── Shoe Shop ──────────────────────────────────────────────────────────
  const shoeShop = await Shop.create({
    name: 'StepUp Shoe Store',
    ownerName: 'Ahmed Khan',
    phone: '03001234567',
    address: 'Shop #5, Main Market',
    city: 'Lahore',
    email: 'admin@stepup.pk',
    type: 'Shoes',
    createdAt: new Date(2024, 0, 1),
  });

  const shoeOwner = await User.create({
    fullName: 'Ahmed Khan',
    email: 'admin@stepup.pk',
    phone: '03001234567',
    passwordHash: await bcrypt.hash('Admin@123', 10),
    role: 'Owner',
    shopId: shoeShop._id,
    createdAt: new Date(2024, 0, 1),
    isActive: true,
  });

  // ── Clothing Shop ──────────────────────────────────────────────────────
  const clothShop = await Shop.create({
    name: 'StyleHub Clothing',
    ownerName: 'Sara Ali',
    phone: '03009876543',
    address: 'Shop #12, Liberty Market',
    city: 'Lahore',
    email: 'admin@stylehub.pk',
    type: 'Clothes',
    createdAt: new Date(2024, 0, 1),
  });

  await User.create({
    fullName: 'Sara Ali',
    email: 'admin@stylehub.pk',
    phone: '03009876543',
    passwordHash: await bcrypt.hash('Admin@123', 10),
    role: 'Owner',
    shopId: clothShop._id,
    createdAt: new Date(2024, 0, 1),
    isActive: true,
  });

  // ── Shoe Products ────────────────────────────────────────────────────────
  const shoeProducts = await ShoeProduct.insertMany([
    { shopId: shoeShop._id, name: 'Air Zoom Elite Runner', costPrice: 12500, brand: 'Nike', category: 'Men', subCategory: 'Running', price: 18999, originalPrice: 22000, stockQuantity: 25, lowStockThreshold: 5, sizesJson: '40,41,42,43,44,45', colorsJson: 'Black,White,Red', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', description: 'Premium running shoe.', createdAt: new Date(2024, 0, 15), updatedAt: new Date(2024, 0, 15) },
    { shopId: shoeShop._id, name: 'Ultra Boost Women', costPrice: 11800, brand: 'Adidas', category: 'Women', subCategory: 'Running', price: 17999, originalPrice: 21000, stockQuantity: 18, lowStockThreshold: 5, sizesJson: '36,37,38,39,40', colorsJson: 'White,Pink,Purple', imageUrl: 'https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=400', description: 'Boost cushioning.', createdAt: new Date(2024, 0, 15), updatedAt: new Date(2024, 0, 15) },
    { shopId: shoeShop._id, name: 'Jordan Legacy High', costPrice: 17000, brand: 'Jordan', category: 'Men', subCategory: 'Basketball', price: 24999, stockQuantity: 12, lowStockThreshold: 5, sizesJson: '41,42,43,44,45', colorsJson: 'Black,Red,White', imageUrl: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400', description: 'Classic high-top.', createdAt: new Date(2024, 1, 1), updatedAt: new Date(2024, 1, 1) },
    { shopId: shoeShop._id, name: 'Court Vision Pro', costPrice: 9800, brand: 'Nike', category: 'Men', subCategory: 'Casual', price: 14999, stockQuantity: 30, lowStockThreshold: 5, sizesJson: '40,41,42,43,44', colorsJson: 'White,Black', imageUrl: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400', description: 'Court-inspired.', createdAt: new Date(2024, 1, 10), updatedAt: new Date(2024, 1, 10) },
    { shopId: shoeShop._id, name: 'Cloud Soft Kids Runner', costPrice: 5800, brand: 'Puma', category: 'Kids', subCategory: 'Running', price: 8999, stockQuantity: 4, lowStockThreshold: 5, sizesJson: '28,29,30,31,32', colorsJson: 'Blue,Green,Yellow', imageUrl: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?w=400', description: 'Kids runner.', createdAt: new Date(2024, 2, 1), updatedAt: new Date(2024, 2, 1) },
    { shopId: shoeShop._id, name: 'Pegasus Trail Hiker', costPrice: 13500, brand: 'Nike', category: 'Men', subCategory: 'Hiking', price: 19999, stockQuantity: 3, lowStockThreshold: 5, sizesJson: '41,42,43,44,45', colorsJson: 'Brown,Olive,Black', imageUrl: 'https://images.unsplash.com/photo-1538329972958-465d6d2144ed?w=400', description: 'Trail shoe.', createdAt: new Date(2024, 3, 1), updatedAt: new Date(2024, 3, 1) },
    { shopId: shoeShop._id, name: 'Formal Oxford Classic', costPrice: 7800, brand: 'Bata', category: 'Men', subCategory: 'Formal', price: 11999, stockQuantity: 0, lowStockThreshold: 5, sizesJson: '40,41,42,43,44', colorsJson: 'Black,Brown', imageUrl: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=400', description: 'Formal oxford.', createdAt: new Date(2024, 3, 10), updatedAt: new Date(2024, 3, 10) },
  ]);

  const sale1 = await ShoeSale.create({ shopId: shoeShop._id, cashierId: shoeOwner._id, invoiceNumber: 'INV-2024-001', customerName: 'Walk-in Customer', subTotal: 18999, discountAmount: 0, taxAmount: 0, total: 18999, paymentMethod: 'Cash', status: 'Completed', saleDate: new Date(2024, 4, 1, 10, 30, 0), items: [{ productId: shoeProducts[0]._id, productName: 'Air Zoom Elite Runner', size: '42', color: 'Black', quantity: 1, unitPrice: 18999 }] });
  await ShoeSale.create({ shopId: shoeShop._id, cashierId: shoeOwner._id, invoiceNumber: 'INV-2024-002', customerName: 'Ali Raza', subTotal: 35998, discountAmount: 2000, taxAmount: 0, total: 33998, paymentMethod: 'Card', status: 'Completed', saleDate: new Date(2024, 4, 2, 14, 15, 0), items: [{ productId: shoeProducts[1]._id, productName: 'Ultra Boost Women', size: '38', color: 'White', quantity: 1, unitPrice: 17999 }, { productId: shoeProducts[0]._id, productName: 'Air Zoom Elite Runner', size: '43', color: 'White', quantity: 1, unitPrice: 17999 }] });
  await ShoeSale.create({ shopId: shoeShop._id, cashierId: shoeOwner._id, invoiceNumber: 'INV-2024-003', customerName: 'Fatima Malik', subTotal: 24999, discountAmount: 2500, taxAmount: 0, total: 22499, paymentMethod: 'Digital', status: 'Completed', saleDate: new Date(2024, 4, 3, 16, 45, 0), items: [{ productId: shoeProducts[2]._id, productName: 'Jordan Legacy High', size: '44', color: 'Black', quantity: 1, unitPrice: 24999 }] });

  await ShoeSalesman.insertMany([
    { shopId: shoeShop._id, name: 'Usman Ali', employeeId: 'EMP-001', phone: '03011111111', email: 'usman@stepup.pk', salary: 30000, joiningDate: new Date(2023, 2, 1), address: 'Gulberg, Lahore', notes: 'Senior salesman.', isActive: true },
    { shopId: shoeShop._id, name: 'Bilal Hussain', employeeId: 'EMP-002', phone: '03022222222', email: 'bilal@stepup.pk', salary: 25000, joiningDate: new Date(2023, 5, 15), address: 'Model Town, Lahore', notes: 'Kids section.', isActive: true },
    { shopId: shoeShop._id, name: 'Sana Tariq', employeeId: 'EMP-003', phone: '03033333333', email: 'sana@stepup.pk', salary: 27000, joiningDate: new Date(2024, 0, 10), address: 'DHA, Lahore', notes: 'Women section.', isActive: true },
  ]);

  const suppliers = await Supplier.insertMany([
    { shopId: shoeShop._id, companyName: 'Nike Pakistan', contactPerson: 'Tariq Mehmood', phone: '04235551001', email: 'tariq@nikepak.com', city: 'Lahore', productsSupplied: 'Nike Air Max, Air Zoom', isActive: true, createdAt: new Date() },
    { shopId: shoeShop._id, companyName: 'Adidas Traders', contactPerson: 'Hina Baig', phone: '04235552002', email: 'hina@adidas.com', city: 'Lahore', productsSupplied: 'Adidas Ultraboost', isActive: true, createdAt: new Date() },
    { shopId: shoeShop._id, companyName: 'Bata Wholesale', contactPerson: 'Farrukh Siddiqui', phone: '04235554004', email: 'farrukh@bata.pk', city: 'Lahore', productsSupplied: 'Bata formal shoes', isActive: true, createdAt: new Date() },
  ]);

  await SupplierOrder.insertMany([
    { shopId: shoeShop._id, supplierId: suppliers[0]._id, orderNumber: 'ORD-001', itemsDescription: 'Nike Air Zoom x20', totalAmount: 250000, paidAmount: 150000, status: 'Delivered', orderDate: new Date(2024, 3, 1), expectedDelivery: new Date(2024, 3, 10), actualDelivery: new Date(2024, 3, 9), notes: 'On time.' },
    { shopId: shoeShop._id, supplierId: suppliers[1]._id, orderNumber: 'ORD-002', itemsDescription: 'Adidas x10', totalAmount: 180000, paidAmount: 180000, status: 'Delivered', orderDate: new Date(2024, 3, 10), expectedDelivery: new Date(2024, 3, 18), actualDelivery: new Date(2024, 3, 17), notes: 'Paid.' },
    { shopId: shoeShop._id, supplierId: suppliers[0]._id, orderNumber: 'ORD-003', itemsDescription: 'Nike Jordan x10', totalAmount: 320000, paidAmount: 0, status: 'Pending', orderDate: new Date(2024, 4, 10), expectedDelivery: new Date(2024, 4, 25), notes: 'Awaiting.' },
  ]);

  // ── Clothing Products ────────────────────────────────────────────────────
  const clothProducts = await ClothingProduct.insertMany([
    { shopId: clothShop._id, name: 'Classic White T-Shirt', brand: 'UniQlo', category: 'T-Shirts', gender: 'Men', sellingPrice: 1299, costPrice: 700, stockQuantity: 50, lowStockThreshold: 10, imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', description: 'Premium cotton tee.', isActive: true },
    { shopId: clothShop._id, name: "Slim Fit Jeans", brand: "Levi's", category: 'Jeans', gender: 'Men', sellingPrice: 3499, costPrice: 2000, stockQuantity: 30, lowStockThreshold: 8, imageUrl: 'https://images.unsplash.com/photo-1542272617-08f086302542?w=400', description: 'Slim fit jeans.', isActive: true },
    { shopId: clothShop._id, name: 'Floral Summer Dress', brand: 'Zara', category: 'Dress', gender: 'Women', sellingPrice: 2999, costPrice: 1500, stockQuantity: 20, lowStockThreshold: 5, imageUrl: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400', description: 'Summer dress.', isActive: true },
    { shopId: clothShop._id, name: 'Casual Hoodie', brand: 'Nike', category: 'Sweater', gender: 'Unisex', sellingPrice: 2499, costPrice: 1400, stockQuantity: 25, lowStockThreshold: 8, imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', description: 'Casual hoodie.', isActive: true },
    { shopId: clothShop._id, name: 'Formal Black Shirt', brand: 'Arrow', category: 'Shirt', gender: 'Men', sellingPrice: 1799, costPrice: 900, stockQuantity: 15, lowStockThreshold: 5, imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', description: 'Formal shirt.', isActive: true },
    { shopId: clothShop._id, name: 'Winter Jacket', brand: 'NorthFace', category: 'Jacket', gender: 'Unisex', sellingPrice: 7999, costPrice: 4500, stockQuantity: 12, lowStockThreshold: 5, imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400', description: 'Winter jacket.', isActive: true },
  ]);

  await ClothingSale.create({ shopId: clothShop._id, invoiceNumber: 'CL-20240501-0001', customerName: 'Ayesha Noor', customerPhone: '03111234567', paymentMethod: 'Cash', status: 'Completed', salesmanName: 'Sara Ali', subTotal: 4798, discountAmount: 0, taxAmount: 0, totalAmount: 4798, amountPaid: 4798, totalItemCount: 2, saleDate: new Date(2024, 4, 1, 11, 0, 0), items: [{ productId: clothProducts[0]._id, productName: 'Classic White T-Shirt', size: 'M', color: 'White', quantity: 2, unitPrice: 1299, lineTotal: 2598 }, { productId: clothProducts[4]._id, productName: 'Formal Black Shirt', size: 'L', color: 'Black', quantity: 1, unitPrice: 1799, lineTotal: 1799 }] });
  await ClothingSale.create({ shopId: clothShop._id, invoiceNumber: 'CL-20240502-0002', customerName: 'Bilal Ahmed', customerPhone: '03221234567', paymentMethod: 'Card', status: 'Completed', salesmanName: 'Sara Ali', subTotal: 5998, discountAmount: 500, taxAmount: 0, totalAmount: 5498, amountPaid: 5498, totalItemCount: 2, saleDate: new Date(2024, 4, 2, 14, 30, 0), items: [{ productId: clothProducts[1]._id, productName: 'Slim Fit Jeans', size: '32', color: 'Blue', quantity: 1, unitPrice: 3499, lineTotal: 3499 }, { productId: clothProducts[3]._id, productName: 'Casual Hoodie', size: 'M', color: 'Black', quantity: 1, unitPrice: 2499, lineTotal: 2499 }] });
  await ClothingSale.create({ shopId: clothShop._id, invoiceNumber: 'CL-20240503-0003', customerName: 'Walk-in', paymentMethod: 'Cash', status: 'Completed', salesmanName: 'Sara Ali', subTotal: 7999, discountAmount: 0, taxAmount: 0, totalAmount: 7999, amountPaid: 7999, totalItemCount: 1, saleDate: new Date(2024, 4, 3, 16, 0, 0), items: [{ productId: clothProducts[5]._id, productName: 'Winter Jacket', size: 'L', color: 'Black', quantity: 1, unitPrice: 7999, lineTotal: 7999 }] });
  await ClothingSale.create({ shopId: clothShop._id, invoiceNumber: 'CL-20240504-0004', customerName: 'Hina Malik', customerPhone: '03331234567', paymentMethod: 'Digital', status: 'Completed', salesmanName: 'Sara Ali', subTotal: 4298, discountAmount: 0, taxAmount: 0, totalAmount: 4298, amountPaid: 4298, totalItemCount: 2, saleDate: new Date(2024, 4, 4, 10, 15, 0), items: [{ productId: clothProducts[2]._id, productName: 'Floral Summer Dress', size: 'S', color: 'Multi', quantity: 1, unitPrice: 2999, lineTotal: 2999 }, { productId: clothProducts[0]._id, productName: 'Classic White T-Shirt', size: 'S', color: 'White', quantity: 1, unitPrice: 1299, lineTotal: 1299 }] });
  await ClothingSale.create({ shopId: clothShop._id, invoiceNumber: 'CL-20240505-0005', customerName: 'Usman Tariq', customerPhone: '03441234567', paymentMethod: 'Cash', status: 'Completed', salesmanName: 'Sara Ali', subTotal: 3498, discountAmount: 200, taxAmount: 0, totalAmount: 3298, amountPaid: 3298, totalItemCount: 2, saleDate: new Date(2024, 4, 5, 12, 45, 0), items: [{ productId: clothProducts[1]._id, productName: 'Slim Fit Jeans', size: '30', color: 'Black', quantity: 1, unitPrice: 3499, lineTotal: 3499 }, { productId: clothProducts[0]._id, productName: 'Classic White T-Shirt', size: 'L', color: 'White', quantity: 1, unitPrice: 1299, lineTotal: 1299 }] });

  console.log('Seed complete.');
  console.log('Login as: admin@stepup.pk / Admin@123 (Shoes shop)');
  console.log('Login as: admin@stylehub.pk / Admin@123 (Clothing shop)');
  return true;
}

module.exports = seed;

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
