'use strict';

var fs = require("fs");

var template = require('url-template');

function getUriScheme(spec) {
    return ((spec.schemes || []).concat(['https']))[0];
}

function parseXample(spec, uri, method, xample) {
    var uriTemplate = template.parse(uri);
    var expandedUri = uriTemplate.expand(xample.request.params);
    xample.request.method = method;
    xample.request.uri = getUriScheme(spec) + '://' + spec.host + spec.basePath + expandedUri;
    return {
        description: xample.description || method + ' ' + uri,
        request: xample.request,
        responses: xample.responses
    };
}

function inferXample(spec, uri, method, operation, statusString) {
    var request = {
        method: method,
        uri: getUriScheme(spec) + '://' + spec.host + spec.basePath + uri
    };
    var responses = {};
    if (operation.produces && operation.produces[0]) {
        responses[statusString] = {
          headers: {
            'content-type':  operation.produces[0]
          }
        };
    }
    return {
        description: method + ' ' + uri,
        request: request,
        responses: responses
    };
}

function parse(spec, options) {

    options = options || {};

    if (options.host) {
        spec.host = options.host;
    }
    if (options.schemes) {
        spec.schemes = options.schemes;
    }
    if (options.basePath) {
        spec.basePath = options.basePath;
    }

    var xamples = [];

    Object.keys(spec.paths || {}).forEach(function (uri) {
        var path = spec.paths[uri];
        Object.keys(path).forEach(function (method) {
            var operation = path[method];
            var operationId = operation.operationId;
            // fix xamples from file
            if (operationId || operationId.length > 0) {
                var fixtureJson = options.fixturePath + operationId + ".json";

                if (fs.existsSync(fixtureJson)) {
                    console.log("read:" + fixtureJson);
                    var examplArr = JSON.parse(fs.readFileSync(fixtureJson, 'utf8'));
                    examplArr.forEach(function (xample) {
                        xamples.push(parseXample(spec, uri, method, xample));
                    });
                } else {
                    console.log("skip test for:" + operationId);
                }
                fs.existsSync("test/swagger.json")
            } else if (options.inferXamples) {
                Object.keys(operation.responses || {}).forEach(function (statusString) {
                    xamples.push(inferXample(spec, uri, method, operation, statusString));
                });
            }
        });
    });

    return xamples;
}

module.exports.parse = parse;
