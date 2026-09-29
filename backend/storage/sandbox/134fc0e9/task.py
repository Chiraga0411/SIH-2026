import unittest

def fibonacci(n: int) -> int:
    """
    Calculate the nth Fibonacci number using an iterative approach.
    
    Args:
    n (int): The position in the Fibonacci sequence.
    
    Returns:
    int: The nth Fibonacci number.
    
    Raises:
    ValueError: If n is negative.
    """
    if n < 0:
        raise ValueError("n must be a non-negative integer.")
    elif n == 0:
        return 0
    elif n == 1:
        return 1
    
    a, b = 0, 1
    for _ in range(2, n + 1):
        a, b = b, a + b
    return b

# Test the function
try:
    print(fibonacci(10))  # Expected output: 55
except ValueError as e:
    print(e)

class TestFibonacci(unittest.TestCase):
    def test_fibonacci_normal_cases(self):
        self.assertEqual(fibonacci(0), 0)
        self.assertEqual(fibonacci(1), 1)
        self.assertEqual(fibonacci(2), 1)
        self.assertEqual(fibonacci(3), 2)
        self.assertEqual(fibonacci(4), 3)
        self.assertEqual(fibonacci(5), 5)
        self.assertEqual(fibonacci(6), 8)
        self.assertEqual(fibonacci(7), 13)
        self.assertEqual(fibonacci(8), 21)
        self.assertEqual(fibonacci(9), 34)
        self.assertEqual(fibonacci(10), 55)

    def test_fibonacci_edge_cases(self):
        self.assertEqual(fibonacci(11), 89)
        self.assertEqual(fibonacci(12), 144)
        self.assertEqual(fibonacci(13), 233)
        self.assertEqual(fibonacci(14), 377)
        self.assertEqual(fibonacci(15), 610)
        self.assertEqual(fibonacci(16), 987)
        self.assertEqual(fibonacci(17), 1597)
        self.assertEqual(fibonacci(18), 2584)
        self.assertEqual(fibonacci(19), 4181)
        self.assertEqual(fibonacci(20), 6765)

    def test_fibonacci_negative_input(self):
        with self.assertRaises(ValueError):
            fibonacci(-1)

    def test_fibonacci_large_input(self):
        self.assertEqual(fibonacci(100), 354224848179261915075)

if __name__ == '__main__':
    unittest.main()


from solution import fibonacci, TestFibonacci

class TestFibonacci(unittest.TestCase):
    def test_fibonacci_normal_cases(self):
        self.assertEqual(fibonacci(0), 0)
        self.assertEqual(fibonacci(1), 1)
        self.assertEqual(fibonacci(2), 1)
        self.assertEqual(fibonacci(3), 2)
        self.assertEqual(fibonacci(4), 3)
        self.assertEqual(fibonacci(5), 5)
        self.assertEqual(fibonacci(6), 8)
        self.assertEqual(fibonacci(7), 13)
        self.assertEqual(fibonacci(8), 21)
        self.assertEqual(fibonacci(9), 34)
        self.assertEqual(fibonacci(10), 55)

    def test_fibonacci_edge_cases(self):
        self.assertEqual(fibonacci(11), 89)
        self.assertEqual(fibonacci(12), 144)
        self.assertEqual(fibonacci(13), 233)
        self.assertEqual(fibonacci(14), 377)
        self.assertEqual(fibonacci(15), 610)

    def test_fibonacci_negative_input(self):
        with self.assertRaises(ValueError):
            fibonacci(-1)

    def test_fibonacci_large_input(self):
        self.assertEqual(fibonacci(100), 354224848179261915075)

if __name__ == '__main__':
    unittest.main()