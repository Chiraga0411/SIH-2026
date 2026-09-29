import unittest
from solution import is_prime

class TestIsPrime(unittest.TestCase):
    def test_known_primes(self):
        for p in [2, 3, 5, 7, 11, 13, 97]:
            self.assertTrue(is_prime(p))

    def test_known_non_primes(self):
        for n in [1, 4, 6, 8, 9, 15, 100]:
            self.assertFalse(is_prime(n))

    def test_negative_numbers(self):
        self.assertFalse(is_prime(-5))
        self.assertFalse(is_prime(-1))

    def test_zero_and_one(self):
        self.assertFalse(is_prime(0))
        self.assertFalse(is_prime(1))

if __name__ == "__main__":
    unittest.main()