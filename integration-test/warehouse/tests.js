var config = require("../config.json");
require("../helpers");
const { request } = require("chai");

describe("/warehouse", function() {
	var basePath = config.urls.warehouse;

	it("GET proxy works", function(done) {
		const url = basePath + "/query/document?documentId=" + config.id.disabled_form_doc
			+ "&access_token=" + config.access_token;
		request(this.server)
			.get(url)
			.end(function(err, res) {
				res.should.have.status(200);
				done();
			});
	});

	it("POST proxy works", function(done) {
		/* eslint-disable max-len */
		const url = basePath + "/polygon?personToken=" + config.user.token
				+ "&wkt=POLYGON((27.327641%2063.046118,27.202279%2063.040706,27.297792%2063.024463,27.327641%2063.046118))&crs=WGS84"
				+ "&access_token=" + config.access_token
		/* eslint-enable max-len */
		console.log(url);
		request(this.server)
			.post(url)
			.end(function(err, res) {
				res.should.have.status(200);
				done();
			});
	});
});
