var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

describe("/annotation", function() {
	const basePath = config["urls"]["annotation"];
	let anId;

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

	it("returns 401 when trying to add without permissions", function(done) {
		const query = basePath +
			"?access_token=" + config["access_token"];
		const annotation = {};
		request(app)
			.post(query)
			.send(annotation)
			.end(function (err, res) {
				res.should.have.status(403);
				done();
			});
	});

	it("adds annotation", function (done) {
		this.timeout(6000);
		const query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = JSON.parse(JSON.stringify(config.objects["annotation"]));
		request(app)
			.post(query)
			.send(document)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.any.keys("id");
				res.body.should.have.any.keys("@type");
				res.body.should.have.any.keys("@context");
				res.body.should.have.any.keys("created");
				res.body.id.should.be.a("string");
				res.body.id.should.match(/^MAN\.[0-9]+$/);
				document["id"] = res.body.id;
				document["@type"] = res.body["@type"];
				document["@context"] = res.body["@context"];
				document["created"] = res.body["created"];
				document["annotationByPerson"] = config.user.model.id;
				res.body.should.eql(document);
				anId = res.body.id;
				done();
			});
	});

	it("return 403 when trying to add formAdmin tag with basic user", function (done) {
		this.timeout(6000);
		const query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = JSON.parse(JSON.stringify(config.objects["annotation"]));
		document["addedTags"].push("MMAN.51");
		request(app)
			.post(query)
			.send(document)
			.end(function (err, res) {
				res.should.have.status(403);
				done();
			});
	});


	it("return 403 when trying to add expert tag with basic user", function (done) {
		this.timeout(6000);
		const query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = JSON.parse(JSON.stringify(config.objects["annotation"]));
		document["addedTags"] = ["MMAN.33"];
		request(app)
			.post(query)
			.send(document)
			.end(function (err, res) {
				res.should.have.status(403);
				done();
			});
	});

	it("return 403 when trying to remove expert tag with basic user", function (done) {
		this.timeout(6000);
		const query = basePath +
			"?access_token=" + config["access_token"] + "&personToken=" + config.user.token;
		const document = JSON.parse(JSON.stringify(config.objects["annotation"]));
		document["removedTags"] = ["MMAN.33"];
		request(app)
			.post(query)
			.send(document)
			.end(function (err, res) {
				res.should.have.status(403);
				done();
			});
	});

	describe("After adding annotation", function() {
		it("returns annotations when asking list", function(done) {
			const query = basePath +
				"?access_token=" + config.access_token +
				"&personToken=" + config.user.token +
				"&rootID=" + config.objects.annotation.rootID;
			request(app)
				.get(query)
				.end(function(err, res) {
					res.should.have.status(200);
					done();
				});
		});

		it("returns annotation by rootID", function(done) {
			if (!anId) {
				this.skip();
			}
			const query = basePath + "?access_token=" + config.access_token +
				"&personToken=" + config.user.token +
				"&rootID=" + config.objects.annotation.rootID;
			request(app)
				.get(query)
				.end(function(err, res) {
					res.should.have.status(200);
					done();
				});
		});

		it("returns annotation by full document uri", function(done) {
			if (!anId) {
				this.skip();
			}
			const query = basePath + "?access_token=" + config.access_token +
				"&personToken=" + config.user.token +
				"&rootID=http://tun.fi/" + config.objects.annotation.rootID;
			request(app)
				.get(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					helpers.isPagedResult(res.body, 20, true);
					res.body[helpers.params.results].filter((annotation) => {
						annotation.should.have.property("rootID").eql(config.objects.annotation.rootID);

						return annotation["id"] === anId;
					}).should.have.lengthOf(1);
					done();
				});
		});

		it("requires persontoken", function(done) {
			if (!anId) {
				this.skip();
			}
			const query = basePath + "?access_token=" + config.access_token +
				"&rootID=" + config.objects.annotation.rootID;
			request(app)
				.get(query)
				.end(function(err, res) {
					res.should.have.status(400);
					done();
				});
		});

		it("requires rootID", function(done) {
			if (!anId) {
				this.skip();
			}
			const query = basePath + "?access_token=" + config.access_token +
				"&personToken=" + config.user.token;
			request(app)
				.get(query)
				.end(function(err, res) {
					res.should.have.status(400);
					done();
				});
		});

		it("Does not allow delete without personToken", function(done) {
			if (!anId) {
				this.skip();
			}
			const query = basePath + "/" + anId +
				"?access_token=" + config.access_token;
			request(app)
				.delete(query)
				.end(function(err, res) {
					res.should.have.status(400);
					done();
				});
		});

		it("Does not allow delete with different user", function(done) {
			if (!anId) {
				this.skip();
			}
			const query = basePath + "/" + anId +
				"?access_token=" + config.access_token + "&personToken=" + config.user.friend_token;
			request(app)
				.delete(query)
				.end(function(err, res) {
					res.should.have.status(403);
					done();
				});
		});

		it("deletes annotation", function(done) {
			if (!anId) {
				this.skip();
			}
			const query = basePath + "/" + anId +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(app)
				.delete(query)
				.end(function(err, res) {
					res.should.have.status(200);
					res.body.should.have.property("deleted").eql(true);
					done();
				});
		});

		describe("After deleting annotation", function() {
			it("returns show that the annotation was deleted", function(done) {
				if (!anId) {
					this.skip();
				}
				const query = basePath + "?access_token=" + config.access_token +
					"&personToken=" + config.user.token +
					"&rootID=http://tun.fi/" + config.objects.annotation.rootID;
				request(app)
					.get(query)
					.end(function(err, res) {
						if (err) return done(err);
						res.should.have.status(200);
						helpers.isPagedResult(res.body, 20, true);
						res.body[helpers.params.results].filter((annotation) => {
							return annotation["id"] === anId && annotation["deleted"] !== true;
						}).should.have.lengthOf(0);
						done();
					});
			});
		}); // After deleting annotation
	}); // After adding annotation
}); // /annotation
