const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const merchants = await p.merchant.findMany({ select: { id: true, shopDomain: true, email: true } });
  console.log('=== MERCHANTS ===');
  console.log(JSON.stringify(merchants, null, 2));

  const users = await p.companyUser.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, role: true, companyId: true }
  });
  console.log('=== COMPANY USERS ===');
  console.log(JSON.stringify(users, null, 2));

  const companies = await p.company.findMany({ select: { id: true, name: true } });
  console.log('=== COMPANIES ===');
  console.log(JSON.stringify(companies, null, 2));
}

main().catch(console.error).finally(() => p.$disconnect());
