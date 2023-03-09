var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

describe("/coordinates", function() {
	var basePath = config.urls.coordinate;
	let app;

	before(async () => {
		app = await helpers.init();
	});

	after(async () => {
		await helpers.close();
	});

	it("returns 404 when no access token specified", function(done) {
		request(app)
			.get(basePath)
			.end(function(err, res) {
				res.should.have.status(404);
				done();
			});
	});
});
