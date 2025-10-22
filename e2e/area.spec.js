var config = require("./config.json");
var helpers = require("./helpers");
const { request } = require("chai");
const { url } = helpers;
const { access_token } = config;

describe("/area", function() {
	const basePath = "/areas";

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
			.get(`${basePath}/ML.206`)
			.end(function(err, res) {
				res.should.have.status(401);
				done();
			});
	});

	it("returns countries", function(done) {
		this.timeout(5000);
		var pageSize = 248;
		request(this.server)
			.get(url(basePath, { areaType: "ML.country", pageSize, access_token }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body, pageSize, true);
				res.body[helpers.params.results].should.have.lengthOf(pageSize);
				res.body[helpers.params.results].filter((country) => {
					return country["id"] ===  "ML.206"; // a country
				}).should.have.lengthOf(1);
				res.body[helpers.params.results].filter((area) => {
					return area["areaType"] === "ML.country"
				}).should.have.lengthOf(pageSize);
				done();
			});
	});

	it("returns countries with deprecated type", function(done) {
		this.timeout(5000);
		var pageSize = 248;
		request(this.server)
			.get(url(basePath, { type: "country", pageSize, access_token }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body, pageSize, true);
				res.body[helpers.params.results].should.have.lengthOf(pageSize);
				res.body[helpers.params.results].filter((country) => {
					return country["id"] === "ML.206"; // a country
				}).should.have.lengthOf(1);
				res.body[helpers.params.results].filter((area) => {
					return area["areaType"] === "ML.country"
				}).should.have.lengthOf(pageSize);
				done();
			});
	});

	it("returns municipalities", function(done) {
		this.timeout(5000);
		var pageSize = 2;
		request(this.server)
			.get(url(basePath, { type: "municipality", idIn: "ML.352", pageSize, access_token }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body, pageSize);
				res.body[helpers.params.results].filter((municipality) => {
					return municipality["id"] === "ML.352"; // a municipality
				}).should.have.lengthOf(1);
				res.body.should.include({ total: 1 });
				done();
			});
	});

	it("returns by ids", function(done) {
		const idIn = ["ML.352", "ML.206", "ML.253",  "ML.691"];
		request(this.server)
			.get(url(basePath, { idIn, pageSize: idIn.length, access_token: config.access_token }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				helpers.isPagedResult(res.body, idIn.length);
				res.body[helpers.params.results].filter((area) => {
					return idIn.indexOf(area["id"]) > -1;
				}).should.have.lengthOf(idIn.length);
				res.body.should.include({ total: idIn.length });
				done();
			});
	});

	it("returns by id", function(done) {
		this.timeout(5000);
		request(this.server)
			.get(url(`${basePath}/ML.691`, { access_token }))
			.end(function(err, res) {
				if (err) return done(err);
				res.should.have.status(200);
				res.body.should.have.property("id");
				res.body.should.include({ id: "ML.691" });
				done();
			});
	});
});
