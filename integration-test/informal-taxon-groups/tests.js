var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

describe("/informal-taxon-groups", function() {
	var basePath = config["urls"]["informal-taxon-groups"];

	it("returns 401 when no access token specified", function(done) {
		request(this.server)
			.get(basePath)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns 401 when no access token specified for id", function(done) {
		this.timeout(5000);
		request(this.server)
			.get(basePath + "/" + config["id"]["informal-taxon-group"])
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns informal taxon groups", function(done) {
		this.timeout(5000);
		var pageSize = 100;
		var query = basePath +
			"?pageSize="+ pageSize+"&access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body[helpers.params.results].should.have.lengthOf(pageSize);
				res.body[helpers.params.results].filter(group => {
					return group["id"] === "MVL.33"
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("returns by ids", function(done) {
		var ids = [
			"MVL.33","MVL.232"
		];
		var query = basePath +
			"?idIn=" + ids.join(",") + "&pageSize="+ ids.length +"&access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body, ids.length);
				res.body[helpers.params.results].filter((group) => {
					return ids.indexOf(group.id) > -1;
				}).should.have.lengthOf(ids.length);
				res.body.should.include({total: ids.length});
				done();
			});
	});

	it("returns by id", function(done) {
		this.timeout(5000);
		var testId = "MVL.33"
		var query = basePath + "/" + testId +
			"?access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.property("id");
				res.body.should.include({id: testId});
				done();
			});
	});
});
