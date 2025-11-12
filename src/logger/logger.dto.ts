export enum LogLevel {
	error = "error",
	info = "info",
	warn = "warn"
}

export class GetLoggerStatusDto {
	minutesBack: number;
}
