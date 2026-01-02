import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './data-source';

@Global()
@Module({
  imports: [TypeOrmModule.forRoot(dataSourceOptions)],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
