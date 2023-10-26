// const _app = require('../dist/main');
const chai = require('chai'),
	expect = chai.expect,
	should = chai.should(),
	chaiHttp = require('chai-http');
chai.use(chaiHttp);
const { Test } = require("@nestjs/testing");
const { AppModule } = require("../dist/app.module");
const { request, timeout } = require("chai");

const params = {
	context: '@context',
	results: 'results',
	pageSize: 'pageSize',
	currentPage: 'currentPage',
	total: 'total',
	lastPage: 'lastPage',
	nextPage: 'nextPage',
	prevPage: 'prevPage',
};
var server = null;

let app;

module.exports = {
	params: params,
	toHaveOnlyKeys(obj, keys) {
		var objKeys = Object.keys(obj);
		var diff = objKeys.filter(function(i) {return keys.indexOf(i) < 0;});
		expect(diff, 'Object has keys that where not expected: ' + JSON.stringify(diff) ).to.have.lengthOf(0);
	},
	isPagedResult: (data, pageSize, shouldHaveNext)  => {
		var keys = [params.context, params.results, params.pageSize,
			params.total, params.currentPage];
		if (typeof shouldHaveNext !== 'undefined') {
			keys.push(params.nextPage);
		}
		if (typeof shouldHaveNext !== 'undefined' || typeof data[params.lastPage] !== 'undefined') {
			keys.push(params.lastPage)
		}
		data.should.have.keys(keys);
		if (typeof pageSize !== 'undefined') {
			data[params.pageSize].should.be.equal(pageSize);
		}
	},
	serverWithClasses: () => {
		before(function(done) {
			// Need to give time to fetch model data from the triplestore
			this.timeout(6000);
			server = app.listen(() => {
				setTimeout(() => {
					done();
				}, 5000)
			});
		});
		after(function(done) {
			server.close(done);
		});
	}
};
