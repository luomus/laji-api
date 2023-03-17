// const FilterRunner = require("../../server/filter/filter").FilterRunner;
// const assert = require("assert");
//
// describe("filter.FilterRunner", function() {
// 	const filterRunner = new FilterRunner();
//
// 	it("can filter simple field", function() {
// 		const src = {foo: "bar"};
// 		const result = filterRunner.filter(src, {fields: [
// 			{
// 				name: "foo",
// 				type: "text",
// 				filters: {
// 					"to-upper-case": {}
// 				}
// 			}
// 		]});
// 		assert.deepEqual(result, {foo: "BAR"});
// 		assert.deepEqual(src, {foo: "bar"});
// 		assert.notEqual(result, src);
// 	});
//
// 	it("can handle empty values", function() {
// 		const src = {foo: "bar"};
// 		const form = {fields: [
// 			{
// 				name: "foo",
// 				type: "text",
// 				filters: {
// 					"to-upper-case": {}
// 				}
// 			}
// 		]};
// 		assert.equal(filterRunner.filter(null, form), null);
// 		assert.equal(filterRunner.filter("", form), "");
// 		assert.deepEqual(filterRunner.filter({}, form), {});
// 	});
//
// 	it("filters fieldsets", function() {
// 		const src = {
// 			foo: {
// 				key: "bar"
// 			}
// 		};
// 		const result = filterRunner.filter(src, {fields: [
// 			{
// 				name: "foo",
// 				type: "fieldset",
// 				fields: [
// 					{
// 						name: "key",
// 						type: "text",
// 						filters: {
// 							"to-upper-case": {}
// 						}
// 					}
// 				]
// 			}
// 		]});
// 		assert.deepEqual(result, {foo: {key: "BAR"}});
// 		assert.deepEqual(src, {foo: {key: "bar"}});
// 	});
//
//
// 	it("filters collection", function() {
// 		const src = {
// 			foo: [
// 				{
// 					key: "bar"
// 				},
// 				{
// 					key: "test"
// 				}
// 			]
// 		};
// 		const result = filterRunner.filter(src, {fields: [
// 			{
// 				name: "foo",
// 				type: "collection",
// 				fields: [
// 					{
// 						name: "key",
// 						type: "text",
// 						filters: {
// 							"to-upper-case": {}
// 						}
// 					}
// 				]
// 			}
// 		]});
// 		assert.deepEqual(result, {foo: [{key: "BAR"}, {key: "TEST"}]});
// 		assert.deepEqual(src, {foo: [{key: "bar"}, {key: "test"}]});
// 	});
//
// 	it("filters complex data", function() {
// 		const src = {
// 			k1: [
// 				{
// 					k2: {
// 						k3: "foo"
// 					}
// 				},
// 				{
// 					k2: {
// 						k3: "bar"
// 					}
// 				}
// 			],
// 			k4: {
// 				k5: "test"
// 			},
// 			k6: "done"
// 		};
// 		const result = filterRunner.filter(src, {fields: [
// 			{
// 				name: "k1",
// 				type: "collection",
// 				fields: [
// 					{
// 						name: "k2",
// 						type: "fieldset",
// 						fields: [
// 							{
// 								name: "k3",
// 								type: "text",
// 								filters: {
// 									"to-upper-case": {}
// 								}
// 							}
// 						]
// 					}
// 				]
// 			},
// 			{
// 				name: "k4",
// 				type: "fieldset",
// 				fields: [
// 					{
// 						name: "k5",
// 						type: "text",
// 						filters: {
// 							"to-upper-case": {}
// 						}
// 					}
// 				]
// 			},
// 			{
// 				name: "k6",
// 				type: "text",
// 				filters: {
// 					"to-upper-case": {}
// 				}
// 			}
// 		]});
// 		assert.deepEqual(result, {k1: [{k2: {k3: "FOO"}},{k2: {k3: "BAR"}}],k4: {k5: "TEST"},k6: "DONE"});
// 		assert.deepEqual(src, {k1: [{k2: {k3: "foo"}},{k2: {k3: "bar"}}],k4: {k5: "test"},k6: "done"});
// 	});
//
// }); // /FilterRunner
