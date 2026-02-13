import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  console.error('📝 Please create a .env file in the backend directory with DATABASE_URL');
  console.error('📋 Example: DATABASE_URL="postgresql://user:password@localhost:5432/eagle_db?schema=public"');
  process.exit(1);
}

const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Seeding test B2B users...');
  
  // Connect to database
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    console.error('💡 Make sure PostgreSQL is running and DATABASE_URL is correct');
    process.exit(1);
  }

  // 1. Get or create merchant
  let merchant = await prisma.merchant.findFirst();
  
  if (!merchant) {
    console.log('📦 Creating default merchant...');
    merchant = await prisma.merchant.create({
      data: {
        shopDomain: 'eagle-dtf-supply0.myshopify.com',
        accessToken: 'test-token',
        status: 'active',
        planName: 'plus',
      },
    });
    console.log('✅ Merchant created:', merchant.id);
  } else {
    console.log('✅ Using existing merchant:', merchant.id);
  }

  // 2. Create B2B Company
  console.log('🏢 Creating B2B company...');
  const company = await prisma.company.upsert({
    where: {
      id: 'test-b2b-company-id',
    },
    update: {},
    create: {
      id: 'test-b2b-company-id',
      merchantId: merchant.id,
      name: 'Test B2B Şirketi',
      legalName: 'Test B2B Şirketi Ltd. Şti.',
      taxId: '1234567890',
      email: 'info@testb2b.com',
      phone: '+90 555 123 4567',
      companyGroup: 'b2b',
      status: 'active', // Approved
      billingAddress: {
        address1: 'Test Caddesi No: 123',
        address2: 'Kat: 5',
        city: 'İstanbul',
        province: 'İstanbul',
        zip: '34000',
        country: 'Turkey',
      },
      shippingAddress: {
        address1: 'Test Caddesi No: 123',
        address2: 'Kat: 5',
        city: 'İstanbul',
        province: 'İstanbul',
        zip: '34000',
        country: 'Turkey',
      },
    },
  });
  console.log('✅ Company created:', company.id);

  // 3. Hash passwords
  const passwordHash1 = await bcrypt.hash('test1234', 10);
  const passwordHash2 = await bcrypt.hash('test1234', 10);

  // 4. Create main user (admin)
  console.log('👤 Creating main user (admin)...');
  const mainUser = await prisma.companyUser.upsert({
    where: {
      email: 'admin@testb2b.com',
    },
    update: {
      passwordHash: passwordHash1,
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      role: 'admin',
      isActive: true,
      companyId: company.id,
    },
    create: {
      email: 'admin@testb2b.com',
      passwordHash: passwordHash1,
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      role: 'admin',
      isActive: true,
      companyId: company.id,
    },
  });
  console.log('✅ Main user created:', mainUser.email);
  console.log('   Email: admin@testb2b.com');
  console.log('   Password: test1234');
  console.log('   Role: admin');

  // 5. Create sub user (buyer)
  console.log('👤 Creating sub user (buyer)...');
  const subUser = await prisma.companyUser.upsert({
    where: {
      email: 'buyer@testb2b.com',
    },
    update: {
      passwordHash: passwordHash2,
      firstName: 'Mehmet',
      lastName: 'Demir',
      role: 'buyer',
      isActive: true,
      companyId: company.id,
    },
    create: {
      email: 'buyer@testb2b.com',
      passwordHash: passwordHash2,
      firstName: 'Mehmet',
      lastName: 'Demir',
      role: 'buyer',
      isActive: true,
      companyId: company.id,
    },
  });
  console.log('✅ Sub user created:', subUser.email);
  console.log('   Email: buyer@testb2b.com');
  console.log('   Password: test1234');
  console.log('   Role: buyer');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Test Users:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏢 Company: Test B2B Şirketi');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 Admin User:');
  console.log('   Email: admin@testb2b.com');
  console.log('   Password: test1234');
  console.log('   Role: admin');
  console.log('');
  console.log('👤 Buyer User:');
  console.log('   Email: buyer@testb2b.com');
  console.log('   Password: test1234');
  console.log('   Role: buyer');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

