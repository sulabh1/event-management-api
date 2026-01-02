import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateEventTable1767285888203 implements MigrationInterface {
  name = 'CreateEventTable1767285888203';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'events',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'date',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'venue',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'total_seats',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'available_seats',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IDX_events_date',
        columnNames: ['date'],
      }),
    );

    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IDX_events_available_seats',
        columnNames: ['available_seats'],
      }),
    );

    await queryRunner.createIndex(
      'events',
      new TableIndex({
        name: 'IDX_events_created_at',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('events', 'IDX_events_created_at');
    await queryRunner.dropIndex('events', 'IDX_events_available_seats');
    await queryRunner.dropIndex('events', 'IDX_events_date');
    await queryRunner.dropTable('events');
  }
}
