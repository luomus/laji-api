var fs = require("fs");
var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

const errorMissingPersonToken = "personToken is a required argument";
const errorOnlyOwn = "Can only handle images uploaded by the user";

const itemProperties = [
	"@context",
	"id",
	"intellectualRights",
	"intellectualOwner",
	"uploadedBy",
	"thumbnailURL",
	"taxonVerbatim",
	"squareThumbnailURL",
	"LuomusIntellectualRights",
	"captureDateTime",
	"capturerVerbatim",
	"fullURL",
	"keyword",
	"largeURL",
	"originalURL"
];

describe("/image", function() {
	var basePath = config.urls.image;
	var imageTmpId;
	var imageId;
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

	it("returns 401 when no access token specified for id", function(done) {
		request(app)
			.get(basePath + "/" + config.id.image_others)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns 400 when no person token specified for post request", function(done) {
		request(app)
			.post(basePath + "/" + config.id.image_others + "?access_token=" + config["access_token"])
			.end(function(err, res) {
				res.should.have.status(400);
				res.body.should.have.property("error").include({message: errorMissingPersonToken});
				done();
			});
	});

	it("returns 400 when no person token specified for put request", function(done) {
		request(app)
			.put(basePath + "/" + config.id.image_others + "?access_token=" + config["access_token"])
			.send({})
			.end(function(err, res) {
				res.should.have.status(400);
				res.body.should.have.property("error").include({message: errorMissingPersonToken});
				done();
			});
	});

	it("returns 400 when no person token specified for delete request", function(done) {
		request(app)
			.delete(basePath + "/" + config.id.image_others + "?access_token=" + config["access_token"])
			.end(function(err, res) {
				res.should.have.status(400);
				res.body.should.have.property("error").include({message: errorMissingPersonToken});
				done();
			});
	});

	it("returns 400 when trying to update others image", function(done) {
		request(app)
			.put(basePath + "/" + config.id.image_others + "?access_token=" + config.access_token + "&personToken=" + config.user.token)
			.send({})
			.end(function(err, res) {
				res.should.have.status(400);
				res.body.should.have.property("error").include({message: errorOnlyOwn});
				done();
			});
	});

	it("returns 400 when trying to delete others image", function(done) {
		request(app)
			.delete(basePath + "/" + config.id.image_others + "?access_token=" + config.access_token + "&personToken=" + config.user.token)
			.end(function(err, res) {
				res.should.have.status(400);
				res.body.should.have.property("error").include({message: errorOnlyOwn});
				done();
			});
	});

	it("returns a list of images", function(done) {
		var pageSize = 100;
		var query = basePath +
			"?pageSize="+ pageSize+"&access_token=" + config["access_token"];
		request(app)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body, pageSize, true);
				res.body[helpers.params.results].filter((image) => {
					helpers.toHaveOnlyKeys(image, itemProperties);
					image.should.have.any.keys("id");
				});
				done();
			});
	});

	it("returns a temp id when adding image", function(done) {
		var query = basePath +
			"?access_token=" + config.access_token + "&personToken=" + config.user.token;
		request(app)
			.post(query)
			.attach("image", fs.readFileSync(__dirname + "/bird.jpg"), "bird.jpg")
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.be.a("array");
				res.body.should.have.lengthOf(1);
				res.body[0].should.have.keys("name", "filename", "id", "expires");
				imageTmpId = res.body[0].id;
				done();
			});
	});
	describe("after receiving temporal id", function() {

		it("Cannot update meta object with empty object", function(done) {
			if (!imageTmpId) {
				this.skip();
			}
			this.timeout(10000);
			var query = basePath + "/" + imageTmpId +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(app)
				.post(query)
				.send({})
				.end(function(err, res) {
					res.should.have.status(422);
					done();
				});
		});


		it("returns a meta object", function(done) {
			if (!imageTmpId) {
				this.skip();
			}
			this.timeout(5000);
			const rights = "MZ.intellectualRightsCC-BY-SA-4.0";
			const owner = "Viltsu testaaja";
			var query = basePath + "/" + imageTmpId +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(app)
				.post(query)
				.send({intellectualRights: rights, intellectualOwner: owner})
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(201);
					res.body.should.be.a("object");
					helpers.toHaveOnlyKeys(res.body, itemProperties);
					res.body.should.include({
						intellectualRights: rights,
						intellectualOwner: owner,
						uploadedBy: config.user.model.id
					});
					imageId = res.body.id;
					done();
				});
		});
	});

	describe("after receiving id", function() {
		it("updates image meta data", function(done) {
			if (!imageId) {
				this.skip();
			}
			this.timeout(5000);
			var query = basePath + "/" + imageId +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			var meta = {
				intellectualRights: config.id.media_non_default_rights,
				intellectualOwner: "Viltsu",
				uploadedBy: "MA.97"
			};
			request(app)
				.put(query)
				.send(meta)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.body.should.be.a("object");
					helpers.toHaveOnlyKeys(res.body, itemProperties);
					res.body.should.have.property("intellectualRights").eql(meta.intellectualRights);
					res.body.should.have.property("intellectualOwner").eql(meta.intellectualOwner);
					res.body.should.have.property("uploadedBy").eql(config.user.model.id);
					done();
				});
		});

		it("doesn't accept garbage", function(done) {
			if (!imageId) {
				this.skip();
			}
			this.timeout(5000);
			var query = basePath + "/" + imageId +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			var meta = {
				intellectualRights: "FooBar"
			};
			request(app)
				.put(query)
				.send(meta)
				.end(function(err, res) {
					res.should.have.status(400);
					done();
				});
		});

		it("returns large jpg", function(done) {
			if (!imageId) {
				this.skip();
			}
			var query = basePath + "/" + imageId + "/large.jpg" +
				"?access_token=" + config.access_token;
			request(app)
				.get(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.should.have.header("content-type", "image/jpeg");
					done();
				});
		});


		it("returns square jpg", function(done) {
			if (!imageId) {
				this.skip();
			}
			var query = basePath + "/" + imageId + "/square.jpg" +
				"?access_token=" + config.access_token;
			request(app)
				.get(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.should.have.header("content-type", "image/jpeg");
					done();
				});
		});

		it("returns thumbnail jpg", function(done) {
			if (!imageId) {
				this.skip();
			}
			var query = basePath + "/" + imageId + "/thumbnail.jpg" +
				"?access_token=" + config.access_token;
			request(app)
				.get(query)
				.end(function(err, res) {
					if (err) return done(err);
					res.should.have.status(200);
					res.should.have.header("content-type", "image/jpeg");
					done();
				});
		});

		it("deletes image", function(done) {
			if (!imageId) {
				this.skip();
			}
			this.timeout(5000);
			var query = basePath + "/" + imageId +
				"?access_token=" + config.access_token + "&personToken=" + config.user.token;
			request(app)
				.delete(query)
				.end(function(err, res) {
					res.should.have.status(204);
					done();
				});
		});

	});

});
