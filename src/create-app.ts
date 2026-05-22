import { NestFactory } from "@nestjs/core";
import { NestExpressApplication }  from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { createProxyMiddleware } from "http-proxy-middleware";
import { ConfigService } from "@nestjs/config";
import { SwaggerService } from "./swagger/swagger.service";
import { LogLevel, Logger, NestApplicationOptions, VersioningType } from "@nestjs/common";
import { ConsoleLoggerService } from "./console-logger/console-logger.service";
import { HttpService } from "@nestjs/axios";
import { AxiosRequestConfig } from "axios";
import { MS_30_MIN, joinOnlyStrings } from "./utils";
import { RedisCacheService } from "./redis-cache/redis-cache.service";
import { Request, Response, NextFunction } from "express";
import { swaggerDescription } from "./swagger-description";
import { fixRequestBody } from "http-proxy-middleware";
import { createGatewayRuntime } from "@graphql-hive/gateway";
import { fixRequestBodyAndAuthHeader } from "./proxy-to-old-api/fix-request-body-and-auth-header";

export async function createApp(useLogger = true) {
	const appOptions: NestApplicationOptions = {
		cors: true,
	};
	if (!useLogger) {
		appOptions.logger = false;
	}
	const app = await NestFactory.create<NestExpressApplication>(AppModule, appOptions);

	const logLevels = (process.env.LOG_LEVELS || "fatal,error,warn,log,verbose,debug").split(",");
	const logger = app.get(ConsoleLoggerService);
	if (!useLogger) {
		app.useLogger(false);
	} else {
		app.useLogger(logger);
		app.useLogger(logLevels as LogLevel[]);
		logOutgoingRequests(app.get(HttpService));
	}

	app.enableShutdownHooks();

	new Logger().warn("Old API must be running at localhost:3003\n");

	app.enableVersioning({
		type: VersioningType.HEADER,
		header: "API-Version",
	});

	app.useBodyParser("json", { limit: "10mb" });

	const configService = app.get(ConfigService);

	const port = configService.get("PORT") || 3005;

	app.use("/v0", (req: Request, res: Response, next: NextFunction) => {
		if (req.headers["api-version"] === "1") {
			return res.status(422).send(
				"Shouldn't use '/v0' in path when using API-Version: 1. " +
				`Use ${configService.get("MAIL_API_BASE")}${req.originalUrl} instead.`
			);
		}
		next();
	});

	// // ProxyToOldApiService handles redirection to old API. We just check that people don't try to access the new API with API-Version: 1.
	app.use("/v0", createProxyMiddleware({
		target: `http://127.0.0.1:${port}`,
		pathRewrite: {
			"^/v0": "",
		},
		on: {
			proxyReq: fixRequestBody
		},
	}));

	// Redirect from the old Swagger explorer to the new.
	app.use("/explorer", createProxyMiddleware({
		target: `http://127.0.0.1:${port}`
	}));

	// Backward compatibity to old API signature of form permissions.
	app.use("/formPermissions", createProxyMiddleware({
		target: `http://127.0.0.1:${port}/form-permissions`,
		pathRewrite: function (path: string, req: Request) {
			if (req.headers["api-version"] === "1") {
				// eslint-disable-next-line max-len
				throw "/formPermissions is deprecated for API V1. Use /form-permissions instead";
			}
			return path;
		}
	}));

	// Backward compatibity to old API signature of checklist versions.
	app.use("/checklistVersions", createProxyMiddleware({
		target: `http://127.0.0.1:${port}/checklist-versions`,
		pathRewrite: function (path: string, req: Request) {
			if (req.headers["api-version"] === "1") {
				// eslint-disable-next-line max-len
				throw "/checklistVersions is deprecated for API V1. Use /checklist-versions instead";
			}
			return path;
		}

	}));

	// Backward compatibity to old API signature of checklist versions.
	app.use("/api-users", createProxyMiddleware({
		target: `http://127.0.0.1:${port}/api-user`,
		pathRewrite: function (path: string, req: Request) {
			if (req.headers["api-version"] === "1") {
				// eslint-disable-next-line max-len
				throw "/api-users is deprecated for API V1. Use /api-user instead";
			}
			return path;
		}
	}));

	// Backward compatibity to old API signature of person-token.
	app.use("/person-token", createProxyMiddleware({
		target: `http://127.0.0.1:${port}/authentication-event`,
		pathRewrite: function (path: string, req: Request) {
			if (req.headers["api-version"] === "1") {
				// eslint-disable-next-line max-len
				throw "/person-token is deprecated for API V1. Use /authentication-event instead";
			}
			return path;
		}
	}));

	const OLD_GRAPHQL_PORT = configService.get("OLD_GRAPHQL_PORT");

	const oldGraphqlProxy = createProxyMiddleware({
		target: `http://127.0.0.1:${OLD_GRAPHQL_PORT}/v0/graphql`,
		changeOrigin: true,
		on: {
			proxyReq: fixRequestBodyAndAuthHeader
		},
	});

	// Backward compatibity with old API graphql.
	app.use("/graphql", (req: any, res: any, next: any) => {
		if (req.body?.operationName === "IntrospectionQuery") {
			return next();
		}
		if (req.headers["api-version"] !== "1" && req.method === "POST") {
			return oldGraphqlProxy(req, res, next);
		}
		next();
	});

	app.useStaticAssets("static");

	app.use("/graphql", createGatewayRuntime({
		supergraph: "./schema.graphql",
		propagateHeaders: {
			fromClientToSubgraphs({ request }) {
				return {
					authorization: request.headers.get("authorization"),
					"person-token": request.headers.get("person-token"),
					"api-version": request.headers.get("api-version"),
					"accept-language": request.headers.get("accept-language")
				};
			},
		},
		inboundInflightRequestDeduplication: true
	}));

	const document = SwaggerModule.createDocument(app, new DocumentBuilder()
		.setTitle("Laji API")
		.addServer(configService.get("SELF_HOST") as string)
		.setDescription(swaggerDescription)
		.setVersion("1")
		.addBearerAuth({ type: "http", description: "Access token" }, "Access token")
		.addApiKey({
			type: "apiKey",
			name: "Accept-Language",
			in: "header",
			// eslint-disable-next-line max-len
			description: "Sets the 'Accept-Language' header. One of 'fi', 'sv,' 'en'. Defaults to 'en'."
		}, "Lang")
		.addApiKey({ type: "apiKey", name: "Person-Token", in: "header" }, "Person token")
		.addGlobalResponse(
			createErrorResponseSwaggerForStatus(400),
			createErrorResponseSwaggerForStatus(401),
			createErrorResponseSwaggerForStatus(403),
			createErrorResponseSwaggerForStatus(404),
			createErrorResponseSwaggerForStatus(406),
			createErrorResponseSwaggerForStatus(422),
			createErrorResponseSwaggerForStatus(500)
		)
		.build()
	);

	// These need to be initialized before SwaggerService can patch the document.
	await app.get(RedisCacheService).onModuleInit();
	await app.get(SwaggerService).warmup();

	let patchedDocument: OpenAPIObject;
	try {
		patchedDocument = await app.get(SwaggerService).patchMutably(document);
	} catch (e) {
		logger.error("Patching swagger failed!", e.stack);

	}
	setInterval(async () => {
		try {
			patchedDocument = await app.get(SwaggerService).patchMutably(document);
		} catch (e) {
			logger.error("Patching swagger failed!");
		}
	}, MS_30_MIN);

	// Redirect from / to /openapi is done by AppController.
	SwaggerModule.setup("openapi", app, () => patchedDocument, {
		customSiteTitle: "Laji API" + (configService.get("STAGING") === "true" ? " (STAGING)" : ""),
		customCssUrl: "/swagger.css",
		swaggerOptions: {
			persistAuthorization: true,
			docExpansion: "none",
			tagsSorter: "alpha",
			operationsSorter: "alpha",
			tryItOutEnabled: true,
			requestInterceptor: (req: any) => {
				req.headers["API-Version"] = "1";
				return req;
			}
		},
		patchDocumentOnRequest: () => patchedDocument
	});

	return app;
}

