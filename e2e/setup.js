const { createApp } = require("../dist/create-app");

exports.mochaHooks = {
	beforeAll: async function() {
		const app = await createApp(false);
		await app.init();
		this.server = app.getHttpServer();
	},
	afterAll: function () {
		return this.server.close();
	}
}
