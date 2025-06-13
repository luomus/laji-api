var config = require("./config.json");
var helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token, personToken } = config;

const annotation = {
	rootID: "JX.128736",
	targetID: "MY.1236#3",
	notes: "Just a test annotation",
	type: "MAN.typeOpinion",
	byRole: "MMAN.basic",
	addedTags: ["MMAN.26"]
};

describe("/annotation", function() {
	const basePath = "/annotations";
	let savedId;

	it("returns 401 when no access token specified", function(done) {
		request(this.server)
			.get(basePath)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns 401 when trying to add without permissions", function(done) {
		request(this.server)
			.post(url(basePath, { access_token }))
			.send({})
			.end(function (err, res) {
				res.should.have.status(400);
				done();
			});
	});

	it("adds annotation", function (done) {
		this.timeout(10000);
		const document = JSON.parse(JSON.stringify(annotation));
		request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.send(annotation)
			.end(function (err, res) {
				if (err) return done(err);
				res.should.have.status(201);
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
				savedId = res.body.id;
				done();
			});
	});

	it("return 403 when trying to add formAdmin tag with basic user", function (done) {
		this.timeout(6000);
		const document = JSON.parse(JSON.stringify(annotation));
		document["addedTags"].push("MMAN.51");
		document["rootID"] = "JX.322170"; // line transect document
		request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.send(document)
			.end(function (err, res) {
				res.should.have.status(403);
				done();
			});
	});


	it("return 403 when trying to add expert tag with basic user", function (done) {
		this.timeout(6000);
		const document = JSON.parse(JSON.stringify(config.objects["annotation"]));
		document["addedTags"] = ["MMAN.33"];
		request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.send(document)
			.end(function (err, res) {
				res.should.have.status(403);
				done();
			});
	});

	it("return 403 when trying to remove expert tag with basic user", function (done) {
		this.timeout(6000);
		const document = JSON.parse(JSON.stringify(config.objects["annotation"]));
		document["removedTags"] = ["MMAN.33"];
		request(this.server)
			.post(url(basePath, { access_token, personToken }))
			.send(document)
			.end(function (err, res) {
				res.should.have.status(403);
				done();
			});
	});

	describe("After adding annotation", function() {
		it("returns annotations when asking list", function(done) {
			request(this.server)
				.get(url(basePath, { access_token, personToken, rootID: annotation.rootID }))
				.end(function(err, res) {
					res.should.have.status(200);
					done();
				});
		});

		it("returns annotation by rootID", function(done) {
			if (!savedId) {
				this.skip();
			}
			request(this.server)
				.get(url(basePath, { access_token, personToken, rootID: annotation.rootID }))
				.end(function(err, res) {
					res.should.have.status(200);
					done();
				});
		});

		it("requires persontoken", function(done) {
			if (!savedId) {
				this.skip();
			}
			request(this.server)
				.get(url(basePath, { access_token, rootID: annotation.rootID }))
				.end(function(err, res) {
					res.should.have.status(400);
					done();
				});
		});

		it("requires rootID", function(done) {
			if (!savedId) {
				this.skip();
			}
			request(this.server)
				.get(url(basePath, { access_token, personToken }))
				.end(function(err, res) {
					res.should.have.status(400);
					done();
				});
		});

		it("Does not allow delete without personToken", function(done) {
			if (!savedId) {
				this.skip();
			}
			request(this.server)
				.delete(url(`${basePath}/${savedId}`, { access_token }))
				.end(function(err, res) {
					res.should.have.status(400);
					done();
				});
		});

		it("Does not allow delete with different user", function(done) {
			if (!savedId) {
				this.skip();
			}
			request(this.server)
				.delete(url(`${basePath}/${savedId}`, { access_token, personToken: config.friend.personToken }))
				.end(function(err, res) {
					res.should.have.status(403);
					done();
				});
		});

		it("deletes annotation", function(done) {
			if (!savedId) {
				this.skip();
			}
			request(this.server)
				.delete(url(`${basePath}/${savedId}`, { access_token, personToken }))
				.end(function(err, res) {
					res.should.have.status(200);
					res.body.should.have.property("deleted").eql(true);
					done();
				});
		});

		describe("After deleting annotation", function() {
			it("returns show that the annotation was deleted", function(done) {
				if (!savedId) {
					this.skip();
				}
				request(this.server)
					.get(url(basePath, { access_token, personToken, rootID: annotation.rootID }))
					.end(function(err, res) {
						if (err) return done(err);
						res.should.have.status(200);
						helpers.isPagedResult(res.body, 20, true);
						res.body[helpers.params.results].filter((a) => {
							return a["id"] === savedId && a["deleted"] !== true;
						}).should.have.lengthOf(0);
						done();
					});
			});
		}); // After deleting annotation
	}); // After adding annotation
}); // /annotation