type LajiApiAxiosRequestConfig = AxiosRequestConfig & {
	meta: {
		logger: Logger;
		lajiApiTimeStamp?: number;
	};
}

const getLoggerFromAxiosConfig = (config: AxiosRequestConfig) => {
	const { logger = new Logger() } =
		((config as LajiApiAxiosRequestConfig).meta as { logger: Logger } | undefined)
		|| {};
	return logger;
};

function logOutgoingRequests(httpService: HttpService) {
	httpService.axiosRef.interceptors.request.use(config => {
		const logger = getLoggerFromAxiosConfig(config);
		if (!(config as any).meta) {
			(config as any).meta = {};
		}
		const customizedConfig = config as LajiApiAxiosRequestConfig;
		customizedConfig.meta.lajiApiTimeStamp = Date.now();
		const query = new URLSearchParams(config?.params).toString();
		logger.verbose(joinOnlyStrings("START", config.method?.toUpperCase(), config.url + (query ? `?${query}` : "")));
		return config;
	});

	const responseLogger = (config: any, method: "verbose" | "error", status?: number) => {
		if (!config) {
			return;
		}
		const logger = getLoggerFromAxiosConfig(config);
		const { lajiApiTimeStamp } = (config as any).meta || {};
		const query = new URLSearchParams(config?.params).toString();
		logger[method](joinOnlyStrings(
			"END",
			config.method?.toUpperCase(),
			config.url + (query ? `?${query}` : ""),
			status && `[STATUS ${status}]`,
			lajiApiTimeStamp && `[${Date.now() - lajiApiTimeStamp}ms]`
		));
	};

	httpService.axiosRef.interceptors.response.use(response => {
		responseLogger(response.config, "verbose", response.status);
		return response;
	}, error => {
		responseLogger(error.config, "error", error?.response?.status);
		return Promise.reject(error);
	});
}

const createErrorResponseSwaggerForStatus = (status: number) => ({
	status,
	schema: {
		type: "object",
		properties: {
			errorCode: { type: "string" },
			message: { type: "string" },
			localized: { type: "boolean" }
		}
	}
}
);
