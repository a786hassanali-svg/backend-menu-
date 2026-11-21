import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import crypto from 'crypto';
import { User } from './models/User.js';
import { Restaurant } from './models/Restaurant.js';
import { Table } from './models/Table.js';
import { Category } from './models/Category.js';
import { Product } from './models/Product.js';
import { Order } from './models/Order.js';
import { OrderCounter } from './models/OrderCounter.js';
import { Review } from './models/Review.js';
import { generateQRCodeDataUrl } from './utils/qr.js';

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: 'restaurant_qr_db',
    });
    console.log('[Seed] Connected! Clearing existing demo data...');

    await Promise.all([
      User.deleteMany({}),
      Restaurant.deleteMany({}),
      Table.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Order.deleteMany({}),
      OrderCounter.deleteMany({}),
      Review.deleteMany({}),
    ]);

    console.log('[Seed] Cleared collections.');

    // 1. Create Super Admin
    const superAdmin = await User.create({
      name: 'Global Super Admin',
      email: 'superadmin@restaurant.com',
      password: 'admin123456',
      phone: '+1 555-0100',
      role: 'super_admin',
      permissions: ['all'],
      isActive: true,
    });

    // 2. Create Restaurant: Restaurant
    const restaurant = await Restaurant.create({
      name: 'Restaurant',
      slug: 'restaurant',
      tagline: 'Delicious Food & Fast Table Service',
      logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80',
      coverImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      address: '742 Evergreen Terrace, Downtown Food District',
      phone: '+92 300 1234567',
      email: 'hello@restaurant.com',
      currency: 'PKR',
      currencySymbol: 'PKR ',
      taxPercentage: 5.0,
      serviceChargePercentage: 2.5,
      openingHours: '10:00 AM',
      closingHours: '11:30 PM',
      isCurrentlyOpen: true,
      isOnlineOrderingEnabled: true,
      isSoundAlertEnabled: true,
      autoAcceptOrders: false,
      location: {
        latitude: 40.712776,
        longitude: -74.005974,
        address: '742 Evergreen Terrace, Downtown Food District',
      },
      allowedRadiusMeters: 300,
      createdBy: superAdmin._id,
    });

    console.log('[Seed] Restaurant created:', restaurant.name);

    // 3. Create Restaurant Admin & Staff
    const restaurantAdmin = await User.create({
      name: 'Alex Rivera (Owner)',
      email: 'admin@sangatcafe.com',
      password: 'admin123456',
      phone: '+1 555-0198',
      role: 'restaurant_admin',
      restaurantId: restaurant._id,
      permissions: ['all'],
      isActive: true,
    });

    const chef = await User.create({
      name: 'Chef Marco Rossi',
      email: 'chef@sangatcafe.com',
      password: 'staff123456',
      phone: '+1 555-0197',
      role: 'kitchen_staff',
      restaurantId: restaurant._id,
      permissions: ['view_kds', 'update_kitchen_status'],
      isActive: true,
    });

    const waiter = await User.create({
      name: 'Sarah Jenkins',
      email: 'waiter@sangatcafe.com',
      password: 'staff123456',
      phone: '+1 555-0196',
      role: 'waiter',
      restaurantId: restaurant._id,
      permissions: ['view_orders', 'update_delivery'],
      isActive: true,
    });

    console.log('[Seed] Admin and Staff users created.');

    // 4. Create Tables with unique QR Codes (Tables 01 to 08)
    const tables = [];
    const qrBaseUrl = process.env.QR_BASE_URL || 'http://localhost:5173/menu';

    for (let i = 1; i <= 8; i++) {
      const tableNumber = String(i).padStart(2, '0');
      const qrToken = `table-token-sc-${tableNumber}-${crypto.randomBytes(4).toString('hex')}`;
      const menuUrl = `${qrBaseUrl}/${qrToken}`;
      const qrCodeDataUrl = await generateQRCodeDataUrl(menuUrl);

      const table = await Table.create({
        restaurantId: restaurant._id,
        tableNumber: `Table ${tableNumber}`,
        name: `Table ${tableNumber} (Indoor)`,
        capacity: i % 2 === 0 ? 4 : 2,
        qrToken,
        qrCodeDataUrl,
        isActive: true,
        occupancyStatus: i === 1 ? 'has_active_order' : i === 2 ? 'has_pending_order' : 'available',
      });
      tables.push(table);
    }
    console.log(`[Seed] Created ${tables.length} tables with secure QR tokens.`);

    // 5. Create Food Categories
    const categoriesData = [
      {
        name: 'Burgers',
        slug: 'burgers',
        description: 'Prime Angus beef and crispy chicken burgers served with seasoned fries',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        displayOrder: 1,
      },
      {
        name: 'Pizza',
        slug: 'pizza',
        description: 'Artisanal hand-stretched sourdough pizzas baked in stone ovens',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
        displayOrder: 2,
      },
      {
        name: 'Fast Food',
        slug: 'fast-food',
        description: 'Loaded fries, crispy wings, wraps, and finger-licking sides',
        image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=600&q=80',
        displayOrder: 3,
      },
      {
        name: 'BBQ & Grills',
        slug: 'bbq-grills',
        description: 'Smoky hickory skewers, grilled steaks, and tender ribs',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
        displayOrder: 4,
      },
      {
        name: 'Drinks',
        slug: 'drinks',
        description: 'Chilled iced coffees, artisan mocktails, shakes, and fresh sodas',
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
        displayOrder: 5,
      },
      {
        name: 'Desserts',
        slug: 'desserts',
        description: 'Decadent chocolate lava cakes, churros, cheesecakes, and gelato',
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80',
        displayOrder: 6,
      },
    ];

    const createdCategories = {};
    for (const cat of categoriesData) {
      const created = await Category.create({
        ...cat,
        restaurantId: restaurant._id,
        isActive: true,
      });
      createdCategories[cat.slug] = created;
    }
    console.log(`[Seed] Created ${categoriesData.length} food categories.`);

    // 6. Create Food Products
    const productsData = [
      // Burgers
      {
        name: 'Truffle Smash Burger',
        slug: 'truffle-smash-burger',
        categoryId: createdCategories['burgers']._id,
        description: 'Double Angus beef patties, aged gouda, black truffle mayo, caramelized onions on toasted brioche.',
        images: ['https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80'],
        price: 14.5,
        discountPrice: 12.99,
        variations: [
          { name: 'Single Patty', price: 11.5 },
          { name: 'Double Patty', price: 14.5 },
          { name: 'Triple Monster', price: 18.0 },
        ],
        addOns: [
          { name: 'Extra Cheddar Cheese', price: 1.5 },
          { name: 'Crispy Bacon', price: 2.0 },
          { name: 'Fried Egg', price: 1.25 },
        ],
        ingredients: ['Angus Beef', 'Brioche Bun', 'Gouda Cheese', 'Truffle Aioli', 'Caramelized Onions'],
        allergens: ['Dairy', 'Gluten', 'Eggs'],
        preparationTimeMinutes: 12,
        isFeatured: true,
        isAvailable: true,
      },
      {
        name: 'Crispy Nashville Hot Chicken',
        slug: 'nashville-hot-chicken',
        categoryId: createdCategories['burgers']._id,
        description: 'Buttermilk fried chicken breast dipped in spicy cayenne oil, crunchy slaw, dill pickles.',
        images: ['https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&q=80'],
        price: 13.0,
        discountPrice: null,
        variations: [
          { name: 'Medium Heat', price: 13.0 },
          { name: 'Extra Hot (Ghost Pepper)', price: 14.0 },
        ],
        addOns: [
          { name: 'Ranch Dip', price: 0.99 },
          { name: 'Pickle Fries', price: 2.5 },
        ],
        ingredients: ['Chicken Breast', 'Buttermilk', 'Nashville Cayenne Glaze', 'Slaw', 'Pickles'],
        allergens: ['Dairy', 'Gluten'],
        preparationTimeMinutes: 15,
        isFeatured: true,
        isAvailable: true,
      },
      // Pizza
      {
        name: 'Rustic Pepperoni & Hot Honey',
        slug: 'rustic-pepperoni-hot-honey',
        categoryId: createdCategories['pizza']._id,
        description: 'San Marzano tomato sauce, fresh mozzarella, spicy artisan pepperoni, fresh basil, and chili hot honey drizzle.',
        images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80'],
        price: 18.0,
        discountPrice: 16.5,
        variations: [
          { name: '10 inch Medium', price: 15.0 },
          { name: '14 inch Large', price: 18.0 },
        ],
        addOns: [
          { name: 'Stuffed Crust Cheese', price: 3.0 },
          { name: 'Extra Hot Honey', price: 1.0 },
          { name: 'Garlic Butter Dip', price: 1.25 },
        ],
        ingredients: ['Sourdough Crust', 'San Marzano Sauce', 'Mozzarella', 'Pepperoni', 'Chili Honey'],
        allergens: ['Dairy', 'Gluten'],
        preparationTimeMinutes: 18,
        isFeatured: true,
        isAvailable: true,
      },
      {
        name: 'Margherita Burrata Special',
        slug: 'margherita-burrata-special',
        categoryId: createdCategories['pizza']._id,
        description: 'San Marzano tomatoes, whole creamy burrata cheese ball, cherry tomatoes, fresh basil, extra virgin olive oil.',
        images: ['https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80'],
        price: 17.0,
        discountPrice: null,
        variations: [
          { name: '10 inch Medium', price: 14.0 },
          { name: '14 inch Large', price: 17.0 },
        ],
        addOns: [
          { name: 'Prosciutto Crudo', price: 3.5 },
          { name: 'Arugula Greens', price: 1.5 },
        ],
        ingredients: ['Sourdough', 'Burrata', 'San Marzano', 'Basil', 'EVOO'],
        allergens: ['Dairy', 'Gluten'],
        preparationTimeMinutes: 16,
        isFeatured: false,
        isAvailable: true,
      },
      // Fast Food
      {
        name: 'Loaded Chili Cheese Fries',
        slug: 'loaded-chili-cheese-fries',
        categoryId: createdCategories['fast-food']._id,
        description: 'Golden crispy skin-on fries topped with slow-simmered beef chili, melted cheddar sauce, sour cream, and jalapenos.',
        images: ['https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80'],
        price: 8.5,
        discountPrice: 7.5,
        variations: [],
        addOns: [
          { name: 'Guacamole Scoop', price: 2.0 },
          { name: 'Extra Jalapenos', price: 0.75 },
        ],
        ingredients: ['Potatoes', 'Beef Chili', 'Cheddar Sauce', 'Sour Cream', 'Jalapeno'],
        allergens: ['Dairy'],
        preparationTimeMinutes: 10,
        isFeatured: true,
        isAvailable: true,
      },
      {
        name: 'Smoky BBQ Chicken Wings (8 pcs)',
        slug: 'smoky-bbq-chicken-wings',
        categoryId: createdCategories['fast-food']._id,
        description: 'Crisp fried jumbo wings tossed in signature hickory BBQ sauce, served with blue cheese dressing and celery.',
        images: ['https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=600&q=80'],
        price: 11.5,
        discountPrice: null,
        variations: [
          { name: '8 Pieces', price: 11.5 },
          { name: '16 Pieces Sharing', price: 21.0 },
        ],
        addOns: [
          { name: 'Blue Cheese Dip', price: 1.0 },
          { name: 'Garlic Parmesan Rub', price: 1.5 },
        ],
        ingredients: ['Chicken Wings', 'BBQ Sauce', 'Spices', 'Blue Cheese'],
        allergens: ['Dairy'],
        preparationTimeMinutes: 14,
        isFeatured: false,
        isAvailable: true,
      },
      // BBQ
      {
        name: 'Charred Lamb Chops with Chimichurri',
        slug: 'charred-lamb-chops',
        categoryId: createdCategories['bbq-grills']._id,
        description: 'Tender marinated New Zealand lamb chops grilled over open coals, brushed with garlic herb butter and fresh chimichurri.',
        images: ['https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'],
        price: 24.0,
        discountPrice: 22.0,
        variations: [
          { name: '3 Chops Plate', price: 22.0 },
          { name: '5 Chops Platter', price: 32.0 },
        ],
        addOns: [
          { name: 'Grilled Asparagus', price: 4.0 },
          { name: 'Mashed Garlic Potatoes', price: 3.5 },
        ],
        ingredients: ['Lamb Chops', 'Chimichurri', 'Garlic Butter', 'Sea Salt', 'Rosemary'],
        allergens: ['Dairy'],
        preparationTimeMinutes: 20,
        isFeatured: true,
        isAvailable: true,
      },
      // Drinks
      {
        name: 'Signature Berry Mojito Mocktail',
        slug: 'berry-mojito-mocktail',
        categoryId: createdCategories['drinks']._id,
        description: 'Crushed wild blackberries, fresh garden mint, Persian lime juice, and sparkling soda over crushed ice.',
        images: ['https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80'],
        price: 6.5,
        discountPrice: null,
        variations: [],
        addOns: [{ name: 'Chia Seeds Boost', price: 0.5 }],
        ingredients: ['Blackberries', 'Mint', 'Lime Juice', 'Cane Sugar', 'Club Soda'],
        allergens: [],
        preparationTimeMinutes: 5,
        isFeatured: false,
        isAvailable: true,
      },
      {
        name: 'Iced Caramel Macchiato',
        slug: 'iced-caramel-macchiato',
        categoryId: createdCategories['drinks']._id,
        description: 'Double shot espresso poured over cold vanilla milk, topped with rich buttery caramel drizzle.',
        images: ['https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80'],
        price: 5.5,
        discountPrice: null,
        variations: [
          { name: 'Regular (16 oz)', price: 5.5 },
          { name: 'Large (24 oz)', price: 6.5 },
        ],
        addOns: [
          { name: 'Oat Milk Substitution', price: 0.8 },
          { name: 'Extra Espresso Shot', price: 1.0 },
        ],
        ingredients: ['Espresso', 'Whole Milk', 'Vanilla Syrup', 'Caramel Sauce'],
        allergens: ['Dairy'],
        preparationTimeMinutes: 5,
        isFeatured: true,
        isAvailable: true,
      },
      // Desserts
      {
        name: 'Molten Chocolate Lava Cake',
        slug: 'molten-chocolate-lava-cake',
        categoryId: createdCategories['desserts']._id,
        description: 'Warm dark Belgian chocolate cake with a molten flowing center, served with Madagascar vanilla bean ice cream.',
        images: ['https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=80'],
        price: 8.95,
        discountPrice: null,
        variations: [],
        addOns: [
          { name: 'Extra Vanilla Ice Cream Scoop', price: 2.0 },
          { name: 'Fresh Raspberries', price: 1.5 },
        ],
        ingredients: ['Dark Chocolate', 'Butter', 'Eggs', 'Sugar', 'Vanilla Ice Cream'],
        allergens: ['Dairy', 'Gluten', 'Eggs'],
        preparationTimeMinutes: 12,
        isFeatured: true,
        isAvailable: true,
      },
    ];

    const createdProducts = [];
    for (const prod of productsData) {
      const created = await Product.create({
        ...prod,
        restaurantId: restaurant._id,
      });
      createdProducts.push(created);
    }
    console.log(`[Seed] Created ${createdProducts.length} food products.`);

    // 7. Create Demo Orders to populate dashboard and analytics
    const burgerProduct = createdProducts[0];
    const friesProduct = createdProducts[4];
    const drinkProduct = createdProducts[7];

    const orderItems = [
      {
        productId: burgerProduct._id,
        name: burgerProduct.name,
        price: 12.99,
        quantity: 2,
        variation: { name: 'Double Patty', price: 14.5 },
        addOns: [{ name: 'Extra Cheddar Cheese', price: 1.5 }],
        specialInstructions: 'No onions on one burger please',
        itemTotal: 32.0,
      },
      {
        productId: friesProduct._id,
        name: friesProduct.name,
        price: 7.5,
        quantity: 1,
        variation: null,
        addOns: [{ name: 'Guacamole Scoop', price: 2.0 }],
        specialInstructions: 'Extra crispy',
        itemTotal: 9.5,
      },
      {
        productId: drinkProduct._id,
        name: drinkProduct.name,
        price: 6.5,
        quantity: 2,
        variation: null,
        addOns: [],
        specialInstructions: 'Less ice',
        itemTotal: 13.0,
      },
    ];

    const demoSubtotal = 54.5;
    const demoTax = 2.73;
    const demoService = 1.36;
    const demoGrandTotal = 58.59;

    // Order 1: New / Active (Table 01)
    const order1 = await Order.create({
      orderNumber: 'ORD-2026-00001',
      restaurantId: restaurant._id,
      tableId: tables[0]._id,
      tableNumber: 'Table 01',
      customer: {
        name: 'Jordan Miller',
        phone: '+1 555-4321',
        location: {
          latitude: 40.71278,
          longitude: -74.00598,
          distanceMeters: 4.2,
          accuracy: 8,
          verified: true,
        },
      },
      items: orderItems,
      subtotal: demoSubtotal,
      taxAmount: demoTax,
      serviceChargeAmount: demoService,
      grandTotal: demoGrandTotal,
      paymentMethod: 'cash_at_table',
      paymentStatus: 'pending',
      status: 'new',
      statusTimeline: [
        {
          status: 'new',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          note: 'Order placed by customer at Table 01',
          updatedBy: 'customer',
        },
      ],
      notes: 'Please bring water glasses first',
    });

    tables[0].currentOrderId = order1._id;
    await tables[0].save();

    // Order 2: Preparing (Table 02)
    const order2 = await Order.create({
      orderNumber: 'ORD-2026-00002',
      restaurantId: restaurant._id,
      tableId: tables[1]._id,
      tableNumber: 'Table 02',
      customer: {
        name: 'Emma Watson',
        phone: '+1 555-8765',
        location: {
          latitude: 40.71279,
          longitude: -74.00595,
          distanceMeters: 7.1,
          accuracy: 5,
          verified: true,
        },
      },
      items: [orderItems[0]],
      subtotal: 32.0,
      taxAmount: 1.6,
      serviceChargeAmount: 0.8,
      grandTotal: 34.4,
      paymentMethod: 'cash_at_table',
      paymentStatus: 'pending',
      status: 'preparing',
      statusTimeline: [
        {
          status: 'new',
          timestamp: new Date(Date.now() - 25 * 60 * 1000),
          note: 'Order placed by customer',
          updatedBy: 'customer',
        },
        {
          status: 'confirmed',
          timestamp: new Date(Date.now() - 20 * 60 * 1000),
          note: 'Order accepted by Alex Rivera',
          updatedBy: 'Alex Rivera',
        },
        {
          status: 'preparing',
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          note: 'Kitchen started preparation',
          updatedBy: 'Chef Marco Rossi',
        },
      ],
    });

    tables[1].currentOrderId = order2._id;
    await tables[1].save();

    // Order 3: Delivered with Review (Table 03)
    const order3 = await Order.create({
      orderNumber: 'ORD-2026-00003',
      restaurantId: restaurant._id,
      tableId: tables[2]._id,
      tableNumber: 'Table 03',
      customer: {
        name: 'David Beckham',
        phone: '+1 555-9012',
        location: {
          latitude: 40.71275,
          longitude: -74.00599,
          distanceMeters: 9.3,
          accuracy: 6,
          verified: true,
        },
      },
      items: [orderItems[1], orderItems[2]],
      subtotal: 22.5,
      taxAmount: 1.12,
      serviceChargeAmount: 0.56,
      grandTotal: 24.18,
      paymentMethod: 'cash_at_table',
      paymentStatus: 'paid',
      status: 'delivered',
      statusTimeline: [
        {
          status: 'new',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          note: 'Order placed',
          updatedBy: 'customer',
        },
        {
          status: 'confirmed',
          timestamp: new Date(Date.now() - 55 * 60 * 1000),
          note: 'Confirmed',
          updatedBy: 'Alex Rivera',
        },
        {
          status: 'preparing',
          timestamp: new Date(Date.now() - 50 * 60 * 1000),
          note: 'Cooking in kitchen',
          updatedBy: 'Chef Marco Rossi',
        },
        {
          status: 'ready',
          timestamp: new Date(Date.now() - 35 * 60 * 1000),
          note: 'Ready for pickup at counter',
          updatedBy: 'Chef Marco Rossi',
        },
        {
          status: 'delivered',
          timestamp: new Date(Date.now() - 25 * 60 * 1000),
          note: 'Delivered to Table 03 by Sarah',
          updatedBy: 'Sarah Jenkins',
        },
      ],
    });

    // Create Review for Order 3
    await Review.create({
      restaurantId: restaurant._id,
      orderId: order3._id,
      customerName: 'David Beckham',
      rating: 5,
      foodQualityRating: 5,
      serviceRating: 5,
      comment: 'Super fast ordering right from the table QR! The chili cheese fries were incredible.',
    });

    // Initialize OrderCounter
    await OrderCounter.create({
      restaurantId: restaurant._id,
      year: new Date().getFullYear(),
      seq: 3,
    });

    console.log('[Seed] Demo orders and review created successfully!');
    console.log('=======================================================');
    console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
    console.log(`Demo Restaurant: ${restaurant.name} (${restaurant.slug})`);
    console.log(`Restaurant ID: ${restaurant._id}`);
    console.log(`Admin Login: admin@sangatcafe.com / admin123456`);
    console.log(`Super Admin: superadmin@restaurant.com / admin123456`);
    console.log(`Kitchen Staff: chef@sangatcafe.com / staff123456`);
    console.log(`Waiter Staff: waiter@sangatcafe.com / staff123456`);
    console.log(`Table 01 QR Menu URL: ${qrBaseUrl}/${tables[0].qrToken}`);
    console.log(`Table 01 QR Token: ${tables[0].qrToken}`);
    console.log('=======================================================');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();

