'use strict';

var Curry        = require("bs-platform/lib/js/curry.js");
var Debug        = require("bs-node-debug/lib/js/src/Debug.js");
var Process      = require("process");
var Js_option    = require("bs-platform/lib/js/js_option.js");
var Caml_array   = require("bs-platform/lib/js/caml_array.js");
var Js_primitive = require("bs-platform/lib/js/js_primitive.js");

function getEnvVar(key, fallback) {
  return Js_option.getWithDefault(fallback, Js_primitive.undefined_to_opt(Process.env[key]));
}

var debug = Debug.make(getEnvVar("KNEX_DEBUG_PREFIX", "bs-knex"), "KnexUtils");

var debugExn = Debug.make(getEnvVar("KNEX_DEBUG_PREFIX", "bs-knex"), "KnexUtils:exn");

var invalidTextRepresentation = "22P02";

var uniqueViolation = "23505";

function objToJson(obj) {
  var str = JSON.stringify(obj);
  if (str !== undefined) {
    return JSON.parse(str);
  } else {
    return null;
  }
}

function handleUniqueError(name, message, promise) {
  return promise.catch((function (exn) {
                var $$continue = Promise.reject(exn);
                var codeOpt = exn.code;
                if (codeOpt == null) {
                  return $$continue;
                } else if (codeOpt === uniqueViolation) {
                  var constraintOpt = exn.constraint;
                  if (!(constraintOpt == null) && constraintOpt === name) {
                    return Promise.reject(new Error(message));
                  } else {
                    return $$continue;
                  }
                } else {
                  return $$continue;
                }
              }));
}

function handleDbErrors(promise) {
  return promise.catch((function (exn) {
                var codeOpt = exn.code;
                if (codeOpt == null) {
                  debug("Unhandled error:");
                  debugExn(exn);
                  return Promise.reject(new Error("A database error occurred."));
                } else if (codeOpt === uniqueViolation) {
                  return Promise.reject(new Error("A unique constraint was violated."));
                } else if (codeOpt === invalidTextRepresentation) {
                  var routineOpt = exn.routine;
                  if (routineOpt == null) {
                    return Promise.reject(new Error("The database received an invalid text representation."));
                  } else if (routineOpt === "string_to_uuid") {
                    return Promise.reject(new Error("The database received an invalid format for a UUID"));
                  } else {
                    return Promise.reject(new Error("The database received an invalid text representation."));
                  }
                } else {
                  debug("Unhandled error:");
                  debugExn(exn);
                  return Promise.reject(new Error("A database error occurred."));
                }
              }));
}

function decodeResults(decoder, results) {
  return Promise.resolve(results.map(objToJson).map(Curry.__1(decoder)));
}

function rejectIfEmpty(decoder, error, results) {
  if (results.length !== 0) {
    return decodeResults(decoder, results);
  } else {
    return Promise.reject(new Error(error));
  }
}

function pickFirst(results) {
  return Promise.resolve(Caml_array.caml_array_get(results, 0));
}

exports.getEnvVar                 = getEnvVar;
exports.debug                     = debug;
exports.debugExn                  = debugExn;
exports.invalidTextRepresentation = invalidTextRepresentation;
exports.uniqueViolation           = uniqueViolation;
exports.objToJson                 = objToJson;
exports.handleUniqueError         = handleUniqueError;
exports.handleDbErrors            = handleDbErrors;
exports.decodeResults             = decodeResults;
exports.rejectIfEmpty             = rejectIfEmpty;
exports.pickFirst                 = pickFirst;
/* debug Not a pure module */
