"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcrypt"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: '.env' });
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('📝 Please create a .env file in the backend directory with DATABASE_URL');
    console.error('📋 Example: DATABASE_URL="postgresql://user:password@localhost:5432/eagle_db?schema=public"');
    process.exit(1);
}
const pool = new pg_1.Pool({ connectionString: dbUrl });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Seeding test B2B users...');
    try {
        await prisma.$connect();
        console.log('✅ Database connected');
    }
    catch (error) {
        console.error('❌ Failed to connect to database:', error.message);
        console.error('💡 Make sure PostgreSQL is running and DATABASE_URL is correct');
        process.exit(1);
    }
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
    }
    else {
        console.log('✅ Using existing merchant:', merchant.id);
    }
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
            status: 'active',
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
    const passwordHash1 = await bcrypt.hash('test1234', 10);
    const passwordHash2 = await bcrypt.hash('test1234', 10);
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
//# sourceMappingURL=seed-test-users.js.map