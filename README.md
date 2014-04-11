DoxyLua
=======

Another Doxygen Filter for Lua files provided as a npm package for node.js.

###Usage - Generate documentation for lua files.
1. Install the doxygen package globally: ```npm install -g doxylua```  
2. Config your doxygen's config file: ```FILTER_PATTERNS = *.lua=doxylua```
3. Run doxygen in your source folder: ```doxygen DoxyFile```

###Usage - View AST of lua file.
1. Install the doxygen package globally: ```npm install -g doxylua```
2.  ```doxylua foo.lua --show-ast [--locations]```

###Tests
1. Install the doxygen package nodeunit: ```npm install -g nodeunit```
2. In this root folder, run commandline: ```nodeunit --reporter tap test```