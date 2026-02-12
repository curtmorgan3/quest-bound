// Fibonacci sequence calculator

fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

// Calculate first 10 fibonacci numbers
announce("Fibonacci sequence:")

for i in 10:
    result = fibonacci(i)
    announce("F({{i}}) = {{result}}")

return fibonacci(9)
