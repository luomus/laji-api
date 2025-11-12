import { HttpException, Injectable } from "@nestjs/common";
import { ApiUserEntity } from "src/api-users/api-user.entity";
import { JSONSerializable } from "src/typing.utils";
import { dateToISODate } from "src/utils";
import * as fs from "fs";
import * as path from "path";
import pino, { Logger } from "pino";
import { LogLevel } from "./logger.dto";
import * as readline from "readline";

@Injectable()
export class LoggerService {
	private readonly logDir = path.resolve(process.cwd(), "logs");

	constructor() {
		if (!fs.existsSync(this.logDir)) {
			fs.mkdirSync(this.logDir, { recursive: true });
		}
	}

	log(level: LogLevel, data: JSONSerializable, apiUser: ApiUserEntity) {
		const { systemID } = apiUser;
		if (!systemID) {
			throw new HttpException("No systemID found for the access token", 422);
		}

		const fileName = `${systemID}_${dateToISODate(new Date())}.log`;
		const filePath = path.join(this.logDir, fileName);

		const destination = pino.destination({ dest: filePath, append: true, sync: false });
		const logger: Logger = pino(
			{
				level,
				timestamp: pino.stdTimeFunctions.isoTime,
				formatters: {
					level(label) {
						return { level: label };
					},
				},
			},
			destination
		);

		logger[level](data);

		destination.flush();
		destination.end();
	}

	async getStatus( apiUser: ApiUserEntity, minutesBack = 5) {
		const { systemID } = apiUser;
		if (!systemID) {
			throw new HttpException("No systemID found for the access token", 422);
		}

		const fileName = `${systemID}_${dateToISODate(new Date())}.log`;
		const filePath = path.join(this.logDir, fileName);

		if (!fs.existsSync(filePath)) {
			return { status: "ok" };
		}

		const since = Date.now() - minutesBack * 60 * 1000;
		let found = false;

		const fileStream = fs.createReadStream(filePath, { encoding: "utf8" });
		const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

		for await (const line of rl) {
			try {
				const entry = JSON.parse(line);
				const entryTime = new Date(entry.time || entry.timestamp).getTime();
				if (entryTime >= since) {
					found = true;
					break;
				}
			} catch {
				// skip malformed lines
			}
		}

		rl.close();
		await new Promise((resolve) => fileStream.close(resolve));

		return { status: found ? "has logged data" : "ok" };
	}
}
