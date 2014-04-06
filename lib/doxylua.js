/**
 * @file doxylua.js
 * @author dreamlover
 * @brief Implement a module that translate a lua file to the format that can be recognized by doxygen
 * with the wonderful package luaparse.
 */
 module.exports = function (file) {
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

    events.on('FunctionDeclaration', function (node) {
        nodes.push(node)
    })
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
            _dealComment(node)
        }
    })

    // Different line endings will afftects the line number.
    var sz = fs.readFileSync(file).toString().replace(/(\r\n|\r|\n)/g, '\n');

    // Make sure it's utf8 encoding strings passed to luaparse.
    // var jschardet = require('jschardet');
    // var encodingResult = jschardet.detect(sz);
    // if (encodingResult.encoding != 'ascii') {
    //     var encoding = require('encoding');
    //     sz = encoding.convert(sz, 'utf-8', encodingResult.encoding).toString();
    // }

    luaparse.parse(sz, { 'comments' : true, 'scope' : true, 'locations' : true, 'ranges' : false });
    nodes.unshift({ 'type' : 'FileHeader', 'file' : file, 'loc' : { 'start' : { 'line' : 2 } } });
    comments.push(lastComment);

    var results = nodes.map(function (node) {
        var comment = _getCommentByLine(node.loc.start.line - 1, comments);
        if (comment != null) node.comment = comment.lines.map(_translateOneCommentLine);

        switch (node.type)
        {
        case 'FileHeader': 
            return _translateFileHeader(node);
        case 'FunctionDeclaration':
            return _translateFunction(node);
        default:
            return '';
        }
    })
    return results.join('\n\n');
}

function _translateFileHeader(node) {
    if (node.comment.length > 0)
        node.comment.splice(node.comment.length - 1, 0, '/// @file ' + node.file);
    return node.comment.join('\n');
}

function _translateFunction(node) {
    var sig = [];
    if (node.isLocal) sig.push('local ');
    sig.push('function ');
    sig.push(node.identifier.name);
    sig.push('(');
    for (var i = 0; i < node.parameters.length; ++i) {
        sig.push(node.parameters[i].name);
        sig.push(', ');
    }
    sig[sig.length - 1] = ');';
    
    var result = '';
    if (node.comment != null) result = node.comment.join('\n');
    return result + '\n' + sig.join('');
}

function _translateOneCommentLine(comment) {
    return comment.replace(/^-+/g, '///');
}

function _getCommentByLine(line, comments, start, end) {
    if (line == 0) {
        if (comments.length < 1) return null;
        return comments[0].start == 0 ? comments[0] : null;
    }

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