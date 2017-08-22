"use strict";

var inspect = require('util').inspect


function isType(type) {
  return function(obj) {
    return {}.toString.call(obj) == '[object ' + type + ']'
  }
}

var isObject = isType("Object")
var isFunction = isType("Function")
var isArray = Array.isArray || isType("Array")
var isString = isType("String")
var isDate = isType("Date")

function tostr(data /* private params*/, indent) {
  indent = indent || 2
  var oldBr = '\n' + new Array(indent - 1).join(' ')
  var br = oldBr + '  '

  if (isObject(data)) {
    var keys = Object.keys(data)
    var len = keys.length

    var rt = '{'
    keys.forEach(function(key, idx) {
      var item = data[key]
      rt += br + key + ': ' + tostr(item, indent + 2)
      if (idx < len - 1) rt += ','
    })
    rt += oldBr + '}'
    return rt
  }

  if (isArray(data)) {
    var len = data.length
    var rt = '['
    data.forEach(function(item, idx) {
      rt += br + tostr(item, indent + 2)
      if (idx < len - 1) rt += ','
    })
    rt += oldBr + ']'
    return rt
  }

  if (isFunction(data)) {
    return data.toString()
  }

  if (isDate(data)) {
    return "new Date('" + data.toString() + "')"
  }

  if (isString(data)) {
    return inspect(data).replace(/^\[String: (.*)\]$/, '$1')
  }

  return data
}


module.exports = tostr
