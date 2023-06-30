var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

describe("/area", function() {
	var basePath = config["urls"]["area"];

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
			.get(basePath + "/" + config["id"]["area_country"])
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns countries", function(done) {
		this.timeout(5000);
		var pageSize = 248;
		var query = basePath +
			"?type=country&pageSize="+ pageSize+"&access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body, pageSize, true);
				res.body[helpers.params.results].should.have.lengthOf(pageSize);
				res.body[helpers.params.results].filter((country) => {
					return country["id"] === config["id"]["area_country"];
				}).should.have.lengthOf(1);
				done();
			});
	});

	it("returns municipalities", function(done) {
		this.timeout(5000);
		var pageSize = 2;
		var testId = config["id"]["area_municipality"];
		var query = basePath +
			"?type=municipality&idIn=" + testId + "," + config["id"]["country"] + "&pageSize="+ pageSize+"&access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body, pageSize);
				res.body[helpers.params.results].filter((municipality) => {
					return municipality["id"] === testId;
				}).should.have.lengthOf(1);
				res.body.should.include({total: 1});
				done();
			});
	});

	it("returns by ids", function(done) {
		var ids = [
			config["id"]["area_municipality"],
			config["id"]["area_country"],
			config["id"]["area_biogeographical"],
			config["id"]["area_iucn"],
		];
		var query = basePath +
			"?idIn=" + ids.join(",") + "&pageSize="+ ids.length +"&access_token=" + config["access_token"];
		request(this.server)
			.get(query)
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body, ids.length);
				res.body[helpers.params.results].filter((area) => {
					return  ids.indexOf(area["id"]) > -1;
				}).should.have.lengthOf(ids.length);
				res.body.should.include({total: ids.length});
				done();
			});
	});

	it("returns by id", function(done) {
		var testId = config["id"]["area_iucn"];
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
