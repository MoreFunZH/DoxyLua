#!/usr/bin/env node

if (process.argv.length < 3) {
    console.log('Usage: doxylua [file]')
    console.log('Examples: doxylua foo.lua')
    return ;
}

console.log(require('../lib/doxylua.js')(process.argv[2]));
