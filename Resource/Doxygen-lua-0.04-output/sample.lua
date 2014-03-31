--!
--! @author dreamlover
--! @brief This is a sample lua file with comments.
--!

module('sample', package.seeall)

local sample1 = require('folder.sample1')


--! This is _gVar1.
local _gVar1 = 1

local _gVar2 = 2 --! This is _gVar2.

--!
--! This is _funcT.
--! @param arg1 This is arg1.
--! @param arg2 This is arg2.
--! @return Return something.
local function _funcT(arg1, arg2)
end

--!
--! This is funcT.
--! @param arg1 This is arg1.
--! @param arg2 This is arg2.
--! @return Return something.
function funcT(arg1, arg2)
end
