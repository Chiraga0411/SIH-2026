import unittest

def sum_of_two_and_five() -> int:
    """
    Calculate the sum of 2 and 5.
    """
    return 2 + 5

if __name__ == "__main__":
    result = sum_of_two_and_five()
    print(result)


from solution import sum_of_two_and_five

import unittest

class TestSolution(unittest.TestCase):
    def test_sum_of_two_and_five(self):
        # Normal case
        self.assertEqual(sum_of_two_and_five(), 7)

    def test_sum_of_two_and_five_with_zero(self):
        # Edge case: zero input
        self.assertEqual(sum_of_two_and_five(0, 5), 5)

    def test_sum_of_two_and_five_with_negative_numbers(self):
        # Edge case: negative numbers
        self.assertEqual(sum_of_two_and_five(-2, 5), 3)

    def test_sum_of_two_and_five_with_large_numbers(self):
        # Edge case: large numbers
        self.assertEqual(sum_of_two_and_five(1000000, 5), 1000005)

    def test_sum_of_two_and_five_with_floats(self):
        # Edge case: floats
        self.assertAlmostEqual(sum_of_two_and_five(2.5, 5.5), 8.0)

    def test_sum_of_two_and_five_with_mixed_types(self):
        # Error case: mixed types
        with self.assertRaises(TypeError):
            sum_of_two_and_five(2, '5')

    def test_sum_of_two_and_five_with_invalid_input(self):
        # Error case: invalid input
        with self.assertRaises(ValueError):
            sum_of_two_and_five('a', 5)

if __name__ == '__main__':
    unittest.main()