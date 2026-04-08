import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient } from "redis";

@Injectable()
export class RedisCacheService implements OnModuleInit, OnApplicationShutdown {

	private client: ReturnType<typeof createClient>;
	private logger = new Logger(RedisCacheService.name);

	constructor(private config: ConfigService) {}

	async onModuleInit() {
		this.client = await createClient({
			url: this.config.get("REDIS_URL"), // Defaults to localhost on port 6379.
		})
		  .on("error", err => {
				this.logger.error("Connecting to redis failed!");
				throw new Error("Connecting to redis failed with message: " + err);
			})
		  .connect();
	}

	async onApplicationShutdown() {
		await this.client.disconnect();
	}

	async get<T>(key: string) {
		// 'as string' because JSON.parse(null) is actually valid even though TS says otherwise.
		return JSON.parse(await this.client.get(key) as string) as Promise<T | null>;
	}

	set(key: string, value: unknown, ttlMs?: number) {
		return this.client.set(key, JSON.stringify(value), ttlMs !== undefined ? { PX: ttlMs } : undefined);
	}

	del(key: string) {
		return this.client.unlink(key);
	}

	async patternDel(pattern: string) {
		for await (const key of this.client.scanIterator({ MATCH: pattern })) {
			await this.client.unlink(key);
		}
	}

	async rPush(key: string, value: unknown) {
		return this.client.rPush(key, JSON.stringify(value));
	}

	lLen(key: string) {
		return this.client.lLen(key);
	}

	async lRange(key: string, start: number, stop: number) {
		return (await this.client.lRange(key, start, stop)).map(item => JSON.parse(item));
	}

	async lSet(key: string, index: number, element: unknown) {
		return this.client.lSet(key, index, JSON.stringify(element));
	}
}
