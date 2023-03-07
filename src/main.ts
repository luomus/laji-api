import { NestFactory } from "@nestjs/core";
import { NestExpressApplication }  from "@nestjs/platform-express";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import * as  proxy from "http-proxy-middleware";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
	console.log("Old API must be running at localhost:3003\n");

	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	const configService = app.get(ConfigService);

	configService.get("EXPLORER_PROXY_TO_OLD_API") === "true" && app.use("/explorer", proxy.createProxyMiddleware({
		target: "http://localhost:3003",
	}));

	// Backward compatible redirect from old api with version (v0) path prefix.
	app.use("/v0", proxy.createProxyMiddleware({
		target: "http://localhost:3004",
		pathRewrite: {
			"^/v0": "/"
		}
	}));

	app.useStaticAssets("static");

	app.useGlobalPipes(new ValidationPipe({transform: true}));

	const document = SwaggerModule.createDocument(app, new DocumentBuilder()
		.setTitle("API documentation")
		.setDescription(description)
		.setVersion("0")
		.addApiKey({type: "apiKey", name: "access_token", in: "query"}, "access_token")
		.build(),
	{
		operationIdFactory: (
			controllerKey: string,
			methodKey: string
		) => methodKey
	}
	);
	SwaggerModule.setup("explorer", app, document, {
		customSiteTitle: "Laji API" + (configService.get("STAGING") ? " (STAGING)" : ""),
		customCssUrl: "/swagger.css",
		swaggerOptions: {
			persistAuthorization: true
		}
	});

	await app.listen(3004);
}
bootstrap();

const description =
`
Access token is needed to use this API. To get a token, send a POST request with your email address to
/api-users endpoint and one will be send to your. Each endpoint bellow has more information on how to use this API.
If you have any questions you can contact us at helpdesk@laji.fi.

You can find more documentation [here](https://laji.fi/about/806).

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
