import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Event } from './entities/event.entity';

@Injectable()
export class EventsRepository extends Repository<Event> {
  constructor(private dataSource: DataSource) {
    super(Event, dataSource.createEntityManager());
  }

  async findEventWithLock(id: string): Promise<Event | null> {
    return this.findOne({
      where: { id },
    });
  }

  async findEventsWithPagination(
    skip: number,
    take: number,
    filters?: any,
  ): Promise<[Event[], number]> {
    const query = this.createQueryBuilder('event');

    if (filters?.title) {
      query.andWhere('event.title ILIKE :title', {
        title: `%${filters.title}%`,
      });
    }

    if (filters?.startDate) {
      query.andWhere('event.date >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      query.andWhere('event.date <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters?.availableOnly) {
      query.andWhere('event.availableSeats > 0');
    }

    if (filters?.sortBy) {
      const order = filters.order || 'ASC';
      query.orderBy(`event.${filters.sortBy}`, order);
    } else {
      query.orderBy('event.date', 'ASC');
    }

    return query.skip(skip).take(take).getManyAndCount();
  }
}
