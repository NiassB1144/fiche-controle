import py_compile
import sys

try:
    py_compile.compile('inspection/views.py', doraise=True)
    print("✓ views.py syntax OK")
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)

try:
    py_compile.compile('inspection/urls.py', doraise=True)
    print("✓ urls.py syntax OK")
except Exception as e:
    print(f"✗ Error: {e}")
    sys.exit(1)

print("✓ All validations passed!")
