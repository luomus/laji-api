var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

describe("/information", function() {
	var basePath = config["urls"]["information"];

	it("returns 401 when no access token specified", function(done) {
		request(this.server)
			.get(basePath)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns 401 when no access token specified for id", function(done) {
		request(this.server)
			.get(basePath + "/" + config["id"]["information"])
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns by id parsed", function(done) {
		var query = `${basePath}/${config["id"]["information"]}?access_token=${config["access_token"]}`;
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.id.should.be.a("string");
				res.body.content.should.be.a("string");
				res.body.title.should.be.a("string");
				res.body.author.should.be.a("string");
				res.body.posted.should.be.a("string");
				res.body.featuredImage.url.should.be.a("string");
				res.body.featuredImage.caption.should.be.a("string");
				res.body.modified.should.be.a("string");
				res.body.tags.should.be.a("array");
				res.body.children.should.be.a("array");
				res.body.parents.should.be.a("array");
				done();
			});
	});

	it("returns all parsed", function(done) {
		var query = `${basePath}?access_token=${config["access_token"]}`;
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.id.should.be.a("string");
				res.body.content.should.be.a("string");
				res.body.title.should.be.a("string");
				res.body.author.should.be.a("string");
				res.body.posted.should.be.a("string");
				res.body.modified.should.be.a("string");
				res.body.tags.should.be.a("array");
				res.body.children.should.be.a("array");
				done();
			});
	});


	it("all respects lang param", function(done) {
		var query = `${basePath}?access_token=${config["access_token"]}&lang=fi`;
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.title.should.equal("FI");
				done();
			});
	});

	it("returns index", function(done) {
		var query = `${basePath}/index?access_token=${config["access_token"]}`;
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.property("page");
				res.body.should.have.property("children");
				res.body.should.have.property("roots");
				done();
			});
	});

	it("index respects lang param", function(done) {
		var query = `${basePath}/index?access_token=${config["access_token"]}&lang=fi`;
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.page.title.should.equal("FI");
				done();
			});
	});
});
