#!/usr/bin/env node

var opts = require('nomnom')
    .option('show-ast', {
        abbr: 's',
        flag: true,
        help: 'Print out the AST of the specified lua file.',
    })
    .option('locations', {
        abbr: 'l',
        flag: true,
        help: 'Specify whether the location infos are included in the output. \n \
                    Default to false. \n \
                    Only has effect when --show-ast was set. '
    })
    .option('FILE', {
        position: 0,
        help: 'The path to a lua file.',
        required: true
    })
    .parse();

var doxylua = require('../lib/doxylua.js');
if (opts['show-ast'] != true) 
    console.log(doxylua(opts.FILE, false));
else
    doxylua(opts.FILE, true, opts.locations);