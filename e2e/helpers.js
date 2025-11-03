const chai = require("chai"),
	expect = chai.expect,
	should = chai.should(),
	chaiHttp = require("chai-http");
chai.use(chaiHttp);
const { request } = require("chai");

const params = {
	context: "@context",
	results: "results",
	pageSize: "pageSize",
	currentPage: "currentPage",
	total: "total",
	lastPage: "lastPage",
	nextPage: "nextPage",
	prevPage: "prevPage",
};

module.exports = {
	params: params,
	toHaveOnlyKeys(obj, keys) {
		var objKeys = Object.keys(obj);
		var diff = objKeys.filter(function(i) {return keys.indexOf(i) < 0;});
		chai.expect(diff, "Object has keys that where not expected: " + JSON.stringify(diff) ).to.have.lengthOf(0);
	},
	isPagedResult: (data, pageSize, shouldHaveNext)  => {
		var keys = [params.context, params.results, params.pageSize,
			params.total, params.currentPage];
		if (typeof shouldHaveNext !== "undefined") {
			keys.push(params.nextPage);
		}
		if (typeof shouldHaveNext !== "undefined" || typeof data[params.lastPage] !== "undefined") {
			keys.push(params.lastPage);
		}
		data.should.have.keys(keys);
		if (typeof pageSize !== "undefined") {
			data[params.pageSize].should.be.equal(pageSize);
		}
	},
	url: (host, query) => {
		if (!query || !Object.keys(query).length) {
			return host;
		}
		const queryWithArraysAsCommaSeparatedString = Object.keys(query).reduce((q, k) => {
			let v = query[k];
			if (Array.isArray(v)) {
				v = v.join(",");
			}
			q[k] = v;
			return q;
		}, {});
		return host + "?" + new URLSearchParams(queryWithArraysAsCommaSeparatedString).toString();
	},
	apiRequest: function(server, { accessToken, personToken, lang } = {}) {
		return ["get", "post", "put", "delete"].reduce((wrapper, method) => {
			wrapper[method] = function(url) {
				const req = request(server)[method](url);
				req.set("API-Version", 1);
				if (accessToken) {
					req.set("Authorization", `Bearer ${accessToken}`);
				}
				if (personToken) {
					req.set("Person-Token", personToken);
				}
				if (lang) {
					req.set("Accept-language", lang);
				}
				return req;
			};
			return wrapper;
		}, {});
	}
};
