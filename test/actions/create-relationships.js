var autoroute = require('express-autoroute');
var bodyParser = require('body-parser');
var expect = require('chai').expect;
var mongoose = require('mongoose');
var path = require('path');
var request = require('supertest');

var fixture = require('../fixtures/loadData');

describe('the create block with relationships', function() {
  beforeEach(function() {
    global.app.use(bodyParser.json());

    autoroute(global.app, {
      throwErrors: true,
      routesDir: path.join(process.cwd(), 'test', 'fixtures', 'create-relationships'),
    });

    return fixture.init();
  });

  afterEach(function() {
    return fixture.reset();
  });

  it('should add relationship to the object if its on the request body', function(done) {
    var spouseId = new mongoose.Types.ObjectId();
    request(global.app)
      .post('/people')
      .type('application/json')
      .send({
        data: {
          attributes: {
            name: 'namey mc nameface',
            age: 29,
          },
          relationships: {
            spouse: {
              data: {
                type: 'people',
                id: spouseId,
              },
            },
          },
        },
      })
      .expect(201)
      .expect(function(res) {
        expect(res.body).to.have.deep.property('data.id');
        expect(res.body).to.have.deep.property('data.attributes.name', 'namey mc nameface');
        expect(res.body)
          .to.have.deep.property('data.relationships.spouse.data.id', spouseId.toString());
      })
      .end(global.jsonAPIVerify(done));
  });

  it('should not have a relationship if it is not on the request body', function(done) {
    request(global.app)
      .post('/people')
      .type('application/json')
      .send({
        data: {
          attributes: {
            name: 'namey mc nameface',
            age: 29,
          },
        },
      })
      .expect(201)
      .expect(function(res) {
        expect(res.body).to.have.deep.property('data.id');
        expect(res.body).to.have.deep.property('data.attributes.name', 'namey mc nameface');
        expect(res.body)
          .to.have.deep.property('data.relationships.spouse.data', null);
      })
      .end(global.jsonAPIVerify(done));
  });
  it('should not add relationships that are not on the model', function(done) {
    var monkeyfaceId = new mongoose.Types.ObjectId();
    request(global.app)
      .post('/people')
      .type('application/json')
      .send({
        data: {
          attributes: {
            name: 'namey mc nameface',
            age: 29,
          },
          relationships: {
            monkeyface: {
              type: 'people',
              data: monkeyfaceId,
            },
          },
        },
      })
      .expect(201)
      .expect(function(res) {
        expect(res.body).to.have.deep.property('data.id');
        expect(res.body).to.have.deep.property('data.attributes.name', 'namey mc nameface');
        expect(res.body)
          .to.have.deep.property('data.relationships.spouse.data', null);
        expect(res.body)
          .to.not.have.deep.property('data.relationships.monkeyface');
      })
      .end(global.jsonAPIVerify(done));
  });
});