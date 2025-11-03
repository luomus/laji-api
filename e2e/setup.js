const { createApp } = require("../dist/create-app");

exports.mochaHooks = {
	beforeAll: async function() {
		const app = await createApp();
		console.log('creating');
		await app.init();
		this.server = app.getHttpServer();
		console.log('created');
	},
	afterAll: function () {
		return this.server.close();
	}
}
