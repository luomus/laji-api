import { NestFactory } from "@nestjs/core";
import { NestExpressApplication }  from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { createProxyMiddleware } from "http-proxy-middleware";
import { ConfigService } from "@nestjs/config";
import { SwaggerService } from "./swagger/swagger.service";
import { LogLevel, Logger, VersioningType } from "@nestjs/common";
import { LoggerService } from "./logger/logger.service";
import { HttpService } from "@nestjs/axios";
import { AxiosRequestConfig } from "axios";
import { joinOnlyStrings } from "./utils";
import { fixRequestBodyAndAuthHeader } from "./proxy-to-old-api/fix-request-body-and-auth-header";

export async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		cors: true,
	});
	const logLevels = (process.env.LOG_LEVELS || "fatal,error,warn,log,verbose,debug").split(",");
	const logger = app.get(LoggerService);
	app.useLogger(logger);
	app.useLogger(logLevels as LogLevel[]);
	logOutgoingRequests(app.get(HttpService));
	app.enableShutdownHooks();
	new Logger().warn("Old API must be running at localhost:3003\n");
	app.enableVersioning({
		type: VersioningType.HEADER,
		header: "API-Version",
	});

	app.useBodyParser("json", { limit: "10mb" });

	const configService = app.get(ConfigService);

	const port = configService.get("PORT") || 3004;

	configService.get("EXPLORER_PROXY_TO_OLD_API") === "true" && app.use("/explorer", createProxyMiddleware({
		target: "http://127.0.0.1:3003/explorer"
	}));

	// Backward compatible redirect from old api with version (v0) path prefix.
	app.use("/v0", createProxyMiddleware({
		target: `http://127.0.0.1:${port}`,
		pathRewrite: {
			"^/v0": "/"
		},
		on: {
			proxyReq: fixRequestBodyAndAuthHeader
		},
	}));

	// Backward compatibity to old API signature of form permissions.
	app.use("/formPermissions", createProxyMiddleware({
		target: `http://127.0.0.1:${port}/forms/permissions`
	}));

	// Backward compatibity to old API signature of checklist versions.
	app.use("/checklistVersions", createProxyMiddleware({
		target: `http://127.0.0.1:${port}/checklist-versions`
	}));

	// Backward compatibity to old API signature of organizations.
	app.use("/organization/by-id", createProxyMiddleware({
		target: `http://127.0.0.1:${port}/organizations/`
	}));
	// Backward compatibity to old API signature of organizations.
	app.use("/organization", createProxyMiddleware({
		target: `http://127.0.0.1:${port}/organizations`
	}));

	app.useStaticAssets("static");

	const document = SwaggerModule.createDocument(app, new DocumentBuilder()
		.setTitle("Laji API")
		.setDescription(description)
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
		.build()
	);

	SwaggerModule.setup("explorer", app, document, {
		customSiteTitle: "Laji API" + (configService.get("STAGING") ? " (STAGING)" : ""),
		customCssUrl: "/swagger.css",
		swaggerOptions: {
			persistAuthorization: true,
			docExpansion: "none",
			tagsSorter: "alpha",
			operationsSorter: "alpha",
			requestInterceptor: (req: any) => {
				req.headers["API-Version"] = "1"; // Add your custom header here
				return req;
			},
		},
		// Error management isn't perfect here. We'd like to send a 500 if swagger patching fails but the library doesn't
		// let us take care of the response. Without the try/catch the server would crash upon SwaggerService.patch()
		// failing. The patching can fail if the document is requested before the service has patched the document so it can
		// return the document synchronously, or if some of the remote swagger documents can't be fetched.
		patchDocumentOnRequest: (req, res, swaggerDoc) => {
			try {
				return app.get(SwaggerService).patch(swaggerDoc);
			} catch (e) {
				new Logger().error(e, e.stack);
				return undefined as any;
			}
		}
	});

	// Serve swagger from explorer-3 so it's accessible even with the redirection to old API.
	configService.get("EXPLORER_PROXY_TO_OLD_API") === "true" && SwaggerModule.setup("explorer-v1", app, document, {
		customSiteTitle: "Laji API" + (configService.get("STAGING") ? " (STAGING)" : ""),
		customCssUrl: "/swagger.css",
		swaggerOptions: {
			persistAuthorization: true,
			docExpansion: "none",
			tagsSorter: "alpha",
			operationsSorter: "alpha",
			requestInterceptor: (req: any) => {
				req.headers["API-Version"] = "1"; // Add your custom header here
				return req;
			},
		},
		// Error management isn't perfect here. We'd like to send a 500 if swagger patching fails but the library doesn't
		// let us take care of the response. Without the try/catch the server would crash upon SwaggerService.patch()
		// failing. The patching can fail if the document is requested before the service has patched the document so it can
		// return the document synchronously, or if some of the remote swagger documents can't be fetched.
		patchDocumentOnRequest: (req, res, swaggerDoc) => {
			try {
				return app.get(SwaggerService).patch(swaggerDoc);
			} catch (e) {
				new Logger().error(e, e.stack);
				return undefined as any;
			}
		}
	});

	await app.listen(port, "0.0.0.0");
	return app;
}
void bootstrap();


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
		logger[method](joinOnlyStrings("END",
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

const description =
`
Access token is needed to use this API. To get a token, send a POST request with your email address to
/api-users endpoint and one will be send to your. Include the token to each request either as access_token
parameter or Authentication header value

You can find more documentation [here](https://laji.fi/about/806).

If you have any questions you can contact us at helpdesk@laji.fi.

## Endpoints

Observations and collections
* Warehouse - Observation Data Warehouse API
* Collection - Collection metadata
* Source - Information sources (IT systems)
* Annotation - Quality control


Taxonomy
* Taxa - Taxonomy API
* InformalTaxonGroup - Informal taxon groups are used in taxa and warehouse endpoints
* Publication - Scientific publications
* Checklist - Mainly you only work with one checklits: the FinBIF master checklist. There are others.


Other master data
* Metadata - Variable descriptions
* Area - Countries, municipalities and biogeographical provinces of Finland, etc.
* Person - Information about people.


Helpers
* APIUser - Register as an API user
* Autocomplete - For making an autocomplete filed for taxa, collections or persons (friends)
* Login - Login for standalone applications (contact helpdesk if you want to use this)
* PersonToken - Information about an authorized person


Vihko observation system
* Audio - Audio of a document
* Form - Form definition
* Document - Document instance of a form
* Image - Image of a document


Laji.fi portal
* Feedback - Feedback form API
* Information - CMS content of information pages
* Logger - Error logging from user's browsers to FinBIF
* News - News
`;
