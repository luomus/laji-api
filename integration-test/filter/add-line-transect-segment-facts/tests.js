// const AddLineTransectSegmentFacts = require("../../../server/filter/type/add-line-transect-segment-facts").AddLineTransectSegmentFacts;
// const assert = require("assert");
//
// describe("filter.AddLineTransectSegmentFacts", function() {
// 	let addLineTransectSegmentFacts, emptyDoc, rdyGathr;
//
// 	beforeEach(function() {
// 		addLineTransectSegmentFacts = new AddLineTransectSegmentFacts();
// 		emptyDoc = JSON.parse(JSON.stringify(require("./data/document.json")));
// 		rdyGathr = JSON.parse(JSON.stringify(require("./data/gatherings-ready.json")));
// 	});
//
// 	afterEach(function() {
// 		addLineTransectSegmentFacts = undefined;
// 	});
//
// 	it("can handle invalid values", function() {
// 		assert.equal(addLineTransectSegmentFacts.filter(null), null);
// 		assert.equal(addLineTransectSegmentFacts.filter(""), "");
// 		assert.deepEqual(addLineTransectSegmentFacts.filter({}), {});
// 		assert.deepEqual(addLineTransectSegmentFacts.filter(["test"]), ["test"]);
// 	});
//
// 	it("can add lengths to facts", function() {
// 		addLineTransectSegmentFacts.init({root: emptyDoc});
// 		assert.deepEqual(addLineTransectSegmentFacts.filter(emptyDoc.gatherings), rdyGathr);
// 	});
//
// 	it("keeps gathering facts that already exits", function() {
// 		emptyDoc.gatherings[0].gatheringFact = {foo: "bar"};
// 		emptyDoc.gatherings[3].gatheringFact = {ha: "test"};
// 		rdyGathr[0].gatheringFact = {foo: "bar", ...rdyGathr[0].gatheringFact};
// 		rdyGathr[3].gatheringFact = {ha: "test", ...rdyGathr[3].gatheringFact};
// 		addLineTransectSegmentFacts.init({root: emptyDoc});
//
// 		assert.deepEqual(addLineTransectSegmentFacts.filter(emptyDoc.gatherings), rdyGathr);
// 	});
//
// 	it("can handle dirty gatherings", function() {
// 		const dirty = require("./data/document-dirty.json");
// 		addLineTransectSegmentFacts.init({root: dirty});
// 		assert.deepEqual(addLineTransectSegmentFacts.filter(dirty.gatherings), require("./data/gatherings-dirty-ready.json"));
// 	});
//
// 	it("can be told with option to which property the values are given", function() {
// 		addLineTransectSegmentFacts.init({root: emptyDoc});
// 		const expected = JSON.parse(JSON.stringify(rdyGathr)
// 			.replace(/"lineTransectSegmentMetersStart"/g, "\"fooStart\"")
// 			.replace(/"lineTransectSegmentMetersEnd"/g, "\"fooEnd\""));
// 		assert.deepEqual(addLineTransectSegmentFacts.filter(emptyDoc.gatherings, {
// 			startFact: "fooStart",
// 			endFact: "fooEnd"
// 		}), expected);
// 	});
//
// }); // /AddLineTransectSegmentFacts
