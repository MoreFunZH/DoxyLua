---------------------------------------------------------------------------------
-- @author dreamlover
-- @brief This is a sample lua file with comments.
---------------------------------------------------------------------------------

---------------------------------------------------------------------------------
-- This SomeEnum structure.
SomeEnum = {
	Enum1 = 1, --- This is Enum1.
	Enum2 = 2, --- This is Enum2.
	Enum3 = 3, --- This is Enum3.
}


--- This is global variable gVar1.
gVar1 = 1

gVar2 = 2 --- This is global variable gVar2.

---------------------------------------------------------------------------------
-- This is funcT.
-- @param arg1 This is arg1.
-- @param arg2 This is arg2.
-- @return Return something.
function funcT(arg1, arg2)
end

---------------------------------------------------------------------------------
-- This is a class.
CClass = newClass()

---------------------------------------------------------------------------------
-- This is CClass's member property prop1.
CClass.prop1 = nil

CClass.prop2 = nil --- This is CClass's member property prop2.

---------------------------------------------------------------------------------
-- This is CClass's member function func1.
-- @param arg1 This is arg1.
-- @param arg2 This is arg2.
-- @return Return something.
function CClass:func1(arg1, arg2)
	print(tostring(arg1))
	print(tostring(arg2))
end

---------------------------------------------------------------------------------
-- This is CClass's member function func2.
-- @param arg1 This is arg1.
-- @param arg2 This is arg2.
-- @return Return something.
function CClass:func2(arg1, arg2)
	return tonumber(arg1) + tonumber(arg2)
end