// Copyright (c) 2019-2021, BitRadius Holdings, LLC
//
// Please see the included LICENSE file for more information.

import * as NodeCache from 'node-cache';
import { EventEmitter } from 'events';

export default class extends EventEmitter {
    private readonly m_cache: NodeCache;

    /**
     * Constructs a new Memory based cache instance
     * @param m_ttl
     * @param m_checkPeriod
     */
    constructor (private m_ttl = 300, private m_checkPeriod = 30) {
        super();

        this.m_cache = new NodeCache({
            stdTTL: m_ttl,
            checkperiod: m_checkPeriod
        });

        this.m_cache.on('set', (key, value) => this.emit('set', this.unstringify(key), this.unstringify(value)));
        this.m_cache.on('expired', (key, value) =>
            this.emit('expired', this.unstringify(key), this.unstringify(value)));
        this.m_cache.on('del', (key, value) => this.emit('del', this.unstringify(key), this.unstringify(value)));
        this.m_cache.on('flush', () => this.emit('flush'));
        this.m_cache.on('error', error => this.emit('error', error));
    }

    public on(event: 'set', listener: (key: any, value: any) => void): this;

    public on(event: 'expired', listener: (key: any, value: any) => void): this;

    public on(event: 'del', listener: (key: any, value: any) => void): this;

    public on(event: 'flush', listener: () => void): this;

    public on(event: 'error', listener: (error: Error) => void): this;

    public on (event: any, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }

    /**
     * Deletes the value at the specified key from the cache
     * @param key
     */
    public async del (key: any): Promise<void> {
        this.m_cache.del(this.stringify(key));
    }

    /**
     * Checks if the given key exists in the cache
     * @param key
     */
    public async exists (key: any): Promise<boolean> {
        try {
            await this.get(key);

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Flushes all records from the cache
     */
    public async flush (): Promise<void> {
        this.m_cache.flushAll();
    }

    /**
     * Retrieves the value at the key specified from the cache
     * @param key
     */
    public async get<T> (key: any): Promise<T> {
        const set_key = this.stringify(key);

        const value = this.m_cache.get(set_key);

        if (!value) {
            throw new Error('Key not found');
        }

        return this.unstringify(value as string);
    }

    /**
     * Returns a list of all keys in the cache
     */
    public async keys (): Promise<any[]> {
        return this.m_cache.keys().map(key => this.unstringify(key));
    }

    /**
     * Returns a map of all keys and values in the cache
     */
    public async list<T> (): Promise<Map<any, T>> {
        const keys = await this.keys();

        return this.mget(keys);
    }

    /**
     * Mass deletes values with the specified keys from the cache
     * @param keys
     */
    public async mdel (keys: any[]): Promise<void> {
        const fetch_keys = keys.map(key => this.stringify(key));

        this.m_cache.del(fetch_keys);
    }

    /**
     * Mass retrieves values (as a map) with the specified keys from the cache
     * @param keys
     */
    public async mget<T> (keys: any[]): Promise<Map<any, T>> {
        const fetch_keys = keys.map(key => this.stringify(key));

        const data = this.m_cache.mget(fetch_keys);

        const values: Map<any, T> = new Map<any, T>();

        for (const key of Object.keys(data)) {
            if (data[key]) {
                values.set(this.unstringify(key), this.unstringify(data[key] as string) as T);
            }
        }

        return values;
    }

    /**
     * Sets the value for the specified key in the cache
     * @param key
     * @param value
     * @param ttl
     */
    public async set<T> (key: any, value: T, ttl = this.m_ttl): Promise<void> {
        const set_key = this.stringify(key);

        this.m_cache.set(set_key, this.stringify(value));

        this.m_cache.ttl(set_key, ttl);
    }

    private stringify (str: any): string {
        return JSON.stringify(str);
    }

    /**
     * Returns the current TTL for the record at the specified key in the cache
     * @param key
     */
    public async ttl (key: any): Promise<number> {
        const ttl = this.m_cache.getTtl(this.stringify(key));

        if (!ttl) {
            throw new Error('Key not found');
        }

        return ttl;
    }

    private unstringify<T> (str: any): T {
        return JSON.parse(str);
    }
}
