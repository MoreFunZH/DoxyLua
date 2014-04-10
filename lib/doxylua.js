/**
 * @file doxylua.js
 * @author dreamlover
 * @brief Implement a module that translate a lua file to the format that can be recognized by doxygen
 * with the wonderful package luaparse.
 */
 module.exports = function (file, showAST, showLocations) {
    var fs = require('fs'),
        luaparse = require('luaparse'),
        events = new (require('events').EventEmitter);

    var lastNode = { 'type' : 'DummyNode' };
    
    Object.keys(luaparse.ast).forEach(function (type) {
        var original = luaparse.ast[type];
        luaparse.ast[type] = function () {
            // The loc info of the current node has not been ready, but the last node's has.
            events.emit(lastNode.type, lastNode);
            lastNode = original.apply(null, arguments);
            return lastNode;
        }
    })

    var comments = [], nodes = [], lastComment = null;

    events.on('Comment', function _dealComment(node) {
        if (lastComment == null) {
            lastComment = { 
                'lines' : [ node.raw ], 
                'start' : node.loc.start.line, 
                'end' : node.loc.end.line 
            }
        } 
        else if ((node.loc.start.line - lastComment.end) == 1) {
            lastComment.lines.push(node.raw);
            lastComment.end++;
        }
        else {
            comments.push(lastComment);
            lastComment = null;
            _dealComment(node);
        }
    });
    events.on('FunctionDeclaration', function (node) {
        if (node.isLocal != true)
            nodes.push(node);
    });
    events.on('AssignmentStatement', function (node) {
        nodes.push(node);
    });

    // Different line endings will afftects the line number.
    var sz = fs.readFileSync(file).toString().replace(/(\r\n|\r|\n)/g, '\n');

    // Make sure it's utf8 encoding strings passed to luaparse.
    // var jschardet = require('jschardet');
    // var encodingResult = jschardet.detect(sz);
    // if (encodingResult.encoding != 'ascii') {
    //     var encoding = require('encoding');
    //     sz = encoding.convert(sz, 'utf-8', encodingResult.encoding).toString();
    // }

    
    if (showAST != true) {
        luaparse.parse(sz, { 'comments' : true, 'scope' : true, 'locations' : true, 'ranges' : false });
    }
    else {
        var option = { 'comments' : true, 'scope' : true, 'ranges' : false };
        if (showLocations == true) option.locations = true;
        
        var ast = luaparse.parse(sz, option);
        
        require('colors');
        console.log('{'.green);
        _printAST(ast, '  ');
        console.log('}'.green)
        return '';
    }

    nodes.unshift({ 'type' : 'FileHeader', 'file' : file, 'loc' : { 'start' : { 'line' : 2 } } });
    if (lastComment != null) comments.push(lastComment);

    var results = nodes.map(function (node) {
        var comment = _getCommentByLine(node.loc.start.line - 1, comments);
        if (comment != null) node.comment = comment.lines.map(_translateOneCommentLine);

        switch (node.type)
        {
        case 'FileHeader': 
            if (node.comment != null) {
                // Check to see if this comment is belong to anyother node.
                // If it is, then it's not the file header comment.
                var isFH = true;
                if (nodes.length > 1) {
                    for (var i = 1; i < nodes.length; ++i) {
                        if (nodes[i].comment == node.comment) isFH = false;
                    }
                }
                if (isFH) return _translateFileHeader(node);
                else return '';
            }
            return '';
        case 'FunctionDeclaration':
            return _translateFunction(node);
        case 'AssignmentStatement':
            if (node.comment == null) {
                var comment = _getCommentByLine(node.loc.start.line, comments);
                if (comment != null) node.comment = comment.lines.map(_translateOneCommentLine);
            }
            return _translateGlobalVariable(node);
        default:
            return '';
        }
    })
    _removeEmptyItems(results);
    return results.join('\n\n');
}

function _removeEmptyItems(items) {
    if (items.length < 1) return ;
    for (var i = items.length - 1; i >= 0; --i) {
        if (items[i] == null || items[i] == '') items.splice(i, 1);
    }
}

function _translateFileHeader(node) {
    if (node.comment != null) {
        if (node.comment.length > 0) {
            node.comment.splice(node.comment.length - 1, 0, '/// @file ' + node.file);
            return node.comment.join('\n');
        }
    }
    return '';
}

function _translateFunction(node) {
    // Anonymous function shouldn't be documented.
    if (node.identifier == null)
        return '';

    var sig = [];
    if (node.isLocal) sig.push('local ');
    sig.push('function ');

    if (node.identifier.type == 'MemberExpression') {
        sig.push(node.identifier.base.name);
        sig.push(' ');
        sig.push(node.identifier.identifier.name);
    }
    else if (node.identifier.type == 'Identifier') {
        sig.push(node.identifier.name);
    }
    else {
        assert(false, 'Unknown Circumstance encountered!');
    }
    
    sig.push('(');

    if (node.parameters.length > 0) {    
        for (var i = 0; i < node.parameters.length; ++i) {
            if (node.parameters[i].name != null) {
                sig.push(node.parameters[i].name);
            }
            else if (node.parameters[i].value == '...') {
                sig.push('...');
            }
            sig.push(', ');
        }
        sig[sig.length - 1] = ');';
    }
    else {
        sig.push(');');
    }
        
    return _returnFullString(node, sig.join(''));
}

function _translateGlobalVariable(node) {
    var vs = [];
    for (var i = 0; i < node.variables.length; ++i) {
        var va = node.variables[i], value = node.init[i], sig = [];
        if (va.type == 'Identifier') {
            sig.push(va.name + ' ');
        }
        else if (va.type == 'MemberExpression') {
            sig.push(va.base.name + ' ');
            sig.push(va.identifier.name + ' ');
        }
        sig.push('= ');
        sig.push(value.raw);
        sig.push(';');
        vs.push(sig.join(''));
    }
    return _returnFullString(node, vs.join('\n'));
}

function _translateOneCommentLine(comment) {
    return comment.replace(/^-+/g, '///');
}

function _getCommentByLine(line, comments, start, end) {
    if (comments == null || comments.length < 1) return null;

    if (start == undefined) start = 0;
    if (end == undefined) end = comments.length;
    var middle = Math.floor((start + end) / 2);

    if (start == end) return null;

    if (line < comments[middle].start) {
        if (start == middle) return null;
        return _getCommentByLine(line, comments, start, middle);
    }
    else if (line > comments[middle].end) {
        return _getCommentByLine(line, comments, middle + 1, end);
    }
    else {
        return comments[middle];
    }
}

function _returnFullString(node, sz) {
    if (node.comment != null && node.comment.length > 0)
        return node.comment.join('\n') + '\n' + sz;
    else
        return sz;
}

function _printAST(ast, indent) {
    if (indent == undefined) indent = '';
    for (var prop in ast) {
        if (typeof ast[prop] == 'object') {
            console.log((indent + prop + ': {').green);
            _printAST(ast[prop], indent + '  ');
            console.log((indent + '}').green);
        }
        else {
            console.log((indent + prop + ': ' + ast[prop]).green);
        }
    }
}