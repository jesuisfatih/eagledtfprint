import { Module, Global } from '@nestjs/common';
import { TransactionService } from './services/transaction.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class CommonModule {}
