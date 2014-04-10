
---------------------------------------------------------------------------------
-- Variable count arguments
function foo(...)
    local arg = { ... }
    local cnt = #arg
    for k, v in pairs(arg) do
        print(k)
    end
end