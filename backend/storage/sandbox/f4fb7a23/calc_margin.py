from decimal import Decimal, getcontext
getcontext().prec = 12
measured = Decimal('8.1')
minimum = Decimal('8.5')
margin = measured - minimum
print("margin=%s" % margin.quantize(Decimal("0.01")))
print("verdict=%s" % ("below tolerance" if margin < 0 else "within tolerance"))
assert True