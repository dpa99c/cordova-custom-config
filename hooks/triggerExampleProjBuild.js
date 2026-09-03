#!/usr/bin/env node
"use strict";

var shell = require('shelljs');
var path = require('path');

var targetRepo = 'dpa99c/cordova-custom-config-example';

console.log("Fetching Git commit hash...");

var gitCommitRet = shell.exec('git rev-parse HEAD', {
  cwd: path.join(__dirname, '..')
});

if (0 !== gitCommitRet.code) {
  console.error('Error getting git commit hash');

  process.exit(-1);
}

var gitCommitHash = gitCommitRet.stdout.trim();

console.log("Git commit: "+gitCommitHash);

console.log('Calling Travis...');

fetch("https://api.travis-ci.org/repo/"+encodeURIComponent(targetRepo)+"/requests", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Travis-API-Version": "3",
    "Authorization": "token "+process.env.TRAVIS_API_TOKEN
  },
  body: JSON.stringify({
    request: {
      message: "Trigger build at "+targetRepo+" commit: "+gitCommitHash,
      branch: 'master'
    }
  })
})
.then(function(response){
    if (!response.ok) {
      throw new Error("Travis request failed with status " + response.status);
    }
})
.then(function(){
  console.log("Triggered build of "+targetRepo);
})
.catch(function(err){
  console.error(err);
  process.exit(-1);
});

