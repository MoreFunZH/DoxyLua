---------------------------------------------------------------------
function echoLog(tag, fmt, ...)
    print(string.format("[%s] %s", string.upper(tostring(tag)), string.format(tostring(fmt), ...)))
end

---------------------------------------------------------------------
function echoInfo(fmt, ...)
    echoLog("INFO", fmt, ...)
end

---------------------------------------------------------------------
-- 打印Table对象
-- @param table Lua对象
-- @param indent 深度
function printTable(table, indent)
	if type(table) ~= "table" then
		if type(table) == "function" or type(table) == "boolean" then
			print(type(table))
		else
			print(type(table).."="..tostring(table))
		end
		return
	end
	--
	indent = indent or 0
	for k, v in pairs(table) do
		if type(k) == "string" then
			k = string.format("%q", k)
		end
		local szSuffix = ""
		if type(v) == "table" then
			szSuffix = "{"
		end
		local szPrefix = string.rep("    ", indent)
		formatting = szPrefix.."["..k.."]".." = "
		if type(v) == "table" then
			print(formatting)
			print(szSuffix)
			printTable(v, indent + 1)
			print(szPrefix.."},")
		else
			local szValue = ""
			if type(v) == "string" then
				szValue = string.format("%q", v)
			else
				szValue = tostring(v)
			end
			print(formatting..szValue..",")
		end
	end
end