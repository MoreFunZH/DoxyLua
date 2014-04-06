DoxyLua
=======

Another Doxygen Filter for Lua files provided as a npm package for node.js.

###Usage
1. Install the doxygen package globally: ```npm install -g doxylua```(WILL BE AVAILABLE SOON!)  
2. Config your doxygen's config file: ```FILTER_PATTERNS = *.lua=doxylua```

###Tests
1. Install the doxygen package nodeunit: ```npm install -g nodeunit```
2. In this root folder, run commandline: ```nodeunit --reporter tap test```