import { BadRequestException, Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { EventsRepository } from './events.repository';
import { CreateEventDto } from './dtos/create-event.dto';
import { UpdateEventDto } from './dtos/update-event.dto';
import { SearchEventsDto } from './dtos/search-events.dto';
import { Event } from './entities/event.entity';
import {
  ConflictError,
  NotFoundError,
} from '../../common/errors/application.errors';

@Injectable()
export class EventsService {
  constructor(
    private readonly eventsRepository: EventsRepository,
    private readonly redisService: RedisService,
  ) {}

  private getEventCacheKey(id: string): string {
    return `event:${id}`;
  }

  private getEventsCacheKey(filters: SearchEventsDto): string {
    return `events:${JSON.stringify(filters)}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async create(createEventDto: CreateEventDto, userId: string): Promise<Event> {
    try {
      const event = this.eventsRepository.create({
        ...createEventDto,
        availableSeats: createEventDto.totalSeats,
      });

      const savedEvent = await this.eventsRepository.save(event);

      await this.redisService.delPattern('events:*');

      return savedEvent;
    } catch (error) {
      console.log(error, 'error from this');
      throw new BadRequestException(error.message);
    }
  }

  async findAll(searchDto: SearchEventsDto): Promise<[Event[], number]> {
    try {
      const cacheKey = this.getEventsCacheKey(searchDto);

      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const page = searchDto.page || 1;
      const limit = searchDto.limit || 10;
      const skip = (page - 1) * limit;

      const [events, total] =
        await this.eventsRepository.findEventsWithPagination(
          skip,
          limit,
          searchDto,
        );

      await this.redisService.set(
        cacheKey,
        JSON.stringify([events, total]),
        300,
      );

      return [events, total];
    } catch (error) {
      throw new NotFoundError(error.message);
    }
  }

  async findOne(id: string): Promise<Event> {
    try {
      const cacheKey = this.getEventCacheKey(id);

      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const event = await this.eventsRepository.findOne({
        where: { id },
      });

      if (!event) {
        throw new NotFoundError(`Event with ID ${id} not found`);
      }

      await this.redisService.set(cacheKey, JSON.stringify(event), 60);

      return event;
    } catch (error) {
      throw new NotFoundError(error.message);
    }
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    try {
      const event = await this.findOne(id);

      Object.assign(event, updateEventDto);

      const updatedEvent = await this.eventsRepository.save(event);

      await this.redisService.del(this.getEventCacheKey(id));
      await this.redisService.delPattern('events:*');

      return updatedEvent;
    } catch (error) {
      throw new BadRequestException('Error while updating user', error.message);
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const event = await this.findOne(id);
      await this.eventsRepository.remove(event);

      await this.redisService.del(this.getEventCacheKey(id));
      await this.redisService.delPattern('events:*');
    } catch (error) {
      throw new NotFoundError(error.message);
    }
  }

  async reserveSeats(eventId: string, seats: number = 1): Promise<Event> {
    try {
      const event = await this.eventsRepository.findEventWithLock(eventId);

      if (!event) {
        throw new NotFoundError(`Event with ID ${eventId} not found`);
      }

      if (!event.hasAvailableSeats(seats)) {
        throw new ConflictError('Not enough available seats');
      }

      event.reserveSeats(seats);
      const updatedEvent = await this.eventsRepository.save(event);

      await this.redisService.del(this.getEventCacheKey(eventId));
      await this.redisService.delPattern('events:*');

      return updatedEvent;
    } catch (error) {
      throw new BadRequestException('Error reserving seat', error.message);
    }
  }

  async releaseSeats(eventId: string, seats: number = 1): Promise<Event> {
    try {
      const event = await this.findOne(eventId);
      event.releaseSeats(seats);

      const updatedEvent = await this.eventsRepository.save(event);

      await this.redisService.del(this.getEventCacheKey(eventId));
      await this.redisService.delPattern('events:*');

      return updatedEvent;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
