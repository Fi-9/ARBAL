import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const SOFT_DELETE_MODELS = ['Student', 'Document', 'User', 'Guardian'];

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private extendedClient: any;

  constructor() {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,                          // Maximum connections in pool
      connectionTimeoutMillis: 30000,   // Timeout waiting for available connection
      idleTimeoutMillis: 30000,         // Close idle connections after 30s
      statement_timeout: 30000,         // Kill queries running longer than 30s
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });

    this.extendedClient = this.$extends({
      query: {
        $allModels: {
          async findMany({ model, operation, args, query }) {
            if (SOFT_DELETE_MODELS.includes(model)) {
              if (!args) args = {} as any;
              // Respect explicit __includeDeleted flag for trash bin queries
              const includeDeleted = (args as any).__includeDeleted === true;
              if (!includeDeleted) {
                (args as any).where = { ...(args as any).where, deletedAt: null };
              }
              delete (args as any).__includeDeleted;
            }
            return query(args);
          },
          async findFirst({ model, operation, args, query }) {
            if (SOFT_DELETE_MODELS.includes(model)) {
              if (!args) args = {} as any;
              const includeDeleted = (args as any).__includeDeleted === true;
              if (!includeDeleted) {
                (args as any).where = { ...(args as any).where, deletedAt: null };
              }
              delete (args as any).__includeDeleted;
            }
            return query(args);
          },
          async findUnique({ model, operation, args, query }) {
            if (SOFT_DELETE_MODELS.includes(model)) {
              // Respect __includeDeleted flag for restore/permanent delete lookups
              const includeDeleted = (args as any)?.__includeDeleted === true;
              if (includeDeleted) {
                delete (args as any).__includeDeleted;
                return query(args);
              }
              // findUnique where clause only allows unique fields,
              // so we post-filter to exclude soft-deleted records
              const result = await query(args);
              if (result && (result as any).deletedAt != null) {
                return null;
              }
              return result;
            }
            return query(args);
          },
          async findUniqueOrThrow({ model, operation, args, query }) {
            if (SOFT_DELETE_MODELS.includes(model)) {
              const includeDeleted = (args as any)?.__includeDeleted === true;
              if (includeDeleted) {
                delete (args as any).__includeDeleted;
                return query(args);
              }
              const result = await query(args);
              if (result && (result as any).deletedAt != null) {
                throw new Error(`No ${model} found`);
              }
              return result;
            }
            return query(args);
          },
          async count({ model, operation, args, query }) {
            if (SOFT_DELETE_MODELS.includes(model)) {
              if (!args) args = {};
              args.where = { ...args.where, deletedAt: null };
            }
            return query(args);
          },
          async aggregate({ model, operation, args, query }) {
            if (SOFT_DELETE_MODELS.includes(model)) {
              if (!args) args = {} as any;
              (args as any).where = { ...(args as any).where, deletedAt: null };
            }
            return query(args);
          },
          async groupBy({ model, operation, args, query }) {
            if (SOFT_DELETE_MODELS.includes(model)) {
              if (!args) args = {} as any;
              const includeDeleted = (args as any).__includeDeleted === true;
              if (includeDeleted) {
                delete (args as any).__includeDeleted;
              } else {
                (args as any).where = { ...(args as any).where, deletedAt: null };
              }
            }
            return query(args);
          },
          async updateMany({ model, operation, args, query }) {
            if (SOFT_DELETE_MODELS.includes(model)) {
              // Prevent updating soft-deleted records (unless opt-out)
              const includeDeleted = (args as any).__includeDeleted === true;
              if (includeDeleted) {
                delete (args as any).__includeDeleted;
              } else {
                (args as any).where = { ...(args as any).where, deletedAt: null };
              }
            }
            return query(args);
          },
          async deleteMany({ model, operation, args, query }) {
            if (SOFT_DELETE_MODELS.includes(model)) {
              // Only target non-deleted records
              (args as any).where = { ...(args as any).where, deletedAt: null };
            }
            return query(args);
          },
        },
      },
    });

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop === 'onModuleInit' || prop === 'onModuleDestroy') {
          return target[prop].bind(target);
        }
        if (typeof prop === 'symbol' || prop === 'constructor' || prop === 'then') {
          const val = Reflect.get(target, prop, receiver);
          if (typeof val === 'function') {
            return val.bind(target);
          }
          return val;
        }
        if (prop in target.extendedClient) {
          const val = Reflect.get(target.extendedClient, prop);
          if (typeof val === 'function') {
            return val.bind(target.extendedClient);
          }
          return val;
        }
        const val = Reflect.get(target, prop, receiver);
        if (typeof val === 'function') {
          return val.bind(target);
        }
        return val;
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
