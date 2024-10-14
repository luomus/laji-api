/* eslint-disable max-len */
var config = require("../config.json");
var helpers = require("../helpers");
const { request, expect } = require("chai");

describe("/documents/batch", function() {
	const basePath = config.urls.document;
	const batchPath = basePath + "/batch";

	describe("primary documents", () => {

		const documents = new Array(12).fill(
			{
				"formID":"JX.519",
				"gatheringEvent":{ "leg":["MA.308"], "dateBegin":"2024-05-28" },
				"gatherings":[ {
					"geometry":{ "type":"Point","coordinates":[27.74034,63.965225],"coordinateVerbatim":"25 60" },
					"units":[
						{ "identifications":[{ "taxon":"kettu" }],
							"unitFact":{ "autocompleteSelectedTaxonID":"MX.46587" }
						}]
				}]
			}
		);

		let countBeforeSend;

		before(async function () {
			countBeforeSend = (await request(this.server)
				.get(`${basePath}/count/byYear?access_token=${config.access_token}&personToken=${config.user.token}`).send()
			).body.find(countResponse => countResponse.year === "2024").count;
		});

		let id;

		it("returns 401 when no access token specified", async function() {
			const res = await request(this.server)
				.post(`${batchPath}?personToken=${config.user.token}`)
				.send(documents);
			res.should.have.status(401);
		});

		it("returns 401 when no person token specified", async function() {
			const res = await request(this.server)
				.post(`${batchPath}?access_token=${config.access_token}`)
				.send(documents);
			res.should.have.status(400);
		});

		it("starts job", async function() {
			const res = await request(this.server)
				.post(`${batchPath}?access_token=${config.access_token}&personToken=${config.user.token}`)
				.send(documents);

			res.should.have.status(200);
			id = res.body.id;
			res.body.should.have.property("phase").to.eql("VALIDATING");
			res.body.should.have.property("status");
			res.body.status.should.have.property("processed").eql(0);
			res.body.status.should.have.property("total").eql(documents.length);
			res.body.status.should.have.property("percentage").eql(0);
			res.body.should.have.property("documents");
			res.body.should.have.property("errors");
		});

		it("job status can be followed during background validation, and it doesn't contain documents or errors while it's processing", async function() {
			if (!id) {
				this.skip();
			}
			this.timeout(5000);
			let processed = 0;
			while (processed < documents.length) {
				const res = await request(this.server)
					.get(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
					.send();
				processed = res.body.status.processed;
				if (processed === documents.length) {
					return;
				}

				res.should.have.status(200);
				res.body.should.have.property("phase").to.eql("VALIDATING");
				res.body.should.have.property("status");
				res.body.status.should.have.property("processed");
				res.body.status.should.have.property("total").eql(documents.length);
				res.body.status.should.have.property("percentage");
				res.body.should.have.property("documents");
				res.body.should.have.property("errors");
				await new Promise(resolve => setTimeout(resolve, 500));
			}
			assert.equal(processed === documents.length);
		});

		it("job status contains documents and errors after completing validation", async function() {
			if (!id) {
				this.skip();
			}
			const res = await request(this.server)
				.get(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
				.send();
			res.should.have.status(200);
			res.body.should.have.property("phase").to.eql("READY_TO_COMPLETE");
			res.body.should.have.property("status");
			res.body.status.should.have.property("processed");
			res.body.status.should.have.property("total").eql(documents.length);
			res.body.status.should.have.property("percentage");
			res.body.should.have.property("errors");
			expect(res.body.status.processed).to.equal(documents.length);
			res.body.errors.forEach(e => expect(e).to.equal(null));
		});

		it("starts job completion", async function() {
			if (!id) {
				this.skip();
			}
			const res = await request(this.server)
				.post(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
				.send();

			res.should.have.status(200);
			res.body.should.have.property("phase").to.eql("COMPLETING");
			res.body.should.have.property("status");
			res.body.status.should.have.property("processed").eql(0);
			res.body.status.should.have.property("total").eql(documents.length);
			res.body.status.should.have.property("percentage").eql(0);
			res.body.should.have.property("documents");
			res.body.should.have.property("errors");
		});

		it("job status can be followed during background completion, and it doesn't contain documents or errors while it's processing", async function() {
			if (!id) {
				this.skip();
			}
			this.timeout(5000);
			let processed = 0;
			while (processed < documents.length) {
				const res = await request(this.server)
					.get(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
					.send();
				processed = res.body.status.processed;
				if (processed === documents.length) {
					return;
				}

				res.should.have.status(200);
				res.body.should.have.property("phase").to.eql("COMPLETING");
				res.body.should.have.property("status");
				res.body.status.should.have.property("processed");
				res.body.status.should.have.property("total").eql(documents.length);
				res.body.status.should.have.property("percentage");
				res.body.should.have.property("documents");
				res.body.should.have.property("errors");
				await new Promise(resolve => setTimeout(resolve, 500));
			}
			expect(res.body.status.processed).to.equal(documents.length);
		});

		let createdDocuments;

		it("job status contains updated documents and errors after completing creation", async function() {
			if (!id) {
				this.skip();
			}
			const res = await request(this.server)
				.get(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
				.send();
			res.should.have.status(200);
			res.body.should.have.property("phase").to.eql("COMPLETED");
			res.body.should.have.property("status");
			res.body.status.should.have.property("processed");
			res.body.status.should.have.property("total").eql(documents.length);
			res.body.status.should.have.property("percentage");
			res.body.should.have.property("documents");
			res.body.should.have.property("errors");
			expect(res.body.status.processed).to.equal(documents.length);
			res.body.errors.forEach(e => expect(e).to.equal(null));
			res.body.documents.forEach(d => expect(d.id).not.to.equal(undefined));

			createdDocuments = res.body.documents;
		});

		it("created documents are gettable", async function() {
			if (!id) {
				this.skip();
			}

			countAfterSend = (await request(this.server)
				.get(`${basePath}/count/byYear?access_token=${config.access_token}&personToken=${config.user.token}`).send()
			).body.find(countResponse => countResponse.year === "2024").count;

			expect(countAfterSend).to.equal(countBeforeSend + documents.length);

			// Silently remove documents.
			createdDocuments.forEach(d => {
				void request(this.server)
					.delete(`${basePath}/${d.id}?access_token=${config.access_token}&personToken=${config.user.token}`)
					.send();
			});
		});
	});

	describe("secondary documents", () => {

		const documents = new Array(3).fill(
			{
				"id": "testID",
				"formID":"MHL.618",
				"gatheringEvent":{ "leg":["MA.308"], "dateBegin":"2024-05-28" },
				"gatherings":[ {
					"geometry":{ "type":"Point","coordinates":[27.74034,63.965225],"coordinateVerbatim":"25 60" },
					"units":[
						{ "identifications":[{ "taxon":"kettu" }],
							"unitFact":{ "autocompleteSelectedTaxonID":"MX.46587" }
						}]
				}]
			}
		);

		let id;
		let createdSecondaryDocuments;

		it("starts job", async function() {
			const res = await request(this.server)
				.post(`${batchPath}?access_token=${config.access_token}&personToken=${config.user.token}`)
				.send(documents);

			res.should.have.status(200);
			id = res.body.id;
			res.body.should.have.property("phase").to.eql("VALIDATING");
			res.body.should.have.property("status");
			res.body.status.should.have.property("processed").eql(0);
			res.body.status.should.have.property("total").eql(documents.length);
			res.body.status.should.have.property("percentage").eql(0);
			res.body.should.have.property("documents");
			res.body.should.have.property("errors");
		});

		it("job status can be followed during background validation, and it doesn't contain documents or errors while it's processing", async function() {
			if (!id) {
				this.skip();
			}
			this.timeout(5000);
			let processed = 0;
			while (processed < documents.length) {
				const res = await request(this.server)
					.get(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
					.send();
				processed = res.body.status.processed;
				if (processed === documents.length) {
					return;
				}

				res.should.have.status(200);
				res.body.should.have.property("phase").to.eql("VALIDATING");
				res.body.should.have.property("status");
				res.body.status.should.have.property("processed");
				res.body.status.should.have.property("total").eql(documents.length);
				res.body.status.should.have.property("percentage");
				res.body.should.have.property("documents");
				res.body.should.have.property("errors");
				await new Promise(resolve => setTimeout(resolve, 500));
			}
			assert.equal(processed === documents.length);
		});

		it("job status contains documents and errors after completing validation", async function() {
			if (!id) {
				this.skip();
			}
			const res = await request(this.server)
				.get(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
				.send();
			res.should.have.status(200);
			res.body.should.have.property("phase").to.eql("READY_TO_COMPLETE");
			res.body.should.have.property("status");
			res.body.status.should.have.property("processed");
			res.body.status.should.have.property("total").eql(documents.length);
			res.body.status.should.have.property("percentage");
			res.body.should.have.property("documents");
			res.body.should.have.property("errors");
			console.log(res.body.errors);
			expect(res.body.status.processed).to.equal(documents.length);
			res.body.errors.forEach(e => expect(e).to.equal(null));
		});

		it("starts job completion", async function() {
			if (!id) {
				this.skip();
			}
			const res = await request(this.server)
				.post(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
				.send();

			res.should.have.status(200);
			res.body.should.have.property("phase").to.eql("COMPLETING");
			res.body.should.have.property("status");
			res.body.status.should.have.property("processed").eql(0);
			res.body.status.should.have.property("total").eql(documents.length);
			res.body.status.should.have.property("percentage").eql(0);
			res.body.should.have.property("documents");
			res.body.should.have.property("errors");
		});

		it("job status can be followed during background completion, and it doesn't contain documents or errors while it's processing", async function() {
			if (!id) {
				this.skip();
			}
			this.timeout(5000);
			let processed = 0;
			while (processed < documents.length) {
				const res = await request(this.server)
					.get(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
					.send();
				processed = res.body.status.processed;
				if (processed === documents.length) {
					return;
				}

				res.should.have.status(200);
				res.body.should.have.property("status");
				res.body.status.should.have.property("processed");
				res.body.status.should.have.property("total").eql(documents.length);
				res.body.status.should.have.property("percentage");
				res.body.should.have.property("documents");
				res.body.should.have.property("errors");
				await new Promise(resolve => setTimeout(resolve, 500));
			}
			expect(res.body.status.processed).to.equal(documents.length);
		});

		it("job status contains updated documents and errors after completing creation", async function() {
			if (!id) {
				this.skip();
			}
			const res = await request(this.server)
				.get(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
				.send();
			res.should.have.status(200);
			res.body.should.have.property("phase").to.eql("COMPLETED");
			res.body.should.have.property("status");
			res.body.status.should.have.property("processed");
			res.body.status.should.have.property("total").eql(documents.length);
			res.body.status.should.have.property("percentage");
			res.body.should.have.property("documents");
			res.body.should.have.property("errors");
			expect(res.body.status.processed).to.equal(documents.length);
			res.body.errors.forEach(e => expect(e).to.equal(null));
			res.body.documents.forEach(d => expect(d.id).not.to.equal(undefined));

			createdSecondaryDocuments = res.body.documents;
		});

		it("document publicityRestrictions and dataOrigin are populated", async function() {
			if (!id) {
				this.skip();
			}
			const res = await request(this.server)
				.get(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
				.send();
			res.should.have.status(200);
			res.body.documents.forEach(d => expect(d.dataOrigin).to.eql(["MY.dataOriginSpreadsheetFile"]));
			res.body.documents.forEach(d => expect(d.publicityRestrictions).to.equal("MZ.publicityRestrictionsPublic"));
		});

		it("created secondary docs can be deleted", async function() {
			this.timeout(10000);

			// Start a job.
			const res = await request(this.server)
				.post(`${batchPath}?access_token=${config.access_token}&personToken=${config.user.token}`)
				.send(createdSecondaryDocuments.map(({ id }) => ({ id, delete: true, formID: "MHL.618" })));

			res.should.have.status(200);
			const id = res.body.id;
			res.body.should.have.property("phase").to.eql("VALIDATING");
			res.body.should.have.property("status");
			res.body.status.should.have.property("processed").eql(0);
			res.body.status.should.have.property("total").eql(documents.length);
			res.body.status.should.have.property("percentage").eql(0);
			res.body.should.have.property("documents");
			res.body.should.have.property("errors");

			// Wait until processed.
			let processed = 0;
			while (processed < documents.length) {
				const res = await request(this.server)
					.get(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
					.send();
				processed = res.body.status.processed;
				if (processed === documents.length) {
					return;
				}

				res.should.have.status(200);
				res.body.should.have.property("phase").to.eql("VALIDATING");
				res.body.should.have.property("status");
				res.body.status.should.have.property("processed");
				res.body.status.should.have.property("total").eql(documents.length);
				res.body.status.should.have.property("percentage");
				res.body.should.have.property("documents");
				res.body.should.have.property("errors");
				await new Promise(resolve => setTimeout(resolve, 500));
			}

			// Start job completion.
			const completionRes = await request(this.server)
				.post(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
				.send();

			completionRes.should.have.status(200);
			res.body.should.have.property("phase").to.eql("COMPLETING");
			completionRes.body.should.have.property("status");
			completionRes.body.status.should.have.property("processed").eql(0);
			completionRes.body.status.should.have.property("total").eql(documents.length);
			completionRes.body.status.should.have.property("percentage").eql(0);
			completionRes.body.should.have.property("documents");
			completionRes.body.should.have.property("errors");

			// Wait until processed.
			processed = 0;
			while (processed < documents.length) {
				const res = await request(this.server)
					.get(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
					.send();
				processed = res.body.status.processed;
				if (processed === documents.length) {
					return;
				}

				res.should.have.status(200);
				res.body.should.have.property("phase").to.eql("COMPLETING");
				res.body.should.have.property("status");
				res.body.status.should.have.property("processed");
				res.body.status.should.have.property("total").eql(documents.length);
				res.body.status.should.have.property("percentage");
				res.body.should.have.property("documents");
				res.body.should.have.property("errors");
				await new Promise(resolve => setTimeout(resolve, 500));
			}
			expect(res.body.status.processed).to.equal(documents.length);

			const completedRes = await request(this.server)
				.get(`${batchPath}/${id}?access_token=${config.access_token}&personToken=${config.user.token}`)
				.send();
			res.body.should.have.property("phase").to.eql("COMPLETED");
			completedRes.should.have.status(200);
			completedRes.body.should.have.property("status");
			completedRes.body.status.should.have.property("processed");
			completedRes.body.status.should.have.property("total").eql(documents.length);
			completedRes.body.status.should.have.property("percentage");
			completedRes.body.should.have.property("documents");
			completedRes.body.should.have.property("errors");
			expect(completedRes.body.status.processed).to.equal(documents.length);
			completedRes.body.errors.forEach(e => expect(e).to.equal(null));
			completedRes.body.documents.forEach(d => {
				expect(d.id).not.to.equal(undefined);
				expect(d.delete).to.equal(true);
				expect(d.formID).to.equal("MHL.618");
			});
		});
	});
});

