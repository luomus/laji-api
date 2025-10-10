const { AppModule } = require("../dist/app.module");
const { Test } = require("@nestjs/testing");
const { request } = require("chai");
const { VersioningType } = require("@nestjs/common");

exports.mochaHooks = {
	beforeAll: async function() {
		const module = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();

		app = module.createNestApplication();
		app.enableVersioning({
			type: VersioningType.HEADER,
			header: "API-Version",
		});
		await app.init();
		this.server = app.getHttpServer();
	},
	afterAll: function () {
		return this.server.close();
	}
}
