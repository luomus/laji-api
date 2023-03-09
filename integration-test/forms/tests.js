var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

describe("/forms", function() {
	var basePath = config["urls"]["form"];
	let app;

	before(async () => {
		app = await helpers.init();
	});

	after(async () => {
		await helpers.close();
	});

	it("returns 401 when no access token specified", function(done) {
		request(app)
			.get(basePath)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns list of forms when access token is correct", function(done) {
		var query = basePath + "?access_token=" + config["access_token"];
		request(app)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				done();
			});
	});

	let testFormJSON;

	it("prevents non ict admin from updating form", function(done) {
		const id = config.id.disabled_form;
		var query = basePath + "/" + id
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + config["user"]["token"];
		request(app)
			.get(query)
			.end(function (err, res) {
				if (res.status !== 200) {
					this.skip();
				}
				testFormJSON = res;
				request(app)
					.put(query)
					.send(res)
					.end(function(err, res) {
						res.should.have.status(403);
						done();
					});
			});
	});

	it("prevents non ict admin from using transform endpoint", function(done) {
		if (!testFormJSON) {
			this.skip();
		}
		var query = basePath + "/transform"
			+ "?access_token=" + config["access_token"]
			+ "&personToken=" + config["user"]["token"];
		request(app)
			.post(query)
			.send(testFormJSON)
			.end(function(err, res) {
				res.should.have.status(403);
				done();
			});
	});
});
