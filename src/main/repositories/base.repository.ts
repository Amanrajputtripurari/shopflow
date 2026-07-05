import type { Collection, Db, Document, Filter, OptionalUnlessRequiredId, Sort, UpdateFilter } from 'mongodb'

import { getDb } from '../database/connection'

export abstract class BaseRepository<T extends Document> {
  protected constructor(protected readonly collectionName: string) {}

  protected get collection(): Collection<T> {
    return this.getDatabase().collection<T>(this.collectionName)
  }

  protected getDatabase(): Db {
    return getDb()
  }

  async findOne(filter: Filter<T>): Promise<T | null> {
    return this.collection.findOne(filter) as Promise<T | null>
  }

  async findMany(filter: Filter<T> = {}, sort: Sort = { _id: -1 }, limit = 200): Promise<T[]> {
    return this.collection.find(filter).sort(sort).limit(limit).toArray() as Promise<T[]>
  }

  async findManyPaginated(
    filter: Filter<T> = {},
    sort: Sort = { _id: -1 },
    options: { limit: number; offset: number }
  ): Promise<{ items: T[]; total: number }> {
    const { limit, offset } = options
    const [items, total] = await Promise.all([
      this.collection.find(filter).sort(sort).skip(offset).limit(limit).toArray() as Promise<T[]>,
      this.collection.countDocuments(filter)
    ])
    return { items, total }
  }

  async count(filter: Filter<T> = {}): Promise<number> {
    return this.collection.countDocuments(filter)
  }

  async insertOne(document: OptionalUnlessRequiredId<T>): Promise<void> {
    await this.collection.insertOne(document)
  }

  async insertOneAndReturn(document: OptionalUnlessRequiredId<T>): Promise<T> {
    const result = await this.collection.insertOne(document)
    const created = await this.findOne({ _id: result.insertedId } as Filter<T>)
    if (!created) {
      throw new Error('Failed to read inserted document.')
    }
    return created
  }

  async updateOne(filter: Filter<T>, update: UpdateFilter<T>): Promise<void> {
    await this.collection.updateOne(filter, update, { upsert: true })
  }

  async replaceOne(filter: Filter<T>, document: T): Promise<void> {
    await this.collection.replaceOne(filter, document, { upsert: true })
  }

  async deleteOne(filter: Filter<T>): Promise<boolean> {
    const result = await this.collection.deleteOne(filter)
    return result.deletedCount === 1
  }
}
