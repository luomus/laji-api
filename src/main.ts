import { NestFactory } from "@nestjs/core";
import { NestExpressApplication }  from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
import { ConfigService } from "@nestjs/config";
import { SwaggerService } from "./swagger/swagger.service";
import { LogLevel, Logger } from "@nestjs/common";
import { LoggerService } from "./logger/logger.service";

export async function bootstrap() {
	new Logger().warn("Old API must be running at localhost:3003\n");

	const logLevels = (process.env.LOG_LEVELS || "fatal,error,warn,verbose,debug").split(",");
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		cors: true,
		logger: logLevels as LogLevel[]
	});
	app.useLogger(app.get(LoggerService));
	app.enableShutdownHooks();

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
			proxyReq: fixRequestBody
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

	app.useStaticAssets("static");

	const document = SwaggerModule.createDocument(app, new DocumentBuilder()
		.setTitle("API documentation")
		.setDescription(description)
		.setVersion("0")
		.addApiKey({ type: "apiKey", name: "access_token", in: "query" }, "access_token")
		.build()
	);

	SwaggerModule.setup("explorer", app, document, {
		customSiteTitle: "Laji API" + (configService.get("STAGING") ? " (STAGING)" : ""),
		customCssUrl: "/swagger.css",
		swaggerOptions: {
			persistAuthorization: true,
			docExpansion: "none",
		},
		// Error management isn't perfect here. We'd like to send a 500 if swagger patching fails but the library doesn't
		// let us take care of the response. Without the try/catch the server would crash upon SwaggerService.patch()
		// failing. The patching can fail if the document is requested before the service has patched the document so it can
		// return the document synchronously, or if some of the remote swagger documents can't be fetched.
		patchDocumentOnRequest: (req, res, swaggerDoc) => {
			try {
				return app.get(SwaggerService).patch(swaggerDoc);
			} catch (e) {
				return undefined as unknown as any;
			}
		}
	});

	await app.listen(port, "0.0.0.0");
	return app;
}
void bootstrap();

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
