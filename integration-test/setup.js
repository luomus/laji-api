const { AppModule } = require("../dist/app.module");
const { Test } = require("@nestjs/testing");
const { request } = require("chai");

exports.mochaHooks = {
	beforeAll: async function() {
		const module = await Test.createTestingModule({
			imports: [AppModule],
		}).compile();
		app = module.createNestApplication();
		await app.init();
		this.server = app.getHttpServer();
	},
	afterAll: function () {
		return this.server.close();
	}
}
