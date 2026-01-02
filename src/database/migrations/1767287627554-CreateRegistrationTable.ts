import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateRegistrationTable1767287627554 implements MigrationInterface {
  name = 'CreateRegistrationTable1767287627554';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'registrations',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'event_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'registration_date',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['confirmed', 'cancelled'],
            default: "'confirmed'",
          },
        ],
      }),
      true,
    );

    await queryRunner.createUniqueConstraint(
      'registrations',
      new Table({
        name: 'registrations',
        columns: [],
        uniques: [
          {
            name: 'UQ_registrations_user_event',
            columnNames: ['user_id', 'event_id'],
          },
        ],
      }).uniques[0],
    );

    await queryRunner.createIndex(
      'registrations',
      new TableIndex({
        name: 'IDX_registrations_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'registrations',
      new TableIndex({
        name: 'IDX_registrations_event_id',
        columnNames: ['event_id'],
      }),
    );

    await queryRunner.createIndex(
      'registrations',
      new TableIndex({
        name: 'IDX_registrations_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'registrations',
      new TableIndex({
        name: 'IDX_registrations_registration_date',
        columnNames: ['registration_date'],
      }),
    );

    await queryRunner.createForeignKey(
      'registrations',
      new TableForeignKey({
        name: 'FK_registrations_user_id',
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
      }),
    );

    await queryRunner.createForeignKey(
      'registrations',
      new TableForeignKey({
        name: 'FK_registrations_event_id',
        columnNames: ['event_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'events',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropUniqueConstraint(
      'registrations',
      'UQ_registrations_user_event',
    );

    await queryRunner.dropForeignKey(
      'registrations',
      'FK_registrations_event_id',
    );
    await queryRunner.dropForeignKey(
      'registrations',
      'FK_registrations_user_id',
    );

    // Drop indexes
    await queryRunner.dropIndex(
      'registrations',
      'IDX_registrations_registration_date',
    );
    await queryRunner.dropIndex('registrations', 'IDX_registrations_status');
    await queryRunner.dropIndex('registrations', 'IDX_registrations_event_id');
    await queryRunner.dropIndex('registrations', 'IDX_registrations_user_id');

    await queryRunner.dropTable('registrations');
  }
}
