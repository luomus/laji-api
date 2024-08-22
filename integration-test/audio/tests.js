var fs = require("fs");
var config = require("../config.json");
var helpers = require("../helpers");
const { request } = require("chai");

const errorOnlyOwn = "Can only update audio uploaded by the user";
const errorOnlyOwnDelete = "Can only delete audio uploaded by the user";

const commonProperties = [
  "@context",
  "id",
  "intellectualRights",
  "intellectualOwner",
  "uploadedBy",
  "thumbnailURL",
  "taxonVerbatim",
  "LuomusIntellectualRights",
  "captureDateTime",
  "capturerVerbatim",
  "fullURL",
  "keyword",
  "mp3URL"
];
const wavItemProperties = [
  ...commonProperties,
  "wavURL"
];
const flacItemProperties = [
  ...commonProperties,
  "flacURL"
];

describe("/audio", function() {
  var basePath = config.urls.audio;
  var audioTmpId;
  var audioId;
  var flacAudioTmpId;
  var flacAudioId;

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
      .get(basePath + "/" + config.id.audio_others)
      .end(function(err, res) {
        res.should.have.status(401);
        done();
      });
  });

  it("returns 400 when no person token specified for post request", function(done) {
    request(this.server)
      .post(basePath + "/" + config.id.audio_others + "?access_token=" + config["access_token"])
      .send({ intellectualRights: "MZ.intellectualRightsCC-BY-SA-4.0" })
      .end(function(err, res) {
        res.should.have.status(400);
        done();
      });
  });

  it("returns 400 when no person token specified for put request", function(done) {
    request(this.server)
      .put(basePath + "/" + config.id.audio_others + "?access_token=" + config["access_token"])
      .send({})
      .end(function(err, res) {
        res.should.have.status(400);
        done();
      });
  });

  it("returns 400 when no person token specified for delete request", function(done) {
    request(this.server)
      .delete(basePath + "/" + config.id.audio_others + "?access_token=" + config["access_token"])
      .end(function(err, res) {
        res.should.have.status(400);
        done();
      });
  });

  it("returns 400 when trying to update others audio", function(done) {
    request(this.server)
      .put(basePath + "/" + config.id.audio_others + "?access_token=" + config.access_token + "&personToken=" + config.user.token)
      .send({})
      .end(function(err, res) {
        res.should.have.status(400);
        res.body.should.include({message: errorOnlyOwn});
        done();
      });
  });

  it("returns 400 when trying to delete others audio", function(done) {
    request(this.server)
      .delete(basePath + "/" + config.id.audio_others + "?access_token=" + config.access_token + "&personToken=" + config.user.token)
      .end(function(err, res) {
        res.should.have.status(400);
        res.body.should.include({message: errorOnlyOwnDelete});
        done();
      });
  });

  it("returns a list of audio", function(done) {
    this.timeout(10000);
    var pageSize = 10;
    var query = basePath +
      "?pageSize="+ pageSize+"&access_token=" + config["access_token"];
    request(this.server)
      .get(query)
      .end(function(err, res) {
        if (err) return done(err);
        res.should.have.status(200);
        helpers.isPagedResult(res.body, pageSize, true);
        res.body[helpers.params.results].filter((audio) => {
          helpers.toHaveOnlyKeys(audio, wavItemProperties);
          audio.should.have.any.keys("id");
        });
        done();
      });
  });

  it("returns a temp id when adding audio", function(done) {
    var query = basePath +
      "?access_token=" + config.access_token + "&personToken=" + config.user.token;
    request(this.server)
      .post(query)
      .attach("audio", fs.readFileSync(__dirname + "/bird.wav"), "bird.wav")
      .end(function(err, res) {
        if (err) return done(err);
        res.should.have.status(200);
        res.body.should.be.a("array");
        res.body.should.have.lengthOf(1);
        res.body[0].should.have.keys("name", "filename", "id", "expires");
        audioTmpId = res.body[0].id;
        done();
      });
  });
  describe("after receiving temporal id", function() {

    it("Cannot update meta object with empty object", function(done) {
      if (!audioTmpId) {
        this.skip();
      }
      this.timeout(10000);
      var query = basePath + "/" + audioTmpId +
        "?access_token=" + config.access_token + "&personToken=" + config.user.token;
      request(this.server)
      .post(query)
      .send({})
      .end(function(err, res) {
        res.should.have.status(422);
        done();
      });
    });


    it("returns a meta object", function(done) {
      if (!audioTmpId) {
        this.skip();
      }
      this.timeout(5000);
      const rights = "MZ.intellectualRightsCC-BY-SA-4.0";
      const owner = "Viltsu testaaja";
      var query = basePath + "/" + audioTmpId +
        "?access_token=" + config.access_token + "&personToken=" + config.user.token;
      request(this.server)
        .post(query)
        .send({intellectualRights: rights, intellectualOwner: owner})
        .end(function(err, res) {
          if (err) return done(err);
          res.should.have.status(201);
          res.body.should.be.a("object");
          helpers.toHaveOnlyKeys(res.body, wavItemProperties);
          res.body.should.include({
            intellectualRights: rights,
            intellectualOwner: owner,
            uploadedBy: config.user.model.id
          });
          audioId = res.body.id;
          done();
        });
    });
  });

  describe("after receiving id", function() {
    it("updates audio meta data", function(done) {
      if (!audioId) {
        this.skip();
      }
      this.timeout(5000);
      var query = basePath + "/" + audioId +
        "?access_token=" + config.access_token + "&personToken=" + config.user.token;
      var meta = {
        intellectualRights: config.id.media_non_default_rights,
        intellectualOwner: "Viltsu",
        uploadedBy: "MA.97"
      };
      request(this.server)
        .put(query)
        .send(meta)
        .end(function(err, res) {
          if (err) return done(err);
          res.should.have.status(200);
          res.body.should.be.a("object");
          helpers.toHaveOnlyKeys(res.body, wavItemProperties);
          res.body.should.have.property("intellectualRights").eql(meta.intellectualRights);
          res.body.should.have.property("intellectualOwner").eql(meta.intellectualOwner);
          res.body.should.have.property("uploadedBy").eql(config.user.model.id);
          done();
        });
    });

    it("doesn't accept garbage", function(done) {
      if (!audioId) {
        this.skip();
      }
      this.timeout(5000);
      var query = basePath + "/" + audioId +
        "?access_token=" + config.access_token + "&personToken=" + config.user.token;
      var meta = {
        intellectualRights: "FooBar"
      };
      request(this.server)
        .put(query)
        .send(meta)
        .end(function(err, res) {
          res.should.have.status(400);
          done();
        });
    });

    it("returns wav", function(done) {
      if (!audioId) {
        this.skip();
      }
      var query = basePath + "/" + audioId + "/wav" +
        "?access_token=" + config.access_token;
      request(this.server)
        .get(query)
        .end(function(err, res) {
          if (err) return done(err);
          res.should.have.status(200);
          res.should.have.header("content-type", "audio/x-wav");
          done();
        });
    });


    it("returns mp3", function(done) {
      if (!audioId) {
        this.skip();
      }
      var query = basePath + "/" + audioId + "/mp3" +
        "?access_token=" + config.access_token;
      request(this.server)
        .get(query)
        .end(function(err, res) {
          if (err) return done(err);
          res.should.have.status(200);
          res.should.have.header("content-type", "audio/mpeg");
          done();
        });
    });

    it("returns thumbnail jpg", function(done) {
      if (!audioId) {
        this.skip();
      }
      var query = basePath + "/" + audioId + "/thumbnail.jpg" +
        "?access_token=" + config.access_token;
      request(this.server)
        .get(query)
        .end(function(err, res) {
          if (err) return done(err);
          res.should.have.status(200);
          res.should.have.header("content-type", "image/jpeg");
          done();
        });
    });

    it("deletes audio", function(done) {
      if (!audioId) {
        this.skip();
      }
      this.timeout(5000);
      var query = basePath + "/" + audioId +
        "?access_token=" + config.access_token + "&personToken=" + config.user.token;
      request(this.server)
        .delete(query)
        .end(function(err, res) {
          res.should.have.status(204);
          done();
        });
    });
  });

  describe("flac audio", function() {
	it("returns a temp id when adding flac audio", function(done) {
      var query = basePath +
        "?access_token=" + config.access_token + "&personToken=" + config.user.token;
      request(this.server)
        .post(query)
        .attach("audio", fs.readFileSync(__dirname + "/bat.flac"), "bat.flac")
        .end(function(err, res) {
          if (err) return done(err);
          res.should.have.status(200);
          res.body.should.be.a("array");
          res.body.should.have.lengthOf(1);
          res.body[0].should.have.keys("name", "filename", "id", "expires");
          flacAudioTmpId = res.body[0].id;
          done();
        });
    });

    it("returns a meta object for flac audio", function(done) {
      if (!flacAudioTmpId) {
        this.skip();
      }
      this.timeout(5000);
      const rights = "MZ.intellectualRightsCC-BY-SA-4.0";
      const owner = "Viltsu testaaja";
      var query = basePath + "/" + flacAudioTmpId +
        "?access_token=" + config.access_token + "&personToken=" + config.user.token;
      request(this.server)
        .post(query)
        .send({intellectualRights: rights, intellectualOwner: owner})
        .end(function(err, res) {
          if (err) return done(err);
          res.should.have.status(201);
          res.body.should.be.a("object");
          helpers.toHaveOnlyKeys(res.body, flacItemProperties);
          res.body.should.include({
            intellectualRights: rights,
            intellectualOwner: owner,
            uploadedBy: config.user.model.id
          });
          flacAudioId = res.body.id;
          done();
        });
    });

    it("returns flac", function(done) {
      if (!flacAudioId) {
        this.skip();
      }
      var query = basePath + "/" + flacAudioId + "/flac" +
        "?access_token=" + config.access_token;
	  request(this.server)
        .get(query)
        .end(function(err, res) {
          if (err) return done(err);
          res.should.have.status(200);
          res.should.have.header("content-type", "audio/flac");
          done();
        });
    });
  });
});
